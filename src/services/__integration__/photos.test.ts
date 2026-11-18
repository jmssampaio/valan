import { signIn } from '../auth';
import { saveDraft, type DraftItemFields } from '../drafts';
import { newItemId, newPhotoId } from '../ids';
import { deleteDraft, getListingDetail } from '../listing-detail';
import { listItems } from '../listings';
import { preparePhoto } from '../photo-files';
import { getSupabase } from '../supabase';

import { createConfirmedUser, listPhotoFilesAsServer, PASSWORD } from './local-stack';

// The device is the boundary here: its storage, its app state, and the native code that
// re-encodes a photo. The Supabase stack, with its storage, is real.
jest.mock('react-native', () => ({
  AppState: { currentState: 'active', addEventListener: () => ({ remove: () => {} }) },
}));
jest.mock('../session-storage', () => {
  const values = new Map<string, string>();
  return {
    sessionStorage: {
      getItem: async (key: string) => values.get(key) ?? null,
      setItem: async (key: string, value: string) => void values.set(key, value),
      removeItem: async (key: string) => void values.delete(key),
    },
  };
});
jest.mock('../photo-files');

// A real, tiny JPEG: the bucket accepts nothing else.
const JPEG = Uint8Array.from(
  atob(
    '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/yQALCAABAAEBAREA/8wABgAQEAX/2gAIAQEAAD8A0s8g/9k=',
  ),
  (character) => character.charCodeAt(0),
).buffer;

function draft(): DraftItemFields {
  return {
    id: newItemId(),
    type: 'record',
    title: 'Noites de Lisboa',
    artist: 'Os Marés',
    discogs_release_id: 249504,
    format: 'LP, Album',
    release_year: 1978,
    media_condition: 'VG+',
    sleeve_condition: null,
    equipment_condition: null,
    description: null,
    price_minor: null,
    currency: 'EUR',
    accepts_offers: false,
  };
}

/** Photos as the picker hands them over: an id and where the file is on the device. */
function picked(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: newPhotoId(),
    uri: `file:///photo-${index + 1}.jpg`,
  }));
}

type Seller = { id: string; email: string };

async function signInAs(seller: Seller) {
  await getSupabase().auth.signOut({ scope: 'local' });
  expect(await signIn(seller.email, PASSWORD)).toEqual({ ok: true });
}

async function fetched(address: string) {
  const response = await fetch(address);
  return { status: response.status, type: response.headers.get('content-type') };
}

let alice: Seller;
let bob: Seller;

beforeEach(async () => {
  jest.clearAllMocks();
  jest.mocked(preparePhoto).mockResolvedValue({ full: JPEG, small: JPEG });
  alice = await createConfirmedUser();
  bob = await createConfirmedUser();
  await signInAs(alice);
});

afterEach(async () => {
  await getSupabase().auth.signOut({ scope: 'local' });
});

describe('saving a draft with photos', () => {
  it('stores each photo, full and small, under the seller and the item', async () => {
    const item = draft();
    const photos = picked(2);

    expect(await saveDraft({ item, photos })).toEqual({ id: item.id, photosFailed: 0 });

    expect(await listPhotoFilesAsServer(alice.id, item.id)).toEqual(
      photos.flatMap(({ id }) => [`${id}-small.jpg`, `${id}.jpg`]).sort(),
    );
  });

  it('gives the photos back in the order the seller added them', async () => {
    const item = draft();
    const photos = picked(3);
    await saveDraft({ item, photos });

    const detail = await getListingDetail(item.id);

    expect(detail?.photos.map(({ id }) => id)).toEqual(photos.map(({ id }) => id));
  });

  it('shows the stored photos through addresses that work, with a key that does not change', async () => {
    const item = draft();
    const [photo] = picked(1);
    await saveDraft({ item, photos: [photo] });

    const first = (await getListingDetail(item.id))?.photos[0];
    const again = (await getListingDetail(item.id))?.photos[0];

    expect(await fetched(first?.full.uri ?? '')).toEqual({ status: 200, type: 'image/jpeg' });
    expect(await fetched(first?.small.uri ?? '')).toEqual({ status: 200, type: 'image/jpeg' });
    expect(first?.full.cacheKey).toBe(photo.id);
    expect(first?.small.cacheKey).toBe(`${photo.id}-small`);
    expect(again?.full.cacheKey).toBe(first?.full.cacheKey);
  });

  it('shows the small version of the first photo in the listings, and the full one on the item', async () => {
    const item = draft();
    const photos = picked(2);
    await saveDraft({ item, photos });

    const [listed] = await listItems();
    const detail = await getListingDetail(item.id);

    expect(listed.photo).toMatchObject({ cacheKey: `${photos[0].id}-small` });
    expect(detail?.item.photo).toMatchObject({ cacheKey: photos[0].id });
  });

  it('shows no photo for an item that has none', async () => {
    const item = draft();
    await saveDraft({ item, photos: [] });

    expect((await listItems())[0].photo).toBeNull();
    expect((await getListingDetail(item.id))?.photos).toEqual([]);
  });

  it('uploads nothing twice when the same draft is saved again', async () => {
    const item = draft();
    const photos = picked(2);
    await saveDraft({ item, photos });
    jest.mocked(preparePhoto).mockClear();

    await saveDraft({ item, photos: [...photos, ...picked(1)] });

    expect(preparePhoto).toHaveBeenCalledTimes(1);
    expect((await getListingDetail(item.id))?.photos).toHaveLength(3);
  });

  it('removes a photo the seller took out, and its files, and closes the gap in the order', async () => {
    const item = draft();
    const [first, second, third] = picked(3);
    await saveDraft({ item, photos: [first, second, third] });

    await saveDraft({ item, photos: [first, third] });

    expect((await getListingDetail(item.id))?.photos.map(({ id }) => id)).toEqual([first.id, third.id]);
    expect(await listPhotoFilesAsServer(alice.id, item.id)).not.toContain(`${second.id}.jpg`);
    expect(await listPhotoFilesAsServer(alice.id, item.id)).not.toContain(`${second.id}-small.jpg`);
  });

  it('saves the item and the other photos when one photo cannot be prepared, and counts it', async () => {
    const item = draft();
    const [good, bad] = picked(2);
    jest
      .mocked(preparePhoto)
      .mockImplementation(async (uri) =>
        uri === bad.uri ? Promise.reject(new Error('unreadable')) : { full: JPEG, small: JPEG },
      );

    expect(await saveDraft({ item, photos: [good, bad] })).toEqual({ id: item.id, photosFailed: 1 });

    expect((await getListingDetail(item.id))?.photos.map(({ id }) => id)).toEqual([good.id]);
  });

  it('is refused a ninth photo by the database', async () => {
    await expect(saveDraft({ item: draft(), photos: picked(9) })).rejects.toThrow();
  });

  it('accepts only JPEG files', async () => {
    const item = draft();
    jest.mocked(preparePhoto).mockResolvedValue({ full: JPEG, small: JPEG });
    const [photo] = picked(1);
    const path = `${alice.id}/${item.id}/${photo.id}.png`;

    const { error } = await getSupabase()
      .storage.from('item-photos')
      .upload(path, JPEG, { contentType: 'image/png' });

    expect(error).not.toBeNull();
  });
});

