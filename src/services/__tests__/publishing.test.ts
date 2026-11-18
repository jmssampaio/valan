import { listConnections } from '../connections';
import { saveDraft } from '../drafts';
import { newItemId } from '../ids';
import { publishItem, retryListing } from '../publishing';

// Saving the item is the real part of publishing; here it is the boundary.
jest.mock('../drafts');

const fields = {
  type: 'record',
  title: 'Noites de Lisboa',
  artist: 'Os Marés',
  discogs_release_id: 249504,
  format: 'LP, Album',
  release_year: 1978,
  media_condition: 'VG+',
  sleeve_condition: null,
  equipment_condition: null,
  description: null,
  price_minor: 2800,
  currency: 'EUR',
  accepts_offers: true,
} as const;

/** Something to publish, with the id the device gave the draft. */
function toPublish(marketplaces = ['discogs', 'ebay'], id = newItemId()) {
  return { item: { ...fields, id }, photos: [{ id: 'photo-front', uri: 'file:///front.jpg' }], marketplaces };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(saveDraft).mockImplementation(async ({ item }) => ({ id: item.id, photosFailed: 0 }));
});

describe('publishItem', () => {
  it('saves the item under the id the device gave the draft', async () => {
    const request = toPublish();

    const { itemId } = await publishItem(request);

    expect(itemId).toBe(request.item.id);
    expect(saveDraft).toHaveBeenCalledWith({ item: request.item, photos: request.photos });
  });

  it('publishes nothing when some photos could not be stored', async () => {
    jest.mocked(saveDraft).mockImplementation(async ({ item }) => ({ id: item.id, photosFailed: 2 }));

    await expect(publishItem(toPublish())).rejects.toThrow();
  });

  it('publishes nothing when the item cannot be saved', async () => {
    jest.mocked(saveDraft).mockRejectedValue(new Error('network'));

    await expect(publishItem(toPublish())).rejects.toThrow();
  });

  it('answers with one outcome per marketplace asked for, in order', async () => {
    const { listings } = await publishItem(toPublish());

    expect(listings.map(({ marketplace }) => marketplace)).toEqual(['discogs', 'ebay']);
  });

  it('reports a marketplace that refuses the listing, with the reason', async () => {
    const { listings } = await publishItem(toPublish());

    expect(listings).toEqual([
      { marketplace: 'discogs', status: 'published' },
      { marketplace: 'ebay', status: 'error', reason: 'missingShippingPolicy' },
    ]);
  });

  it('leaves a marketplace that already has the listing alone when the same draft is published again', async () => {
    const request = toPublish();
    await publishItem(request);

    const second = await publishItem(request);

    // Discogs already had it; eBay, which refused, is tried again.
    expect(second.itemId).toBe(request.item.id);
    expect(second.listings).toEqual([
      { marketplace: 'discogs', status: 'published' },
      { marketplace: 'ebay', status: 'published' },
    ]);
  });
});

describe('retryListing', () => {
  it('publishes on the marketplace that refused', async () => {
    const { itemId } = await publishItem(toPublish(['ebay']));

    expect(await retryListing(itemId, 'ebay')).toEqual({ marketplace: 'ebay', status: 'published' });
  });

  it('leaves a marketplace that already has the listing as it is', async () => {
    const { itemId } = await publishItem(toPublish(['discogs']));

    expect(await retryListing(itemId, 'discogs')).toEqual({ marketplace: 'discogs', status: 'published' });
  });

  it('refuses an item that was never sent', async () => {
    await expect(retryListing('unknown-item', 'ebay')).rejects.toThrow();
  });
});

describe('listConnections', () => {
  it('lists the marketplace accounts with their status and no tokens', async () => {
    const connections = await listConnections();

    expect(connections.map(({ marketplace, status }) => [marketplace, status])).toEqual([
      ['discogs', 'connected'],
      ['ebay', 'connected'],
    ]);
    expect(Object.keys(connections[0]).join(' ')).not.toMatch(/token/);
  });
});
