import type { PhotoSource } from './listings';
import { getSupabase, requireUserId } from './supabase';

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
  /** In the order the seller added them. Not stored yet: photo upload has its own work. */
  photos: readonly Extract<PhotoSource, { uri: string }>[];
};

const ALREADY_EXISTS = '23505';

/**
 * Saves the draft as the seller's item. Saving again updates the same row, so an id never
 * names two items. A new item starts as a draft because the database says so; an item that
 * was already sent keeps its status and listings, which only the server may change.
 */
export async function saveDraft({ item }: DraftToSave): Promise<{ id: string }> {
  const userId = await requireUserId();
  const { id, ...fields } = item;
  const items = getSupabase().from('items');

  const created = await items.insert({ id, user_id: userId, ...fields });
  if (!created.error) return { id };
  if (created.error.code !== ALREADY_EXISTS) throw created.error;

  // The id is taken. If the row is the seller's own this updates it; if it is someone
  // else's the database hides it, nothing is updated, and the save fails.
  const updated = await items.update(fields).eq('id', id).select('id');
  if (updated.error) throw updated.error;
  if (updated.data.length === 0) throw new Error('This item cannot be saved.');

  return { id };
}
