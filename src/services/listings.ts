import { getSupabase, requireUserId } from './supabase';

import type { Tables } from '@/types/database';

/** A bundled image, or one fetched from storage. */
export type PhotoSource = number | { uri: string };

export type ListingSummary = Pick<Tables<'listings'>, 'id' | 'marketplace' | 'status'>;

/** An item row with its listings and its first photo, ready to show in a list. */
export type ListedItem = Tables<'items'> & {
  listings: ListingSummary[];
  photo: PhotoSource | null;
};

/** What every query for a seller's items selects: the item and the state of its listings. */
export const ITEM_WITH_LISTINGS = '*, listings(id, marketplace, status)';

/**
 * The signed-in seller's items, newest first. The database returns only their own rows
 * (row level security), whatever this query asks for.
 */
export async function listItems(): Promise<ListedItem[]> {
  await requireUserId();

  const { data, error } = await getSupabase()
    .from('items')
    .select(ITEM_WITH_LISTINGS)
    .order('created_at', { ascending: false });
  if (error) throw error;

  // Photos are not stored yet, so no item has one to show.
  return data.map((item) => ({ ...item, photo: null }));
}
