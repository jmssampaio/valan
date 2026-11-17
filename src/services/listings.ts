import { allItems } from './sample-data';

import type { Tables } from '@/types/database';

/** A bundled image, or one fetched from storage. */
export type PhotoSource = number | { uri: string };

export type ListingSummary = Pick<Tables<'listings'>, 'id' | 'marketplace' | 'status'>;

/** An item row with its listings and its first photo, ready to show in a list. */
export type ListedItem = Tables<'items'> & {
  listings: ListingSummary[];
  photo: PhotoSource | null;
};

// Sample data until the Supabase queries exist; callers already get the final shape.
export async function listItems(): Promise<ListedItem[]> {
  return allItems();
}
