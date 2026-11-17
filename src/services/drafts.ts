import type { PhotoSource } from './listings';
import { findSavedItem, upsertItem, USER_ID } from './sample-data';

import type { TablesInsert } from '@/types/database';

/**
 * What the app may write on a draft item. The id is made on the device (see newItemId), so
 * every save and publish of the same draft is about the same item. The status is not here:
 * the server decides it.
 */
export type DraftItemFields = Required<
  Pick<
    TablesInsert<'items'>,
    | 'id'
    | 'type'
    | 'title'
    | 'artist'
    | 'discogs_release_id'
    | 'format'
    | 'release_year'
    | 'media_condition'
    | 'sleeve_condition'
    | 'equipment_condition'
    | 'description'
    | 'price_minor'
    | 'currency'
    | 'accepts_offers'
  >
>;

export type DraftToSave = {
  item: DraftItemFields;
  /** In the order the seller added them. */
  photos: readonly Extract<PhotoSource, { uri: string }>[];
};

// Kept in memory until the Supabase upsert and the photo upload exist; callers already get
// the final shape. Saving again updates the same item. An item that was already sent for
// publishing keeps its status and listings: those are the server's, not the app's, to change.
export async function saveDraft({ item, photos }: DraftToSave): Promise<{ id: string }> {
  const existing = findSavedItem(item.id);
  const now = new Date().toISOString();

  upsertItem({
    ...item,
    user_id: USER_ID,
    status: existing?.status ?? 'draft',
    created_at: existing?.created_at ?? now,
    updated_at: now,
    listings: existing?.listings ?? [],
    photo: photos[0] ?? null,
  });

  return { id: item.id };
}
