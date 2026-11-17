import { listConnections } from '../connections';
import { listItems } from '../listings';
import { publishItem, retryListing } from '../publishing';

const item = {
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

const toPublish = { item, photos: [{ uri: 'file:///front.jpg' }], marketplaces: ['discogs', 'ebay'] };

describe('publishItem', () => {
  it('answers with one outcome per marketplace asked for, in order', async () => {
    const { listings } = await publishItem(toPublish);

    expect(listings.map(({ marketplace }) => marketplace)).toEqual(['discogs', 'ebay']);
  });

  it('reports a marketplace that refuses the listing, with the reason', async () => {
    const { listings } = await publishItem(toPublish);

    expect(listings).toEqual([
      { marketplace: 'discogs', status: 'published' },
      { marketplace: 'ebay', status: 'error', reason: 'missingShippingPolicy' },
    ]);
  });

  it('adds the item to the seller\'s listings as active, with its price and each listing\'s status', async () => {
    const { itemId } = await publishItem(toPublish);

    const listed = (await listItems()).find(({ id }) => id === itemId);
    expect(listed).toMatchObject({ status: 'active', price_minor: 2800, photo: { uri: 'file:///front.jpg' } });
    expect(listed?.listings.map(({ marketplace, status }) => [marketplace, status])).toEqual([
      ['discogs', 'published'],
      ['ebay', 'error'],
    ]);
  });

  it('keeps the item a draft when no marketplace took it', async () => {
    const { itemId } = await publishItem({ ...toPublish, marketplaces: ['ebay'] });

    expect((await listItems()).find(({ id }) => id === itemId)?.status).toBe('draft');
  });
});

describe('retryListing', () => {
  it('publishes on the marketplace that refused, and updates the item', async () => {
    const { itemId } = await publishItem({ ...toPublish, marketplaces: ['ebay'] });

    expect(await retryListing(itemId, 'ebay')).toEqual({ marketplace: 'ebay', status: 'published' });

    const listed = (await listItems()).find(({ id }) => id === itemId);
    expect(listed).toMatchObject({ status: 'active', listings: [{ marketplace: 'ebay', status: 'published' }] });
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
