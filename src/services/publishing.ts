import { saveDraft, type DraftToSave } from './drafts';

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

// Still a stand-in: no marketplace is reached. The item itself is saved for real, as a
// draft, because only the server may list it or change its status; the outcomes below
// are invented and kept in memory, so the item shows as a draft in the listings.
//
// The sample marketplace behaviour: eBay refuses the first attempt for a missing shipping
// policy, as in docs/design/mockups/07, and accepts the next. Everything else succeeds.
const published = new Set<string>();
const refusedOnce = new Set<string>();
const sent = new Set<string>();

/**
 * Publishes on one marketplace unless the listing is already there: there is one listing
 * per item and marketplace, so asking again never makes a second one.
 */
function publishOn(itemId: string, marketplace: string): ListingOutcome {
  const key = `${itemId}:${marketplace}`;
  if (published.has(key)) return { marketplace, status: 'published' };

  if (marketplace === 'ebay' && !refusedOnce.has(key)) {
    refusedOnce.add(key);
    return { marketplace, status: 'error', reason: 'missingShippingPolicy' };
  }
  published.add(key);
  return { marketplace, status: 'published' };
}

// Idempotent per item id and marketplace, as the real publish Edge Function must be:
// publishing the same draft again updates that item and never creates a second one.
export async function publishItem({ item, photos, marketplaces }: ItemToPublish): Promise<PublishResult> {
  await saveDraft({ item, photos });
  sent.add(item.id);

  return {
    itemId: item.id,
    listings: marketplaces.map((marketplace) => publishOn(item.id, marketplace)),
  };
}

/** Tries one marketplace again for an item that was already sent. */
export async function retryListing(itemId: string, marketplace: string): Promise<ListingOutcome> {
  if (!sent.has(itemId)) throw new Error('This item was never sent for publishing.');

  return publishOn(itemId, marketplace);
}
