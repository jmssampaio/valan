import { countPendingOffers, listOffers, OfferError, respondOffer } from '../offers';

describe('offers, until the offers Edge Function exists', () => {
  it('counts no pending offers, because no seller has one', async () => {
    expect(await countPendingOffers()).toBe(0);
  });

  it('lists no offers', async () => {
    expect(await listOffers()).toEqual([]);
  });

  it('cannot answer an offer yet, and says so as an offer error the screen has words for', async () => {
    const answer = respondOffer({ offerId: 'offer-1', response: 'accept', amountMinor: 2400 });

    await expect(answer).rejects.toBeInstanceOf(OfferError);
    await expect(answer).rejects.toMatchObject({ kind: 'unavailable' });
  });
});
