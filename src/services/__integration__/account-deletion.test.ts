import { currentSession, deleteAccount, signIn } from '../auth';
import { saveDraft, type DraftItemFields } from '../drafts';
import { newItemId, newPhotoId } from '../ids';
import { listItems } from '../listings';
import { preparePhoto } from '../photo-files';
import { getSupabase } from '../supabase';

import {
  accountExistsAsServer,
  createConfirmedUser,
  listPhotoFilesAsServer,
  PASSWORD,
} from './local-stack';

// The device is the boundary here: its storage, its app state, and the native code that
// re-encodes a photo. The Supabase stack, with its storage and the function, is real.
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

type Seller = { id: string; email: string };

async function signInAs(seller: Seller) {
  await getSupabase().auth.signOut({ scope: 'local' });
  expect(await signIn(seller.email, PASSWORD)).toEqual({ ok: true });
}

/** Saves a draft with one photo for whoever is signed in. */
async function draftWithPhoto() {
  const item = draft();
  await saveDraft({ item, photos: [{ id: newPhotoId(), uri: 'file:///photo.jpg' }] });
  return item;
}

let alice: Seller;
let bob: Seller;

beforeEach(async () => {
  jest.mocked(preparePhoto).mockResolvedValue({ full: JPEG, small: JPEG });
  alice = await createConfirmedUser();
  bob = await createConfirmedUser();
});

afterEach(async () => {
  await getSupabase().auth.signOut({ scope: 'local' });
});

describe('deleting an account', () => {
  it('deletes the account, its items and its photo files, and ends the session', async () => {
    await signInAs(alice);
    const item = await draftWithPhoto();

    expect(await deleteAccount(PASSWORD)).toEqual({ ok: true });

    expect(await accountExistsAsServer(alice.id)).toBe(false);
    expect(await listPhotoFilesAsServer(alice.id, item.id)).toEqual([]);
    expect(await currentSession()).toBeNull();
  });

  it('leaves nothing to sign in to', async () => {
    await signInAs(alice);
    await deleteAccount(PASSWORD);

    expect(await signIn(alice.email, PASSWORD)).toEqual({ ok: false, failure: 'credentials' });
  });

  it('is refused with the wrong password, and deletes nothing', async () => {
    await signInAs(alice);
    const item = await draftWithPhoto();

    expect(await deleteAccount('outra frase longa errada')).toEqual({ ok: false, failure: 'credentials' });

    expect(await accountExistsAsServer(alice.id)).toBe(true);
    expect(await listPhotoFilesAsServer(alice.id, item.id)).toHaveLength(2);
    expect(await listItems()).toHaveLength(1);
    expect(await currentSession()).toMatchObject({ userId: alice.id });
  });

  it('leaves every other seller, their items and their photos untouched', async () => {
    await signInAs(bob);
    const bobItem = await draftWithPhoto();
    await signInAs(alice);
    await draftWithPhoto();

    await deleteAccount(PASSWORD);

    expect(await accountExistsAsServer(bob.id)).toBe(true);
    expect(await listPhotoFilesAsServer(bob.id, bobItem.id)).toHaveLength(2);
    await signInAs(bob);
    expect((await listItems()).map(({ id }) => id)).toEqual([bobItem.id]);
  });

  it('cannot delete another seller\'s account by naming it in the request', async () => {
    await signInAs(alice);
    const { data } = await getSupabase().auth.getSession();

    // Straight to the function, as an attacker would, with Alice's own token and password.
    const { API_URL } = { API_URL: process.env.EXPO_PUBLIC_SUPABASE_URL };
    const response = await fetch(`${API_URL}/functions/v1/delete-account`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${data.session?.access_token}`,
        apikey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password: PASSWORD, userId: bob.id, user_id: bob.id, id: bob.id }),
    });

    expect(response.status).toBe(200);
    expect(await accountExistsAsServer(bob.id)).toBe(true);
    expect(await accountExistsAsServer(alice.id)).toBe(false);
  });

  it('is refused for someone who is not signed in', async () => {
    expect(await deleteAccount(PASSWORD)).toEqual({ ok: false, failure: 'unknown' });
    expect(await accountExistsAsServer(alice.id)).toBe(true);
  });

  it('is refused by the server without a session token', async () => {
    const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/delete-account`, {
      method: 'POST',
      headers: {
        apikey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password: PASSWORD }),
    });

    expect(response.status).toBe(401);
  });
});
