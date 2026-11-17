import { signIn } from '../auth';
import { saveDraft, type DraftItemFields } from '../drafts';
import { newItemId } from '../ids';
import { deleteDraft, getListingDetail } from '../listing-detail';
import { listItems } from '../listings';
import { getSupabase } from '../supabase';

import { createConfirmedUser, createListingAsServer, PASSWORD } from './local-stack';

// The device is the boundary here (its storage, its app state); the Supabase stack is real.
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

function draft(overrides: Partial<DraftItemFields> = {}): DraftItemFields {
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
    ...overrides,
  };
}

type Seller = { id: string; email: string };

async function signInAs(seller: Seller) {
  await getSupabase().auth.signOut({ scope: 'local' });
  expect(await signIn(seller.email, PASSWORD)).toEqual({ ok: true });
}

let alice: Seller;
let bob: Seller;

beforeEach(async () => {
  alice = await createConfirmedUser();
  bob = await createConfirmedUser();
});

afterEach(async () => {
  await getSupabase().auth.signOut({ scope: 'local' });
});

describe('listing items', () => {
  it('lists nothing for a new account', async () => {
    await signInAs(alice);

    expect(await listItems()).toEqual([]);
  });

  it('never shows one seller the items of another', async () => {
    await signInAs(alice);
    const { id: aliceItem } = await saveDraft({ item: draft({ title: 'Alice record' }), photos: [] });
    await signInAs(bob);
    const { id: bobItem } = await saveDraft({ item: draft({ title: 'Bob record' }), photos: [] });

    expect((await listItems()).map(({ id }) => id)).toEqual([bobItem]);
    await signInAs(alice);
    expect((await listItems()).map(({ id }) => id)).toEqual([aliceItem]);
  });

  it('lists the newest item first, each with its listings', async () => {
    await signInAs(alice);
    const first = await saveDraft({ item: draft({ title: 'First' }), photos: [] });
    const second = await saveDraft({ item: draft({ title: 'Second' }), photos: [] });
    await createListingAsServer({ itemId: first.id, userId: alice.id, marketplace: 'discogs', status: 'published' });

    const items = await listItems();

    expect(items.map(({ title }) => title)).toEqual(['Second', 'First']);
    expect(items[1].listings).toEqual([
      expect.objectContaining({ marketplace: 'discogs', status: 'published' }),
    ]);
    expect(items[0].listings).toEqual([]);
    expect(second.id).toBe(items[0].id);
  });

  it('refuses to list for someone who is not signed in', async () => {
    await expect(listItems()).rejects.toThrow();
  });
});

describe('saving a draft', () => {
  it('stores the item as a draft owned by the seller, under the id the device gave it', async () => {
    await signInAs(alice);
    const item = draft({ price_minor: 2800, accepts_offers: true, description: 'Primeira edição.' });

    const { id } = await saveDraft({ item, photos: [] });

    expect(id).toBe(item.id);
    const [saved] = await listItems();
    expect(saved).toMatchObject({ ...item, user_id: alice.id, status: 'draft' });
  });

  it('updates the same row when the draft is saved again, never a second one', async () => {
    await signInAs(alice);
    const item = draft();
    await saveDraft({ item, photos: [] });

    await saveDraft({ item: { ...item, title: 'Noites de Lisboa (promo)', price_minor: 3000 }, photos: [] });

    const items = await listItems();
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ title: 'Noites de Lisboa (promo)', price_minor: 3000 });
  });

  it('cannot overwrite an item that belongs to another seller', async () => {
    await signInAs(alice);
    const item = draft({ title: 'Alice record' });
    await saveDraft({ item, photos: [] });

    await signInAs(bob);
    await expect(saveDraft({ item: { ...item, title: 'Hijacked' }, photos: [] })).rejects.toThrow();

    await signInAs(alice);
    expect((await listItems())[0].title).toBe('Alice record');
  });

  it('refuses to save for someone who is not signed in', async () => {
    await expect(saveDraft({ item: draft(), photos: [] })).rejects.toThrow();
  });
});

describe('the detail of an item', () => {
  it('shows a seller their own item', async () => {
    await signInAs(alice);
    const { id } = await saveDraft({ item: draft(), photos: [] });

    expect(await getListingDetail(id)).toMatchObject({
      item: { id, title: 'Noites de Lisboa', status: 'draft' },
      listings: [],
      offers: [],
      sale: null,
    });
  });

  it('answers as if the item did not exist for another seller', async () => {
    await signInAs(alice);
    const { id } = await saveDraft({ item: draft(), photos: [] });

    await signInAs(bob);

    expect(await getListingDetail(id)).toBeNull();
  });

  it('answers the same for an id that names nothing', async () => {
    await signInAs(alice);

    expect(await getListingDetail(newItemId())).toBeNull();
  });

  it('leaves out a listing that was removed from its marketplace', async () => {
    await signInAs(alice);
    const { id } = await saveDraft({ item: draft(), photos: [] });
    await createListingAsServer({ itemId: id, userId: alice.id, marketplace: 'discogs', status: 'published' });
    await createListingAsServer({ itemId: id, userId: alice.id, marketplace: 'ebay', status: 'removed' });

    const detail = await getListingDetail(id);

    expect(detail?.listings.map(({ marketplace }) => marketplace)).toEqual(['discogs']);
  });
});

describe('deleting a draft', () => {
  it('deletes the seller\'s own draft', async () => {
    await signInAs(alice);
    const { id } = await saveDraft({ item: draft(), photos: [] });

    await deleteDraft(id);

    expect(await listItems()).toEqual([]);
  });

  it('cannot delete the draft of another seller, and says it failed', async () => {
    await signInAs(alice);
    const { id } = await saveDraft({ item: draft(), photos: [] });

    await signInAs(bob);
    await expect(deleteDraft(id)).rejects.toThrow();

    await signInAs(alice);
    expect(await listItems()).toHaveLength(1);
  });
});
