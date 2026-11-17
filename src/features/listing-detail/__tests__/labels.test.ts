import {
  availableActions,
  conditionLines,
  detailLine,
  expiryLabel,
  listingMeta,
  listingStatusTag,
  marketplaceName,
  offerRow,
  saleLines,
  statsLine,
} from '../labels';

import type { ListedItem } from '@/services/listings';
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

describe('conditionLines', () => {
  it('names the grade of the disc and of the sleeve', () => {
    expect(conditionLines(item())).toEqual(['Disco VG+', 'Capa VG']);
  });

  it('names the medium after what the format says it is', () => {
    expect(conditionLines(item({ format: 'CD, Album', sleeve_condition: null }))).toEqual(['CD VG+']);
    expect(conditionLines(item({ format: 'Cassette', sleeve_condition: null }))).toEqual([
      'Cassete VG+',
    ]);
  });

  it('leaves out the sleeve when it was not graded', () => {
    expect(conditionLines(item({ sleeve_condition: null }))).toEqual(['Disco VG+']);
  });

  it('gives equipment its own condition', () => {
    const equipment = item({
      type: 'equipment',
      media_condition: null,
      sleeve_condition: null,
      equipment_condition: 'like_new',
    });

    expect(conditionLines(equipment)).toEqual(['Como novo']);
  });
});

describe('detailLine', () => {
  it('lists artist, format, year and whether offers are accepted', () => {
    expect(detailLine(item())).toBe('Os Marés · LP, Album · 1978 · Aceita propostas');
  });

  it('leaves out what the item does not have', () => {
    const line = detailLine(item({ artist: null, release_year: null, accepts_offers: false }));

    expect(line).toBe('LP, Album');
  });

  it('calls an item that is not a record "Outro artigo"', () => {
    const equipment = item({
      type: 'equipment',
      artist: null,
      format: null,
      release_year: null,
      accepts_offers: false,
    });

    expect(detailLine(equipment)).toBe('Outro artigo');
  });
});

describe('statsLine', () => {
  it('counts visits and offers', () => {
    expect(statsLine(14, 1)).toBe('14 visitas · 1 proposta');
    expect(statsLine(32, 2)).toBe('32 visitas · 2 propostas');
  });

  it('uses the singular for one visit and the plural for none', () => {
    expect(statsLine(1, 0)).toBe('1 visita · 0 propostas');
  });
});

describe('listingStatusTag', () => {
  it.each([
    ['published', 'Publicado', 'success'],
    ['error', 'Erro', 'error'],
    ['pending', 'A publicar', 'waiting'],
    ['paused', 'Em pausa', 'waiting'],
  ] as const)('marks a %s listing', (status, label, tone) => {
    expect(listingStatusTag(status)).toEqual({ label, tone });
  });

  it('has no mark for a removed listing', () => {
    expect(listingStatusTag('removed')).toBeNull();
  });
});

describe('marketplaceName', () => {
  it('reads the name from the marketplaces the app supports', () => {
    expect(marketplaceName('ebay')).toBe('eBay');
    expect(marketplaceName('discogs')).toBe('Discogs');
  });
});

describe('listingMeta', () => {
  it('shows the visits and offers of a published listing', () => {
    const listing = { id: 'l1', marketplace: 'discogs', status: 'published', reason: null, visits: 14 } as const;

    expect(listingMeta(listing, 1)).toBe('14 visitas · 1 proposta');
  });

  it('says why a listing was refused', () => {
    const listing = {
      id: 'l2',
      marketplace: 'ebay',
      status: 'error',
      reason: 'missingShippingPolicy',
      visits: 0,
    } as const;

    expect(listingMeta(listing, 0)).toBe(
      'Falta definir a política de envio na tua conta eBay. Define-a em eBay e tenta de novo.',
    );
  });

  it('falls back to the general reason when the marketplace gave none', () => {
    const listing = { id: 'l2', marketplace: 'ebay', status: 'error', reason: null, visits: 0 } as const;

    expect(listingMeta(listing, 0)).toBe('eBay não aceitou o anúncio. Tenta de novo.');
  });

  it('says a pending listing is waiting for the marketplace', () => {
    const listing = { id: 'l3', marketplace: 'discogs', status: 'pending', reason: null, visits: 0 } as const;

    expect(listingMeta(listing, 0)).toBe('À espera de resposta de Discogs');
  });

  it('says a paused listing is hidden from buyers', () => {
    const listing = { id: 'l4', marketplace: 'ebay', status: 'paused', reason: null, visits: 3 } as const;

    expect(listingMeta(listing, 0)).toBe('Em pausa: os compradores não a veem');
  });
});

