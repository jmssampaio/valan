import { listConnections } from '../connections';
import { saveDraft } from '../drafts';
import { newItemId } from '../ids';
import { listItems } from '../listings';
import { publishItem, retryListing } from '../publishing';

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
  return { item: { ...fields, id }, photos: [{ uri: 'file:///front.jpg' }], marketplaces };
}

async function itemsWithId(id: string) {
  return (await listItems()).filter((item) => item.id === id);
}

function statuses(item: Awaited<ReturnType<typeof itemsWithId>>[number]) {
  return item.listings.map(({ marketplace, status }) => [marketplace, status]);
}

describe('publishItem', () => {
  it('keeps the id the device gave the draft', async () => {
    const request = toPublish();

    expect((await publishItem(request)).itemId).toBe(request.item.id);
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

  it('adds the item to the seller\'s listings as active, with its price and each listing\'s status', async () => {
    const { itemId } = await publishItem(toPublish());

    const [listed] = await itemsWithId(itemId);
    expect(listed).toMatchObject({ status: 'active', price_minor: 2800, photo: { uri: 'file:///front.jpg' } });
    expect(statuses(listed)).toEqual([
      ['discogs', 'published'],
      ['ebay', 'error'],
    ]);
  });

  it('keeps the item a draft when no marketplace took it', async () => {
    const { itemId } = await publishItem(toPublish(['ebay']));

    expect((await itemsWithId(itemId))[0].status).toBe('draft');
  });

  it('publishes a draft that was saved before, as the same item', async () => {
    const request = toPublish(['discogs']);
    await saveDraft({ item: { ...request.item, price_minor: null }, photos: [] });

    await publishItem(request);

    expect(await itemsWithId(request.item.id)).toEqual([
      expect.objectContaining({ status: 'active', price_minor: 2800 }),
    ]);
  });

  it('never makes a second item or a second listing when the same draft is published twice', async () => {
    const request = toPublish();
    await publishItem(request);

    const second = await publishItem(request);

    const [listed, ...others] = await itemsWithId(request.item.id);
    expect(others).toEqual([]);
    expect(listed.listings).toHaveLength(2);
    // Discogs already had it and is left alone; eBay, which refused, is tried again.
    expect(second.listings).toEqual([
      { marketplace: 'discogs', status: 'published' },
      { marketplace: 'ebay', status: 'published' },
    ]);
  });

  it('keeps the listings it already has when published again on fewer marketplaces', async () => {
    const request = toPublish(['discogs', 'ebay']);
    await publishItem(request);

    await publishItem({ ...request, marketplaces: ['ebay'] });

    expect(statuses((await itemsWithId(request.item.id))[0])).toEqual([
      ['discogs', 'published'],
      ['ebay', 'published'],
    ]);
  });
});

describe('retryListing', () => {
  it('publishes on the marketplace that refused, and updates the item', async () => {
    const { itemId } = await publishItem(toPublish(['ebay']));

    expect(await retryListing(itemId, 'ebay')).toEqual({ marketplace: 'ebay', status: 'published' });

    const [listed] = await itemsWithId(itemId);
    expect(listed).toMatchObject({ status: 'active', listings: [{ marketplace: 'ebay', status: 'published' }] });
  });

  it('leaves a marketplace that already has the listing as it is', async () => {
    const { itemId } = await publishItem(toPublish(['discogs']));

    expect(await retryListing(itemId, 'discogs')).toEqual({ marketplace: 'discogs', status: 'published' });
    expect((await itemsWithId(itemId))[0].listings).toHaveLength(1);
  });

  it('refuses an item that was never sent', async () => {
    await expect(retryListing('unknown-item', 'ebay')).rejects.toThrow();
  });
});

describe('listConnections', () => {
  it('lists the seller\'s marketplace accounts with their status and no tokens', async () => {
    const connections = await listConnections();

    expect(connections.map(({ marketplace, status }) => [marketplace, status])).toEqual([
      ['discogs', 'connected'],
      ['ebay', 'connected'],
    ]);
    expect(Object.keys(connections[0]).join(' ')).not.toMatch(/token/);
  });
});