describe('the photos of another seller', () => {
  async function aliceItemWithPhoto() {
    const item = draft();
    const [photo] = picked(1);
    await saveDraft({ item, photos: [photo] });
    return { item, path: `${alice.id}/${item.id}/${photo.id}.jpg` };
  }

  it('cannot be read', async () => {
    const { path } = await aliceItemWithPhoto();
    await signInAs(bob);

    const download = await getSupabase().storage.from('item-photos').download(path);
    const signed = await getSupabase().storage.from('item-photos').createSignedUrl(path, 60);

    expect(download.data).toBeNull();
    expect(signed.data).toBeNull();
  });

  it('cannot be listed', async () => {
    const { item } = await aliceItemWithPhoto();
    await signInAs(bob);

    const { data } = await getSupabase().storage.from('item-photos').list(`${alice.id}/${item.id}`);

    expect(data ?? []).toEqual([]);
  });

  it('cannot be deleted', async () => {
    const { item, path } = await aliceItemWithPhoto();
    await signInAs(bob);

    await getSupabase().storage.from('item-photos').remove([path]);

    expect(await listPhotoFilesAsServer(alice.id, item.id)).toHaveLength(2);
  });

  it('cannot be overwritten, and nothing can be put in their folder', async () => {
    const { item, path } = await aliceItemWithPhoto();
    await signInAs(bob);
    const storage = getSupabase().storage.from('item-photos');

    const overwrite = await storage.upload(path, JPEG, { contentType: 'image/jpeg', upsert: true });
    const planted = await storage.upload(`${alice.id}/${item.id}/planted.jpg`, JPEG, {
      contentType: 'image/jpeg',
    });

    expect(overwrite.error).not.toBeNull();
    expect(planted.error).not.toBeNull();
    expect(await listPhotoFilesAsServer(alice.id, item.id)).toHaveLength(2);
  });

  it('cannot be reached by someone who is not signed in', async () => {
    const { path } = await aliceItemWithPhoto();
    await getSupabase().auth.signOut({ scope: 'local' });

    const { data } = await getSupabase().storage.from('item-photos').download(path);

    expect(data).toBeNull();
  });

  it('do not show up in a seller\'s own listings', async () => {
    await aliceItemWithPhoto();
    await signInAs(bob);

    expect(await listItems()).toEqual([]);
  });
});

describe('a stored photo', () => {
  it('cannot be overwritten even by its owner', async () => {
    const item = draft();
    const [photo] = picked(1);
    await saveDraft({ item, photos: [photo] });

    const { error } = await getSupabase()
      .storage.from('item-photos')
      .upload(`${alice.id}/${item.id}/${photo.id}.jpg`, JPEG, { contentType: 'image/jpeg', upsert: true });

    expect(error).not.toBeNull();
  });
});

describe('deleting a draft with photos', () => {
  it('removes its files', async () => {
    const item = draft();
    await saveDraft({ item, photos: picked(2) });

    await deleteDraft(item.id);

    expect(await listPhotoFilesAsServer(alice.id, item.id)).toEqual([]);
    expect(await listItems()).toEqual([]);
  });

  it('leaves the files of another seller\'s draft where they are', async () => {
    const item = draft();
    await saveDraft({ item, photos: picked(1) });

    await signInAs(bob);
    await expect(deleteDraft(item.id)).rejects.toThrow();

    expect(await listPhotoFilesAsServer(alice.id, item.id)).toHaveLength(2);
  });
});
