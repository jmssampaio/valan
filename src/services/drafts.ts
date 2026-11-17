import type { PhotoSource } from './listings';
import { rememberItem, USER_ID } from './sample-data';

import type { TablesInsert } from '@/types/database';

/** What the app may write on a draft item. The status is not here: the server decides it. */
export type DraftItemFields = Required<
  Pick<
    TablesInsert<'items'>,
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
  >
>;

export type DraftToSave = {
  item: DraftItemFields;
  /** In the order the seller added them. */
  photos: readonly Extract<PhotoSource, { uri: string }>[];
};

let savedDrafts = 0;

// Kept in memory until the Supabase insert and the photo upload exist; callers already get
// the final shape.
export async function saveDraft({ item, photos }: DraftToSave): Promise<{ id: string }> {
  savedDrafts += 1;
  const id = `saved-draft-${savedDrafts}`;
  const now = new Date().toISOString();

  rememberItem({
    ...item,
    id,
    user_id: USER_ID,
    price_minor: null,
    currency: 'EUR',
    accepts_offers: false,
    status: 'draft',
    created_at: now,
    updated_at: now,
    listings: [],
    photo: photos[0] ?? null,
  });

  return { id };
}
