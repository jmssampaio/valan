import type { OfferError as OfferErrorType } from '../offers';

// The service keeps its answers in memory, so each test starts from a fresh copy of it, and
// the clock is fixed: the sample offers are dated relative to now.
const NOW = new Date('2026-11-17T12:00:00Z');
const HOUR_MS = 3_600_000;

let service: typeof import('../offers');
let detail: typeof import('../listing-detail');
let listings: typeof import('../listings');

beforeEach(() => {
  jest.resetModules();
  jest.useFakeTimers({ now: NOW });
  service = jest.requireActual('../offers');
  detail = jest.requireActual('../listing-detail');
  listings = jest.requireActual('../listings');
});

afterEach(() => jest.useRealTimers());

/** The error a response was refused with, so a test can say which kind it was. */
async function refusedWith(promise: Promise<unknown>): Promise<OfferErrorType['kind'] | 'no error'> {
  try {
    await promise;
    return 'no error';
  } catch (error) {
    if (error instanceof service.OfferError) return error.kind;
    throw error;
  }
}

describe('listOffers', () => {
  it('gives each offer with the item it is about, what is asked and where it was made', async () => {
    const rows = await service.listOffers();

    const first = rows.find(({ offer }) => offer.id === 'sample-offer-1');
    expect(first).toMatchObject({
      offer: { buyer: 'vinil_porto', amount_minor: 2400, status: 'pending' },
      item: { id: 'sample-item-1', title: 'Noites de Lisboa', price_minor: 2800, currency: 'EUR' },
      marketplace: 'ebay',
    });
    expect(first?.listingUrl).toEqual(expect.stringMatching(/^https:\/\//));
  });

  it('includes the offers that were already answered', async () => {
    const statuses = (await service.listOffers()).map(({ offer }) => offer.status);

    expect(new Set(statuses)).toEqual(
      new Set(['pending', 'accepted', 'rejected', 'expired', 'withdrawn']),
    );
  });

  it('lists the newest offer first', async () => {
    const dates = (await service.listOffers()).map(({ offer }) => offer.created_at);

    expect(dates).toEqual([...dates].sort().reverse());
  });
});

describe('countPendingOffers', () => {
  it('counts the offers that wait for an answer', async () => {
    expect(await service.countPendingOffers()).toBe(3);
  });

  it('does not count an offer that has expired meanwhile', async () => {
    jest.setSystemTime(new Date(NOW.getTime() + 22 * HOUR_MS));

    expect(await service.countPendingOffers()).toBe(2);
  });

  it('drops by one when an offer is answered', async () => {
    await service.respondOffer({ offerId: 'sample-offer-1', response: 'reject', amountMinor: 2400 });

    expect(await service.countPendingOffers()).toBe(2);
  });
});

describe('respondOffer, accepting', () => {
  it('marks the offer accepted and the item sold, off every marketplace', async () => {
    const answered = await service.respondOffer({
      offerId: 'sample-offer-1',
      response: 'accept',
      amountMinor: 2400,
    });

    expect(answered.status).toBe('accepted');
    const sold = (await listings.listItems()).find(
      ({ id }) => id === 'sample-item-1',
    );
    expect(sold?.status).toBe('sold');
    expect(sold?.listings.map(({ status }) => status)).toEqual(['removed', 'removed']);
  });

  it('is safe to ask twice: the second answer finds the first one done', async () => {
    const first = await service.respondOffer({ offerId: 'sample-offer-1', response: 'accept', amountMinor: 2400 });
    const second = await service.respondOffer({ offerId: 'sample-offer-1', response: 'accept', amountMinor: 2400 });

    expect(second).toEqual(first);
  });

  it('refuses the opposite answer to an offer that was already answered', async () => {
    await service.respondOffer({ offerId: 'sample-offer-1', response: 'accept', amountMinor: 2400 });

    expect(
      await refusedWith(
        service.respondOffer({ offerId: 'sample-offer-1', response: 'reject', amountMinor: 2400 }),
      ),
    ).toBe('already_answered');
  });

  it('does not list an offer that ran out of time under the pending offers of the item', async () => {
    jest.setSystemTime(new Date(NOW.getTime() + 22 * HOUR_MS));

    expect((await detail.getListingDetail('sample-item-1'))?.offers).toEqual([]);
  });

  it('takes the offer off the detail screen of the item', async () => {
    await service.respondOffer({ offerId: 'sample-offer-1', response: 'reject', amountMinor: 2400 });

    expect((await detail.getListingDetail('sample-item-1'))?.offers).toEqual([]);
  });
});

describe('respondOffer, rejecting', () => {
  it('marks the offer rejected and leaves the item listed', async () => {
    const answered = await service.respondOffer({
      offerId: 'sample-offer-2',
      response: 'reject',
      amountMinor: 15000,
    });

    expect(answered.status).toBe('rejected');
    const item = (await listings.listItems()).find(({ id }) => id === 'sample-item-3');
    expect(item?.status).toBe('active');
    expect(item?.listings.map(({ status }) => status)).toEqual(['published']);
  });
});

describe('respondOffer, when it must refuse', () => {
  it('refuses an offer that has run out of time', async () => {
    jest.setSystemTime(new Date(NOW.getTime() + 22 * HOUR_MS));

    expect(
      await refusedWith(
        service.respondOffer({ offerId: 'sample-offer-1', response: 'accept', amountMinor: 2400 }),
      ),
    ).toBe('expired');
  });

  it('refuses an offer the marketplace already marked expired', async () => {
    expect(
      await refusedWith(
        service.respondOffer({ offerId: 'sample-offer-6', response: 'accept', amountMinor: 20000 }),
      ),
    ).toBe('expired');
  });

  it('refuses an offer on a marketplace that cannot be answered from outside', async () => {
    expect(
      await refusedWith(
        service.respondOffer({ offerId: 'sample-offer-3', response: 'accept', amountMinor: 3800 }),
      ),
    ).toBe('unsupported');
  });

  it('refuses when the buyer changed the amount since the seller saw it', async () => {
    expect(
      await refusedWith(
        service.respondOffer({ offerId: 'sample-offer-1', response: 'accept', amountMinor: 2500 }),
      ),
    ).toBe('changed');
    expect((await service.listOffers()).find(({ offer }) => offer.id === 'sample-offer-1')?.offer.status).toBe(
      'pending',
    );
  });

  it('refuses an offer that does not exist', async () => {
    expect(
      await refusedWith(service.respondOffer({ offerId: 'nothing', response: 'accept', amountMinor: 1 })),
    ).toBe('not_found');
  });
});
