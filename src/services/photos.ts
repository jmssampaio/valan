import { preparePhoto } from './photo-files';
import { toError } from './errors';
import { getSupabase, requireUserId } from './supabase';

const BUCKET = 'item-photos';
const JPEG = 'image/jpeg';
// How long an address to a private photo works. The cache key below outlives it.
const ADDRESS_LIFETIME_SECONDS = 3600;
const ALREADY_STORED = '409';

/** A photo to keep with an item: one the seller just picked, or one already stored. */
export type PhotoToKeep = {
  /** Made on the device when the photo is picked; it names the files and the row. */
  id: string;
  /** Where the picked file is on the device. Not read for a photo that is already stored. */
  uri: string;
};

/**
 * A stored photo, ready to show. The address changes every hour; the cache key never does,
 * so a new address does not download the photo again.
 */
export type ShownPhoto = {
  uri: string;
  cacheKey: string;
};

export type StoredPhoto = {
  id: string;
  full: ShownPhoto;
  small: ShownPhoto;
};

export type PhotoRow = { id: string; item_id: string; storage_path: string; position: number };

function fullPath(userId: string, itemId: string, photoId: string): string {
  return `${userId}/${itemId}/${photoId}.jpg`;
}

/** The small version sits beside the full one. */
function smallPath(path: string): string {
  return path.replace(/\.jpg$/, '-small.jpg');
}

async function upload(path: string, bytes: ArrayBuffer): Promise<void> {
  const { error } = await getSupabase().storage.from(BUCKET).upload(path, bytes, { contentType: JPEG });
  // Already there from an earlier save that did not finish: the file is the same, so it stands.
  if (error && !('statusCode' in error && error.statusCode === ALREADY_STORED)) throw toError(error);
}

/**
 * Makes the stored photos of an item match the draft: uploads the new ones, deletes the ones
 * the seller took out, and records the order. A photo that fails to upload is left out and
 * counted, so the others and the item are still saved and the seller can try again.
 */
export async function syncItemPhotos(
  itemId: string,
  photos: readonly PhotoToKeep[],
): Promise<{ failed: number }> {
  const userId = await requireUserId();
  const supabase = getSupabase();

  const existing = await supabase.from('item_photos').select('id, storage_path').eq('item_id', itemId);
  if (existing.error) throw toError(existing.error);
  const storedIds = new Set(existing.data.map(({ id }) => id));
  const keptIds = new Set(photos.map(({ id }) => id));

  const removed = existing.data.filter(({ id }) => !keptIds.has(id));
  if (removed.length > 0) {
    await deleteFiles(removed.map(({ storage_path }) => storage_path));
    const { error } = await supabase
      .from('item_photos')
      .delete()
      .in(
        'id',
        removed.map(({ id }) => id),
      );
    if (error) throw toError(error);
  }

  const kept: PhotoToKeep[] = [];
  let failed = 0;
  for (const photo of photos) {
    if (!storedIds.has(photo.id)) {
      try {
        const path = fullPath(userId, itemId, photo.id);
        const { full, small } = await preparePhoto(photo.uri);
        await upload(path, full);
        await upload(smallPath(path), small);
      } catch {
        failed += 1;
        continue;
      }
    }
    kept.push(photo);
  }

  if (kept.length > 0) {
    // One statement: new rows are added and the others take their place in the order.
    const { error } = await supabase.from('item_photos').upsert(
      kept.map(({ id }, position) => ({
        id,
        user_id: userId,
        item_id: itemId,
        storage_path: fullPath(userId, itemId, id),
        position,
      })),
    );
    if (error) throw toError(error);
  }

  return { failed };
}

async function deleteFiles(paths: readonly string[]): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await getSupabase()
    .storage.from(BUCKET)
    .remove(paths.flatMap((path) => [path, smallPath(path)]));
  if (error) throw toError(error);
}

/** Removes every photo file of an item. The rows go with the item itself. */
export async function deleteItemPhotoFiles(itemId: string): Promise<void> {
  await requireUserId();
  const { data, error } = await getSupabase()
    .from('item_photos')
    .select('storage_path')
    .eq('item_id', itemId);
  if (error) throw toError(error);

  await deleteFiles(data.map(({ storage_path }) => storage_path));
}

/** Addresses for stored files, in the order asked. A file that cannot be signed has none. */
async function sign(paths: readonly string[]): Promise<(string | null)[]> {
  if (paths.length === 0) return [];
  const { data, error } = await getSupabase()
    .storage.from(BUCKET)
    .createSignedUrls([...paths], ADDRESS_LIFETIME_SECONDS);
  if (error) throw toError(error);
  return data.map(({ signedUrl, error: failure }) => (failure ? null : signedUrl));
}

/** The stored photos of the rows given, each with its full and its small version. */
export async function showPhotos(rows: readonly PhotoRow[]): Promise<Map<string, StoredPhoto>> {
  const ordered = [...rows];
  const addresses = await sign(ordered.flatMap(({ storage_path }) => [storage_path, smallPath(storage_path)]));

  const shown = new Map<string, StoredPhoto>();
  ordered.forEach(({ id }, index) => {
    const full = addresses[index * 2];
    const small = addresses[index * 2 + 1];
    if (full && small) {
      shown.set(id, {
        id,
        full: { uri: full, cacheKey: id },
        small: { uri: small, cacheKey: `${id}-small` },
      });
    }
  });
  return shown;
}

/** The rows of an item's photos in their order, as the queries for items select them. */
export function inOrder(rows: readonly PhotoRow[]): PhotoRow[] {
  return [...rows].sort((first, second) => first.position - second.position);
}
