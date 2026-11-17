import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useOffers } from '../use-offers';

import { listOffers, type OfferRow } from '@/services/offers';

// The service is the system boundary: answers are made up here.
jest.mock('@/services/offers');

const rows = [{ offer: { id: 'offer-1' } }] as OfferRow[];

/** An answer held back by hand, so the state while waiting can be seen. */
function held() {
  let deliver: (value: OfferRow[]) => void = () => {};
  const promise = new Promise<OfferRow[]>((resolve) => (deliver = resolve));
  return { promise, deliver };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(listOffers).mockResolvedValue(rows);
});

describe('useOffers', () => {
  it('starts loading and then has the offers', async () => {
    const answer = held();
    jest.mocked(listOffers).mockReturnValueOnce(answer.promise);
    const { result } = await renderHook(() => useOffers());

    expect(result.current.status).toBe('loading');
    await act(async () => answer.deliver(rows));

    expect(result.current).toMatchObject({ status: 'ready', offers: rows });
  });

  it('says so when loading fails, and loads again on reload', async () => {
    jest.mocked(listOffers).mockRejectedValueOnce(new Error('network'));
    const { result } = await renderHook(() => useOffers());
    await waitFor(() => expect(result.current.status).toBe('error'));

    const answer = held();
    jest.mocked(listOffers).mockReturnValueOnce(answer.promise);
    await act(async () => result.current.reload());
    expect(result.current.status).toBe('loading');
    await act(async () => answer.deliver(rows));

    expect(result.current.status).toBe('ready');
  });

  it('keeps what is on screen while it refreshes', async () => {
    const { result } = await renderHook(() => useOffers());
    await waitFor(() => expect(result.current.status).toBe('ready'));

    const answer = held();
    jest.mocked(listOffers).mockReturnValueOnce(answer.promise);
    await act(async () => result.current.refresh());
    expect(result.current).toMatchObject({ status: 'ready', offers: rows, refreshing: true });
    await act(async () => answer.deliver(rows));

    expect(result.current).toMatchObject({ refreshing: false });
  });

  it('keeps the offers and says they may be out of date when a refresh fails', async () => {
    const { result } = await renderHook(() => useOffers());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    jest.mocked(listOffers).mockRejectedValueOnce(new Error('network'));

    await act(async () => result.current.refresh());

    await waitFor(() => expect(result.current).toMatchObject({ status: 'ready', refreshFailed: true }));
  });
});
