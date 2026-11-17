import { listItems } from '../listings';
import { countPendingOffers } from '../offers';
import { listSales } from '../sales';

describe('listItems', () => {
  it('returns every item with its listings', async () => {
    const items = await listItems();

    const first = items[0];
    expect(first).toMatchObject({ title: 'Noites de Lisboa', status: 'active', price_minor: 2800 });
    expect(first.listings.map(({ marketplace, status }) => [marketplace, status])).toEqual([
      ['discogs', 'published'],
      ['ebay', 'published'],
    ]);
  });

  it('gives an item without photos no photo', async () => {
    const items = await listItems();

    expect(items.find((item) => item.status === 'draft')?.photo).toBeNull();
  });

  it('gives every item a different id', async () => {
    const ids = (await listItems()).map((item) => item.id);

    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('countPendingOffers', () => {
  it('counts only the offers still waiting for an answer', async () => {
    expect(await countPendingOffers()).toBe(3);
  });
});

describe('listSales', () => {
  it('returns sales with the snapshot of what was sold', async () => {
    const sales = await listSales();

    expect(sales[0]).toMatchObject({ item_title: 'Sete Colinas', price_minor: 18000, currency: 'EUR' });
  });
});
