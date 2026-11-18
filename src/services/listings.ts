import { inOrder, showPhotos } from './photos';
import { toError } from './errors';
import { getSupabase, requireUserId } from './supabase';

import type { Tables } from '@/types/database';

/** A bundled image, a file on the device, or a stored photo with its stable cache key. */
export type PhotoSource = number | { uri: string; cacheKey?: string };

export type ListingSummary = Pick<Tables<'listings'>, 'id' | 'marketplace' | 'status'>;

/** An item row with its listings and its first photo, ready to show in a list. */
export type ListedItem = Tables<'items'> & {
  listings: ListingSummary[];
  photo: PhotoSource | null;
};

/** What every query for a seller's items selects: the item and the state of its listings. */
export const ITEM_WITH_LISTINGS =
  '*, listings(id, marketplace, status), item_photos(id, item_id, storage_path, position)';

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
  if (error) throw toError(error);

  // A row shows the small version of the item's first photo.
  const covers = data.flatMap(({ item_photos }) => inOrder(item_photos).slice(0, 1));
  const shown = await showPhotos(covers);

  return data.map(({ item_photos, ...item }) => {
    const [cover] = inOrder(item_photos);
    return { ...item, photo: (cover && shown.get(cover.id)?.small) ?? null };
  });
}
