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

export function findSavedItem(itemId: string): ListedItem | undefined {
  return savedItems.find((item) => item.id === itemId);
}

/** Adds an item, or replaces the one with the same id: an id never names two items. */
export function upsertItem(item: ListedItem): void {
  const index = savedItems.findIndex(({ id }) => id === item.id);
  if (index === -1) {
    savedItems.unshift(item);
  } else {
    savedItems[index] = item;
  }
}

// Changes made to the samples while the app runs: an item replaced, or deleted.
const changedSamples = new Map<string, ListedItem>();
const deletedSampleIds = new Set<string>();

/** Replaces an item, whether it was saved while the app runs or is one of the samples. */
export function replaceItem(item: ListedItem): void {
  if (findSavedItem(item.id)) {
    upsertItem(item);
  } else {
    changedSamples.set(item.id, item);
  }
}

export function deleteItem(itemId: string): void {
  const index = savedItems.findIndex(({ id }) => id === itemId);
  if (index === -1) {
    deletedSampleIds.add(itemId);
  } else {
    savedItems.splice(index, 1);
  }
}

/** The newest saved items first, then the samples. */
export function allItems(): ListedItem[] {
  // A sample saved again while the app runs is a saved item now: it takes the sample's place.
  const samples = sampleItems
    .filter(({ id }) => !deletedSampleIds.has(id) && !findSavedItem(id))
    .map((item) => changedSamples.get(item.id) ?? item);
  return [...savedItems, ...samples];
}

type SampleOffer = {
  /** The sample item and marketplace the offer was made on: its listing. */
  on: [item: number, marketplace: Enums<'marketplace'>];
  buyer: string;
  amountMinor: number;
  status: Enums<'offer_status'>;
  /** Hours from now until it expires; negative once it has. Null for an offer that never does. */
  expiresInHours: number | null;
  createdAt: string;
};

// The first three are the pending offers of docs/design/mockups/09-propostas.png; the others
// are answered, one for each way an offer can end.
const sampleOfferRows: SampleOffer[] = [
  { on: [1, 'ebay'], buyer: 'vinil_porto', amountMinor: 2400, status: 'pending', expiresInHours: 21, createdAt: '2026-11-16T10:00:00Z' },
  { on: [3, 'ebay'], buyer: 'hifi.madrid', amountMinor: 15000, status: 'pending', expiresInHours: 50, createdAt: '2026-11-15T10:00:00Z' },
  { on: [2, 'discogs'], buyer: 'crate_digger', amountMinor: 3800, status: 'pending', expiresInHours: null, createdAt: '2026-11-14T10:00:00Z' },
  { on: [12, 'ebay'], buyer: 'north_records', amountMinor: 2500, status: 'accepted', expiresInHours: null, createdAt: '2026-11-10T10:00:00Z' },
  { on: [6, 'ebay'], buyer: 'tape_nord', amountMinor: 2500, status: 'rejected', expiresInHours: null, createdAt: '2026-11-09T10:00:00Z' },
  { on: [7, 'ebay'], buyer: 'sound_lab', amountMinor: 20000, status: 'expired', expiresInHours: -24, createdAt: '2026-11-08T10:00:00Z' },
  { on: [11, 'ebay'], buyer: 'lisboa_vinyl', amountMinor: 4000, status: 'withdrawn', expiresInHours: null, createdAt: '2026-11-07T10:00:00Z' },
];

const HOUR_MS = 3_600_000;

// The sample expiries count from when the app started, so an offer really runs out of time.
const sampleEpoch = new Date();

function sampleOffers(): Tables<'offers'>[] {
  return sampleOfferRows.map(({ on: [item, marketplace], buyer, amountMinor, status, expiresInHours, createdAt }, index) => ({
    id: `sample-offer-${index + 1}`,
    user_id: USER_ID,
    listing_id: `sample-item-${item}-${marketplace}`,
    external_id: `offer-${index + 1}`,
    buyer,
    amount_minor: amountMinor,
    currency: 'EUR',
    status,
    expires_at:
      expiresInHours === null ? null : new Date(sampleEpoch.getTime() + expiresInHours * HOUR_MS).toISOString(),
    created_at: createdAt,
    updated_at: createdAt,
  }));
}

// Offers answered while the app runs, by id. They are gone on the next launch, like the rest.
const answeredOffers = new Map<string, Tables<'offers'>>();

/** Replaces an offer, such as one the seller just answered. */
export function replaceOffer(offer: Tables<'offers'>): void {
  answeredOffers.set(offer.id, offer);
}

/** Every offer, with the answers given so far. */
export function allOffers(): Tables<'offers'>[] {
  return sampleOffers().map((offer) => answeredOffers.get(offer.id) ?? offer);
}

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
