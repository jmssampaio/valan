import type { ListedItem, ListingSummary } from './listings';
import { supportedMarketplaces } from './marketplaces';
import type { PublishFailure } from './publishing';
import { allItems, deleteItem, replaceItem, sampleOffers, sampleSales } from './sample-data';

import type { Tables } from '@/types/database';

/** A listing as the detail screen shows it. */
export type DetailListing = ListingSummary & {
  /** Why the marketplace refused it, as a code the app has words for. Null when it did not. */
  reason: PublishFailure | null;
  /**
   * Fake until the marketplaces report them: the schema has no visit counts, so the real
   * service will need a place to keep them before the app can show this.
   */
  visits: number;
};

/** Everything screen 08 shows about one item. */
export type ListingDetail = {
  item: ListedItem;
  /** The listings that still exist: a removed one is left out. */
  listings: DetailListing[];
  /** Offers still waiting for an answer, on any of the item's listings. */
  offers: Tables<'offers'>[];
  /** Only a sold item has one. */
  sale: Tables<'sales'> | null;
};

// The fake marketplaces report these visit counts, as docs/design/mockups/08 shows them.
const sampleVisits: Record<string, number> = {
  'sample-item-1-discogs': 14,
  'sample-item-1-ebay': 32,
};
const VISIT_SPREAD = 40;

/** A steady number per listing, so the sample screen does not change from one look to the next. */
function visitsOf(listingId: string): number {
  return (
    sampleVisits[listingId] ??
    [...listingId].reduce((total, character) => total + character.charCodeAt(0), 0) % VISIT_SPREAD
  );
}

// The sample marketplace refuses an eBay listing for a missing shipping policy, as
// publishing.ts does; the real answer comes with the listing once the Edge Function exists.
function reasonOf(listing: ListingSummary): PublishFailure | null {
  if (listing.status !== 'error') return null;
  return listing.marketplace === 'ebay' ? 'missingShippingPolicy' : 'unknown';
}

function toDetailListing(listing: ListingSummary): DetailListing {
  return { ...listing, reason: reasonOf(listing), visits: visitsOf(listing.id) };
}

function findItem(itemId: string): ListedItem | undefined {
  return allItems().find(({ id }) => id === itemId);
}

function saleOf(item: ListedItem): Tables<'sales'> | null {
  if (item.status !== 'sold') return null;

  const sale = sampleSales().find(
    ({ item_title, item_artist }) => item_title === item.title && item_artist === item.artist,
  );
  if (!sale) return null;

  // The sample sales carry no fees; the marketplace keeps its usual share.
  const feeRate = supportedMarketplaces().find(({ id }) => id === sale.marketplace)?.feeRate ?? 0;
  return { ...sale, fees_minor: Math.round(sale.price_minor * feeRate) };
}

// Sample data until the Supabase queries exist; callers already get the final shape.
// A removed item is not found: for the seller it no longer exists.
export async function getListingDetail(itemId: string): Promise<ListingDetail | null> {
  const item = findItem(itemId);
  if (!item || item.status === 'removed') return null;

  const listings = item.listings.filter(({ status }) => status !== 'removed');
  const listingIds = new Set(listings.map(({ id }) => id));

  return {
    item,
    listings: listings.map(toDetailListing),
    offers: sampleOffers.filter(
      ({ listing_id, status }) => listingIds.has(listing_id) && status === 'pending',
    ),
    sale: saleOf(item),
  };
}

function requireItem(itemId: string): ListedItem {
  const item = findItem(itemId);
  if (!item) throw new Error('This item does not exist.');
  return item;
}

function requireActive(itemId: string): ListedItem {
  const item = requireItem(itemId);
  if (item.status !== 'active') throw new Error('Only a listed item can be changed this way.');
  return item;
}

function changeListings(
  item: ListedItem,
  change: (listing: ListingSummary) => ListingSummary,
): ListedItem {
  return { ...item, listings: item.listings.map(change), updated_at: new Date().toISOString() };
}

// The changes below are Edge Function calls once those exist: the app never writes an item's
// status or a listing itself, so each one only asks, and the server decides and checks the owner.

/** Takes the published listings off view without removing them. */
export async function pauseItem(itemId: string): Promise<void> {
  const item = requireActive(itemId);
  if (!item.listings.some(({ status }) => status === 'published')) {
    throw new Error('Nothing is published, so there is nothing to pause.');
  }

  replaceItem(
    changeListings(item, (listing) =>
      listing.status === 'published' ? { ...listing, status: 'paused' } : listing,
    ),
  );
}

export async function resumeItem(itemId: string): Promise<void> {
  const item = requireActive(itemId);

  replaceItem(
    changeListings(item, (listing) =>
      listing.status === 'paused' ? { ...listing, status: 'published' } : listing,
    ),
  );
}

/** Removes the item from every marketplace. It cannot be undone. */
export async function removeItem(itemId: string): Promise<void> {
  const item = requireActive(itemId);

  replaceItem({
    ...changeListings(item, (listing) => ({ ...listing, status: 'removed' })),
    status: 'removed',
  });
}

/** Only a draft can be deleted; anything else was sent out and has to be removed. */
export async function deleteDraft(itemId: string): Promise<void> {
  const item = requireItem(itemId);
  if (item.status !== 'draft') throw new Error('Only a draft can be deleted.');

  deleteItem(itemId);
}

/** Tries a refused listing again. A listing that is already published is left as it is. */
export async function retryFailedListing(itemId: string, marketplace: string): Promise<void> {
  const item = requireActive(itemId);
  const listing = item.listings.find((candidate) => candidate.marketplace === marketplace);
  if (!listing) throw new Error('This item was never sent to that marketplace.');
  if (listing.status !== 'error') return;

  replaceItem(
    changeListings(item, (candidate) =>
      candidate.id === listing.id ? { ...candidate, status: 'published' } : candidate,
    ),
  );
}
