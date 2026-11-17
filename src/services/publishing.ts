import type { DraftToSave } from './drafts';
import type { ListingSummary } from './listings';
import { rememberItem, replaceItemListings, USER_ID } from './sample-data';

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
// policy, as in docs/design/mockups/07, and accepts the retry. Everything else succeeds.
const refusedOnce = new Set<string>();

function attempt(itemId: string, marketplace: string): ListingOutcome {
  const key = `${itemId}:${marketplace}`;
  if (marketplace === 'ebay' && !refusedOnce.has(key)) {
    refusedOnce.add(key);
    return { marketplace, status: 'error', reason: 'missingShippingPolicy' };
  }
  return { marketplace, status: 'published' };
}

function toListing(itemId: string, outcome: ListingOutcome): ListingSummary {
  return {
    id: `${itemId}-${outcome.marketplace}`,
    marketplace: outcome.marketplace as Enums<'marketplace'>,
    status: outcome.status,
  };
}

const outcomes = new Map<string, ListingOutcome[]>();
let publishedItems = 0;

// Kept in memory until the publish Edge Function exists; callers already get the final shape.
// The server decides the item's status: active once it is listed somewhere.
export async function publishItem({ item, photos, marketplaces }: ItemToPublish): Promise<PublishResult> {
  publishedItems += 1;
  const itemId = `published-item-${publishedItems}`;
  const now = new Date().toISOString();
  const listings = marketplaces.map((marketplace) => attempt(itemId, marketplace));
  outcomes.set(itemId, listings);

  rememberItem({
    ...item,
    id: itemId,
    user_id: USER_ID,
    status: listings.some(({ status }) => status === 'published') ? 'active' : 'draft',
    created_at: now,
    updated_at: now,
    listings: listings.map((outcome) => toListing(itemId, outcome)),
    photo: photos[0] ?? null,
  });

  return { itemId, listings };
}

/** Tries one marketplace again for an item that was already sent. */
export async function retryListing(itemId: string, marketplace: string): Promise<ListingOutcome> {
  const known = outcomes.get(itemId);
  if (!known) throw new Error('This item was never sent for publishing.');

  const outcome = attempt(itemId, marketplace);
  const updated = known.map((previous) => (previous.marketplace === marketplace ? outcome : previous));
  outcomes.set(itemId, updated);
  replaceItemListings(
    itemId,
    updated.map((each) => toListing(itemId, each)),
  );

  return outcome;
}
