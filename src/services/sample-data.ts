// Sample rows shaped like the database, used until the Supabase queries exist.
// The first four active items are the ones drawn in docs/design/mockups/03-anuncios.png.

import type { ListedItem, ListingSummary, PhotoSource } from './listings';
import sleeve1 from '../../assets/samples/sleeve-1.svg';
import sleeve2 from '../../assets/samples/sleeve-2.svg';
import sleeve3 from '../../assets/samples/sleeve-3.svg';
import sleeve4 from '../../assets/samples/sleeve-4.svg';
import sleeve5 from '../../assets/samples/sleeve-5.svg';
import sleeve6 from '../../assets/samples/sleeve-6.svg';

import type { Enums, Tables } from '@/types/database';

const DEFAULT_FORMAT = 'LP, Album';
const DEFAULT_YEAR = 1978;
export const USER_ID = '00000000-0000-0000-0000-00000000000a';
const CREATED_AT = '2026-11-01T10:00:00Z';

type SampleListing = [marketplace: Enums<'marketplace'>, status: Enums<'listing_status'>];

type SampleItem = {
  title: string;
  status: Enums<'item_status'>;
  priceMinor: number | null;
  artist?: string;
  condition?: Enums<'record_condition'>;
  /** Records only; most of the samples are plain LPs. */
  format?: string;
  listings?: SampleListing[];
  photo?: PhotoSource;
};

function toListings(itemId: string, listings: SampleListing[]): ListingSummary[] {
  return listings.map(([marketplace, status]) => ({
    id: `${itemId}-${marketplace}`,
    marketplace,
    status,
  }));
}

function toItem(sample: SampleItem, index: number): ListedItem {
  const id = `sample-item-${index + 1}`;
  const isRecord = sample.artist !== undefined;

  return {
    id,
    user_id: USER_ID,
    type: isRecord ? 'record' : 'equipment',
    title: sample.title,
    artist: sample.artist ?? null,
    discogs_release_id: null,
    format: isRecord ? (sample.format ?? DEFAULT_FORMAT) : null,
    release_year: isRecord ? DEFAULT_YEAR : null,
    media_condition: sample.condition ?? null,
    sleeve_condition: sample.condition ?? null,
    equipment_condition: isRecord ? null : 'good',
    description: null,
    price_minor: sample.priceMinor,
    currency: 'EUR',
    accepts_offers: true,
    status: sample.status,
    created_at: CREATED_AT,
    updated_at: CREATED_AT,
    listings: toListings(id, sample.listings ?? []),
    photo: sample.photo ?? null,
  };
}

const everywhere: SampleListing[] = [
  ['discogs', 'published'],
  ['ebay', 'published'],
];
const ebayOnly: SampleListing[] = [['ebay', 'published']];

const samples: SampleItem[] = [
  { title: 'Noites de Lisboa', artist: 'Os Marés', condition: 'VG+', priceMinor: 2800, status: 'active', listings: everywhere, photo: sleeve1 },
  { title: 'Blue Harbor Sessions', artist: 'The Lanterns', condition: 'NM', format: '2×LP, Album', priceMinor: 4500, status: 'active', listings: [['discogs', 'published'], ['ebay', 'error']], photo: sleeve2 },
  { title: 'Gira-discos Aurora', priceMinor: 18000, status: 'active', listings: ebayOnly, photo: sleeve3 },
  { title: 'Verde Mar', artist: 'Quarteto Atlântico', condition: 'VG', priceMinor: 1600, status: 'active', listings: [['discogs', 'pending']], photo: sleeve4 },
  { title: 'Cartas do Norte', artist: 'Trio Alvorada', condition: 'VG+', format: 'CD, Album', priceMinor: 2200, status: 'active', listings: everywhere, photo: sleeve5 },
  { title: 'Paper Lighthouses', artist: 'June & the Tide', condition: 'NM', priceMinor: 3400, status: 'active', listings: everywhere, photo: sleeve6 },
  { title: 'Amplificador Sereno', priceMinor: 24000, status: 'active', listings: ebayOnly, photo: sleeve3 },
  { title: 'Rua das Flores, 12', artist: 'Banda do Cais', condition: 'G+', priceMinor: 900, status: 'active', listings: [['discogs', 'published']], photo: sleeve1 },
  { title: 'Slow Meridian', artist: 'Hollow Pines', condition: 'VG', priceMinor: 1800, status: 'active', listings: [['discogs', 'published'], ['ebay', 'paused']], photo: sleeve2 },
  { title: 'Colunas Marfim', priceMinor: 9500, status: 'active', listings: ebayOnly, photo: sleeve6 },
  { title: 'Fado Elétrico', artist: 'As Andorinhas', condition: 'NM', priceMinor: 5200, status: 'active', listings: everywhere, photo: sleeve4 },
  { title: 'Night Ferry', artist: 'The Salt Choir', condition: 'VG+', priceMinor: 2750, status: 'active', listings: everywhere, photo: sleeve5 },
  { title: 'Lado B sem título', artist: 'Coletivo Bruma', priceMinor: null, status: 'draft' },
  { title: 'Leitor de cassetes Brisa', priceMinor: 6000, status: 'draft' },
  { title: 'Sete Colinas', artist: 'Os Marés', condition: 'VG+', priceMinor: 18000, status: 'sold', photo: sleeve1 },
  { title: 'Low Tide Hymns', artist: 'The Salt Choir', condition: 'NM', priceMinor: 14200, status: 'sold', photo: sleeve6 },
  { title: 'Rádio Vértice', priceMinor: 9000, status: 'sold', photo: sleeve3 },
];

export const sampleItems: ListedItem[] = samples.map(toItem);

// Items saved while the app runs. They are gone on the next launch, like the rest of the samples.
const savedItems: ListedItem[] = [];

export function rememberItem(item: ListedItem): void {
  savedItems.unshift(item);
}

/** The newest saved items first, then the samples. */
export function allItems(): ListedItem[] {
  return [...savedItems, ...sampleItems];
}

const offerStatuses: Enums<'offer_status'>[] = ['pending', 'pending', 'pending', 'accepted'];

export const sampleOffers: Tables<'offers'>[] = offerStatuses.map((status, index) => ({
  id: `sample-offer-${index + 1}`,
  user_id: USER_ID,
  listing_id: `sample-item-${index + 1}-ebay`,
  external_id: `offer-${index + 1}`,
  buyer: `buyer-${index + 1}`,
  amount_minor: 2000,
  currency: 'EUR',
  status,
  expires_at: null,
  created_at: CREATED_AT,
  updated_at: CREATED_AT,
}));

/** Dated in the current month, so the summary always has sales to show. */
export function sampleSales(now: Date = new Date()): Tables<'sales'>[] {
  return sampleItems
    .filter((item) => item.status === 'sold')
    .map((item, index) => {
      const soldAt = new Date(now.getFullYear(), now.getMonth(), 1, 9 + index).toISOString();
      return {
        id: `sample-sale-${index + 1}`,
        user_id: USER_ID,
        listing_id: null,
        marketplace: 'ebay',
        item_title: item.title,
        item_artist: item.artist,
        external_order_id: `order-${index + 1}`,
        price_minor: item.price_minor ?? 0,
        fees_minor: 0,
        currency: item.currency,
        buyer: null,
        sold_at: soldAt,
        created_at: soldAt,
      };
    });
}
