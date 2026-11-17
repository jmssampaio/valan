import {
  filterOptions,
  itemDetail,
  itemsForFilter,
  listingTags,
  summarise,
} from '../listing-rows';

import type { ListedItem, ListingSummary } from '@/services/listings';
import type { Tables } from '@/types/database';

// The device language is a system boundary: fix it so labels are predictable.
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'pt', languageTag: 'pt-PT' }],
}));

function item(overrides: Partial<ListedItem> = {}): ListedItem {
  return {
    id: 'item-1',
    user_id: 'user-1',
    type: 'record',
    title: 'Noites de Lisboa',
    artist: 'Os Marés',
    discogs_release_id: 249504,
    format: 'LP, Album',
    release_year: 1978,
    media_condition: 'VG+',
    sleeve_condition: 'VG',
    equipment_condition: null,
    description: null,
    price_minor: 2800,
    currency: 'EUR',
    accepts_offers: true,
    status: 'active',
    created_at: '2026-11-01T10:00:00Z',
    updated_at: '2026-11-01T10:00:00Z',
    listings: [],
    photo: null,
    ...overrides,
  };
}

function listing(overrides: Partial<ListingSummary> = {}): ListingSummary {
  return { id: 'listing-1', marketplace: 'discogs', status: 'published', ...overrides };
}

function sale(overrides: Partial<Tables<'sales'>> = {}): Tables<'sales'> {
  return {
    id: 'sale-1',
    user_id: 'user-1',
    listing_id: null,
    marketplace: 'ebay',
    item_title: 'Record',
    item_artist: null,
    external_order_id: 'order-1',
    price_minor: 2000,
    fees_minor: 0,
    currency: 'EUR',
    buyer: null,
    sold_at: '2026-11-10T09:00:00',
    created_at: '2026-11-10T09:00:00',
    ...overrides,
  };
}

describe('itemDetail', () => {
  it('describes a record by its artist, format and media condition', () => {
    expect(itemDetail(item())).toBe('Os Marés · LP · VG+');
  });

  it('shows only the main part of a long format', () => {
    expect(itemDetail(item({ format: '2×LP, Album, Reissue' }))).toBe('Os Marés · 2×LP · VG+');
  });

  it('leaves out what a record does not have yet', () => {
    expect(itemDetail(item({ format: null }))).toBe('Os Marés · VG+');
    expect(itemDetail(item({ artist: null, format: null }))).toBe('VG+');
    expect(itemDetail(item({ artist: null, format: null, media_condition: null }))).toBe('');
  });

  it('describes equipment by its type', () => {
    const turntable = item({ type: 'equipment', artist: null, media_condition: null });

    expect(itemDetail(turntable)).toBe('Aparelho');
  });
});

describe('listingTags', () => {
  it('labels a published listing with the marketplace name', () => {
    expect(listingTags([listing({ marketplace: 'ebay' })])).toEqual([
      { key: 'listing-1', label: 'eBay', tone: 'neutral' },
    ]);
  });

  it('marks a listing that failed as an error', () => {
    expect(listingTags([listing({ marketplace: 'ebay', status: 'error' })])).toEqual([
      { key: 'listing-1', label: 'eBay · erro', tone: 'error' },
    ]);
  });

  it('marks a listing still being published as waiting', () => {
    expect(listingTags([listing({ status: 'pending' })])).toEqual([
      { key: 'listing-1', label: 'Discogs · a publicar', tone: 'waiting' },
    ]);
  });

  it('marks a paused listing as waiting', () => {
    expect(listingTags([listing({ status: 'paused' })])).toEqual([
      { key: 'listing-1', label: 'Discogs · em pausa', tone: 'waiting' },
    ]);
  });

  it('hides listings that were removed from the marketplace', () => {
    expect(listingTags([listing({ status: 'removed' })])).toEqual([]);
  });
});

describe('itemsForFilter', () => {
  const items = [
    item({ id: 'active', status: 'active' }),
    item({ id: 'draft', status: 'draft' }),
    item({ id: 'sold', status: 'sold' }),
    item({ id: 'removed', status: 'removed' }),
  ];

  it.each([
    ['active', ['active']],
    ['drafts', ['draft']],
    ['sold', ['sold']],
  ] as const)('keeps only the %s items', (filter, expectedIds) => {
    expect(itemsForFilter(items, filter).map(({ id }) => id)).toEqual(expectedIds);
  });
});

describe('filterOptions', () => {
  it('counts the active items and the drafts, and leaves the sold ones uncounted', () => {
    const items = [
      item({ id: 'a', status: 'active' }),
      item({ id: 'b', status: 'active' }),
      item({ id: 'c', status: 'draft' }),
      item({ id: 'd', status: 'sold' }),
    ];

    expect(filterOptions(items)).toEqual([
      { value: 'active', label: 'Ativos · 2' },
      { value: 'drafts', label: 'Rascunhos · 1' },
      { value: 'sold', label: 'Vendidos' },
    ]);
  });
});

describe('summarise', () => {
  const now = new Date(2026, 10, 16, 12);

  it('counts the active items and passes on the pending offers', () => {
    const items = [item({ id: 'a' }), item({ id: 'b' }), item({ id: 'c', status: 'draft' })];

    expect(summarise({ items, pendingOffers: 3, sales: [], now })).toMatchObject({
      activeCount: 2,
      pendingOffers: 3,
    });
  });

  it('adds up the sales of the current month only', () => {
    const sales = [
      sale({ id: 'this-month-1', price_minor: 2800, sold_at: '2026-11-02T10:00:00' }),
      sale({ id: 'this-month-2', price_minor: 38400, sold_at: '2026-11-15T10:00:00' }),
      sale({ id: 'last-month', price_minor: 9900, sold_at: '2026-10-30T10:00:00' }),
      sale({ id: 'last-year', price_minor: 5000, sold_at: '2025-11-10T10:00:00' }),
    ];

    expect(summarise({ items: [], pendingOffers: 0, sales, now })).toMatchObject({
      soldThisMonthMinor: 41200,
      currency: 'EUR',
      month: now,
    });
  });

  it('reports nothing sold when there are no sales this month', () => {
    expect(summarise({ items: [], pendingOffers: 0, sales: [], now })).toMatchObject({
      soldThisMonthMinor: 0,
      currency: 'EUR',
    });
  });
});