describe('expiryLabel', () => {
  const now = new Date('2026-11-17T12:00:00Z');

  it('says nothing when the offer does not expire', () => {
    expect(expiryLabel(null, now)).toBeNull();
  });

  it('counts the hours left when it is less than a day', () => {
    expect(expiryLabel('2026-11-18T08:30:00Z', now)).toBe('Expira em 21 h');
  });

  it('counts the days left otherwise', () => {
    expect(expiryLabel('2026-11-19T13:00:00Z', now)).toBe('Expira em 2 dias');
    expect(expiryLabel('2026-11-18T13:00:00Z', now)).toBe('Expira em 1 dia');
  });

  it('says so when it has expired', () => {
    expect(expiryLabel('2026-11-17T11:00:00Z', now)).toBe('Expirou');
  });
});

describe('offerRow', () => {
  const offer: Tables<'offers'> = {
    id: 'offer-1',
    user_id: 'user-1',
    listing_id: 'l1',
    external_id: 'x',
    buyer: 'vinil_porto',
    amount_minor: 2400,
    currency: 'EUR',
    status: 'pending',
    expires_at: '2026-11-18T08:30:00Z',
    created_at: '2026-11-16T10:00:00Z',
    updated_at: '2026-11-16T10:00:00Z',
  };
  const now = new Date('2026-11-17T12:00:00Z');

  it('names the buyer and the marketplace, with the price and when it expires', () => {
    expect(offerRow(offer, 'ebay', now)).toEqual({
      title: 'vinil_porto · eBay',
      meta: 'Expira em 21 h',
      price: '24\u00A0€',
    });
  });

  it('names only the marketplace when the buyer is unknown', () => {
    expect(offerRow({ ...offer, buyer: null, expires_at: null }, 'discogs', now)).toEqual({
      title: 'Discogs',
      meta: undefined,
      price: '24\u00A0€',
    });
  });
});

describe('availableActions', () => {
  const published = { id: 'l1', marketplace: 'discogs', status: 'published' } as const;
  const paused = { id: 'l2', marketplace: 'ebay', status: 'paused' } as const;
  const errored = { id: 'l3', marketplace: 'ebay', status: 'error' } as const;

  it('lets an active item with a published listing be paused or removed', () => {
    expect(availableActions(item(), [published, errored])).toEqual(['pause', 'remove']);
  });

  it('lets an item whose listings are all paused be resumed', () => {
    expect(availableActions(item(), [paused])).toEqual(['resume', 'remove']);
  });

  it('only lets an item with nothing live be removed', () => {
    expect(availableActions(item(), [errored])).toEqual(['remove']);
  });

  it('lets a draft be continued or deleted', () => {
    expect(availableActions(item({ status: 'draft' }), [])).toEqual(['continueDraft', 'deleteDraft']);
  });

  it('gives a sold item no actions', () => {
    expect(availableActions(item({ status: 'sold' }), [])).toEqual([]);
  });
});

describe('saleLines', () => {
  const sale: Tables<'sales'> = {
    id: 'sale-1',
    user_id: 'user-1',
    listing_id: null,
    marketplace: 'ebay',
    item_title: 'Sete Colinas',
    item_artist: 'Os Marés',
    external_order_id: 'order-1',
    price_minor: 18000,
    fees_minor: 2340,
    currency: 'EUR',
    buyer: null,
    sold_at: '2026-11-03T09:00:00Z',
    created_at: '2026-11-03T09:00:00Z',
  };

  it('gives the price, the fees, where it sold and when', () => {
    expect(saleLines(sale)).toEqual([
      { label: 'Vendido por', value: '180\u00A0€' },
      { label: 'Taxas', value: '23,40\u00A0€' },
      { label: 'Plataforma', value: 'eBay' },
      { label: 'Data', value: '3/11/2026' },
    ]);
  });
});
