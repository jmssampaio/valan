import type { DraftToSave } from './drafts';
import type { ListingSummary } from './listings';
import { findSavedItem, upsertItem, USER_ID } from './sample-data';

import type { Enums } from '@/types/database';

/** Why a marketplace refused a listing, as a code the app has words for. */
export type PublishFailure =
  | 'missingShippingPolicy'
  | 'unknown'
  /** Set by the app, never by the server: the request did not reach the marketplace. */
  | 'unreachable';

export type ListingOutcome =
  | { marketplace: string; status: 'published' }
  | { marketplace: string; status: 'error'; reason: PublishFailure };

export type PublishResult = {
  itemId: string;
  /** One outcome per marketplace asked for, in the order asked. */
  listings: ListingOutcome[];
};

export type ItemToPublish = DraftToSave & {
  /** Marketplace ids, as listed by supportedMarketplaces. */
  marketplaces: readonly string[];
};

// The sample marketplace behaviour: eBay refuses the first attempt for a missing shipping
// policy, as in docs/design/mockups/07, and accepts the next. Everything else succeeds.
const refusedOnce = new Set<string>();

function attempt(itemId: string, marketplace: string): ListingOutcome {
  const key = `${itemId}:${marketplace}`;
  if (marketplace === 'ebay' && !refusedOnce.has(key)) {
    refusedOnce.add(key);
    return { marketplace, status: 'error', reason: 'missingShippingPolicy' };
  }
  return { marketplace, status: 'published' };
}

function listingId(itemId: string, marketplace: string): string {
  return `${itemId}-${marketplace}`;
}

/**
 * Publishes on one marketplace unless the listing is already there. There is one listing per
 * item and marketplace, so asking again never makes a second one.
 */
function publishOn(itemId: string, marketplace: string, listings: ListingSummary[]): ListingOutcome {
  const id = listingId(itemId, marketplace);
  const existing = listings.find((listing) => listing.id === id);
  if (existing?.status === 'published') return { marketplace, status: 'published' };

  const outcome = attempt(itemId, marketplace);
  const listing: ListingSummary = {
    id,
    marketplace: marketplace as Enums<'marketplace'>,
    status: outcome.status,
  };
  if (existing) {
    listings[listings.indexOf(existing)] = listing;
  } else {
    listings.push(listing);
  }
  return outcome;
}

function statusFor(listings: readonly ListingSummary[], current: Enums<'item_status'>) {
  return listings.some(({ status }) => status === 'published') ? 'active' : current;
}

// Kept in memory until the publish Edge Function exists; callers already get the final shape.
// It is idempotent per item id and marketplace: publishing the same draft again, or a draft
// that was saved before, updates that item and its listings and never creates a second one.
// The server decides the item's status: active once it is listed somewhere.
export async function publishItem({ item, photos, marketplaces }: ItemToPublish): Promise<PublishResult> {
  const existing = findSavedItem(item.id);
  const now = new Date().toISOString();
  const listings = [...(existing?.listings ?? [])];
  const outcomes = marketplaces.map((marketplace) => publishOn(item.id, marketplace, listings));

  upsertItem({
    ...item,
    user_id: USER_ID,
    status: statusFor(listings, existing?.status ?? 'draft'),
    created_at: existing?.created_at ?? now,
    updated_at: now,
    listings,
    photo: photos[0] ?? existing?.photo ?? null,
  });

  return { itemId: item.id, listings: outcomes };
}

/** Tries one marketplace again for an item that was already sent. */
export async function retryListing(itemId: string, marketplace: string): Promise<ListingOutcome> {
  const item = findSavedItem(itemId);
  if (!item) throw new Error('This item was never sent for publishing.');

  const listings = [...item.listings];
  const outcome = publishOn(itemId, marketplace, listings);
  upsertItem({ ...item, listings, status: statusFor(listings, item.status) });

  return outcome;
}
