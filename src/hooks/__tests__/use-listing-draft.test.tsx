import { act, renderHook } from '@testing-library/react-native';

import { withKind, withName, withoutCatalogue } from '@/features/new-listing/draft';
import { ListingDraftProvider, useListingDraft } from '@/hooks/use-listing-draft';
import { publishItem, retryListing, type ListingOutcome, type PublishResult } from '@/services/publishing';

// The publishing service is the boundary: its answers are held back to order them by hand.
jest.mock('@/services/publishing');

type Deferred<Value> = { promise: Promise<Value>; resolve: (value: Value) => void; reject: (error: Error) => void };

function deferred<Value>(): Deferred<Value> {
  let resolve!: (value: Value) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<Value>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const bothRefused: PublishResult = {
  itemId: 'item-1',
  listings: [
    { marketplace: 'discogs', status: 'error', reason: 'unknown' },
    { marketplace: 'ebay', status: 'error', reason: 'missingShippingPolicy' },
  ],
};

async function renderFlow() {
  const rendered = await renderHook(() => useListingDraft(), { wrapper: ListingDraftProvider });
  await act(async () =>
    rendered.result.current.change((draft) =>
      withKind(withoutCatalogue(withName(draft, 'Gira-discos Aurora')), 'equipment'),
    ),
  );
  return rendered.result;
}

async function publishBoth(flow: Awaited<ReturnType<typeof renderFlow>>, result = bothRefused) {
  jest.mocked(publishItem).mockResolvedValueOnce(result);
  await act(async () => flow.current.publish(['discogs', 'ebay']));
}

function outcomes(flow: Awaited<ReturnType<typeof renderFlow>>) {
  const { publication } = flow.current;
  return publication.status === 'done'
    ? publication.result.listings.map(({ marketplace, status }) => `${marketplace}:${status}`)
    : publication.status;
}

beforeEach(() => jest.clearAllMocks());

describe('publishing a listing', () => {
  it('sends it once, however many times publish is asked while it is on its way', async () => {
    const answer = deferred<PublishResult>();
    jest.mocked(publishItem).mockReturnValue(answer.promise);
    const flow = await renderFlow();

    await act(async () => {
      flow.current.publish(['ebay']);
      flow.current.publish(['ebay']);
    });
    await act(async () => flow.current.publish(['ebay']));

    expect(publishItem).toHaveBeenCalledTimes(1);
  });

  it('can be sent again after the request failed', async () => {
    jest.mocked(publishItem).mockRejectedValueOnce(new Error('network'));
    const flow = await renderFlow();
    await act(async () => flow.current.publish(['ebay']));
    expect(flow.current.publication).toEqual({ status: 'failed', marketplaces: ['ebay'] });

    await publishBoth(flow);

    expect(publishItem).toHaveBeenCalledTimes(2);
    expect(flow.current.publication.status).toBe('done');
  });
});

describe('trying a marketplace again', () => {
  it('asks once per marketplace while the answer is on its way', async () => {
    const answer = deferred<ListingOutcome>();
    jest.mocked(retryListing).mockReturnValue(answer.promise);
    const flow = await renderFlow();
    await publishBoth(flow);

    await act(async () => {
      flow.current.retry('ebay');
      flow.current.retry('ebay');
    });
    await act(async () => flow.current.retry('ebay'));

    expect(retryListing).toHaveBeenCalledTimes(1);
  });

  it('keeps both marketplaces marked while two are tried at the same moment', async () => {
    jest.mocked(retryListing).mockReturnValue(deferred<ListingOutcome>().promise);
    const flow = await renderFlow();
    await publishBoth(flow);

    await act(async () => {
      flow.current.retry('discogs');
      flow.current.retry('ebay');
    });

    expect(flow.current.publication).toMatchObject({ retrying: ['discogs', 'ebay'] });
  });

  it('keeps an answer that arrives while another marketplace is being tried', async () => {
    const discogsAnswer = deferred<ListingOutcome>();
    const ebayAnswer = deferred<ListingOutcome>();
    jest
      .mocked(retryListing)
      .mockImplementation((_item, marketplace) =>
        marketplace === 'discogs' ? discogsAnswer.promise : ebayAnswer.promise,
      );
    const flow = await renderFlow();
    await publishBoth(flow);

    await act(async () => flow.current.retry('discogs'));
    await act(async () => {
      discogsAnswer.resolve({ marketplace: 'discogs', status: 'published' });
      await discogsAnswer.promise;
      flow.current.retry('ebay');
    });
    await act(async () => ebayAnswer.resolve({ marketplace: 'ebay', status: 'published' }));

    expect(outcomes(flow)).toEqual(['discogs:published', 'ebay:published']);
    expect(flow.current.publication).toMatchObject({ retrying: [] });
  });

  it('says the request did not get through when it fails, not that the marketplace refused', async () => {
    jest.mocked(retryListing).mockRejectedValue(new Error('network'));
    const flow = await renderFlow();
    await publishBoth(flow);

    await act(async () => flow.current.retry('ebay'));

    expect(flow.current.publication).toMatchObject({
      retrying: [],
      result: { listings: [expect.anything(), { marketplace: 'ebay', status: 'error', reason: 'unreachable' }] },
    });
  });

  it('does not write a late answer into the next listing', async () => {
    const lateAnswer = deferred<ListingOutcome>();
    jest.mocked(retryListing).mockReturnValue(lateAnswer.promise);
    const flow = await renderFlow();
    await publishBoth(flow);
    await act(async () => flow.current.retry('ebay'));

    await act(async () => flow.current.startOver());
    await act(async () =>
      flow.current.change((draft) => withKind(withoutCatalogue(withName(draft, 'Colunas Marfim')), 'equipment')),
    );
    await publishBoth(flow, { ...bothRefused, itemId: 'item-2' });
    await act(async () => lateAnswer.resolve({ marketplace: 'ebay', status: 'published' }));

    expect(outcomes(flow)).toEqual(['discogs:error', 'ebay:error']);
  });
});
