import { ITEM_WITH_LISTINGS, type ListedItem, type ListingSummary } from './listings';
import type { PublishFailure } from './publishing';
import { getSupabase, requireUserId } from './supabase';

import type { Tables } from '@/types/database';

/** A listing as the detail screen shows it. */
export type DetailListing = ListingSummary & {
  /** Why the marketplace refused it, as a code the app has words for. Null when it did not. */
  reason: PublishFailure | null;
  /** Null until the marketplaces report visits: the schema has nowhere to keep them yet. */
  visits: number | null;
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

const ITEM_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function toDetailListing(listing: ListingSummary): DetailListing {
  return {
    ...listing,
    // The marketplace's own reason arrives with the publish Edge Function.
    reason: listing.status === 'error' ? 'unknown' : null,
    visits: null,
  };
}

/**
 * One of the signed-in seller's items. Null when there is none to show: the id names
 * nothing, the item was removed, or it belongs to someone else (the database does not say
 * which, and neither does this).
 */
export async function getListingDetail(itemId: string): Promise<ListingDetail | null> {
  await requireUserId();
  // The id comes from a route, so it may be anything; only a real id is worth asking about.
  if (!ITEM_ID.test(itemId)) return null;

  const { data: item, error } = await getSupabase()
    .from('items')
    .select(ITEM_WITH_LISTINGS)
    .eq('id', itemId)
    .maybeSingle();
  if (error) throw error;
  if (!item || item.status === 'removed') return null;

  return {
    item: { ...item, photo: null },
    listings: item.listings.filter(({ status }) => status !== 'removed').map(toDetailListing),
    // Offers and sales come with the marketplaces: no seller has any yet.
    offers: [],
    sale: null,
  };
}

/**
 * Deletes a draft. The database allows it only for the seller's own item and only while it
 * is a draft; anything else deletes nothing, and that is reported as a failure.
 */
export async function deleteDraft(itemId: string): Promise<void> {
  await requireUserId();

  const { data, error } = await getSupabase().from('items').delete().eq('id', itemId).select('id');
  if (error) throw error;
  if (data.length === 0) throw new Error('This draft cannot be deleted.');
}
