// The connection functions as they are deployed, over HTTP on the local stack. Nothing here
// reaches a marketplace: the calls stop before one would be asked, and eBay has no
// connector to ask.
import { signIn } from '../auth';
import { getSupabase } from '../supabase';

import {
  countHandshakesAsServer,
  createConfirmedUser,
  createConnectionAsServer,
  deleteUserAsServer,
  listConnectedMarketplacesAsServer,
  PASSWORD,
  signedTokenOfNobody,
} from './local-stack';

// The device is the boundary here: its storage and its app state.
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

type Seller = { id: string; email: string };

const functionUrl = (name: string) => `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/${name}`;
const apikey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

/** The session token of a seller, as the app would send it. */
async function tokenOf(seller: Seller): Promise<string> {
  await getSupabase().auth.signOut({ scope: 'local' });
  expect(await signIn(seller.email, PASSWORD)).toEqual({ ok: true });
  const { data } = await getSupabase().auth.getSession();
  return data.session?.access_token ?? '';
}

function post(name: string, body: unknown, token?: string): Promise<Response> {
  return fetch(functionUrl(name), {
    method: 'POST',
    headers: {
      apikey,
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

/** A browser arriving at the callback from another site: no session, no key. */
function arriveAtCallback(query: Record<string, string>): Promise<Response> {
  return fetch(`${functionUrl('connect-callback')}?${new URLSearchParams(query)}`, { redirect: 'manual' });
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

describe('starting a connection', () => {
  it('is refused without a session token', async () => {
    const response = await post('connect-start', { marketplace: 'ebay' });

    expect(response.status).toBe(401);
  });

  it('is refused with a token that is not a session', async () => {
    const response = await post('connect-start', { marketplace: 'ebay' }, 'not-a-session-token');

    expect(response.status).toBe(401);
  });

  it('is refused by the function itself for a signed token that is nobody\'s session', async () => {
    // The gateway lets this one through, so the answer is the function\'s own.
    const response = await post('connect-start', { marketplace: 'ebay' }, signedTokenOfNobody());

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ reason: 'not_signed_in' });
  });

  it('is refused for the token of an account that no longer exists', async () => {
    const token = await tokenOf(alice);
    await deleteUserAsServer(alice.id);

    const response = await post('connect-start', { marketplace: 'ebay' }, token);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ reason: 'not_signed_in' });
  });

  it('is refused for a marketplace Valan does not know', async () => {
    const token = await tokenOf(alice);

    for (const marketplace of ['reverb', '', 42, null]) {
      const response = await post('connect-start', { marketplace }, token);

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ reason: 'unknown_marketplace' });
    }
    expect(await countHandshakesAsServer(alice.id)).toBe(0);
  });

  it('says a marketplace is unavailable while the server has no keys for it', async () => {
    const response = await post('connect-start', { marketplace: 'ebay' }, await tokenOf(alice));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ reason: 'unavailable' });
    expect(await countHandshakesAsServer(alice.id)).toBe(0);
  });

  it('answers only to POST', async () => {
    const response = await fetch(functionUrl('connect-start'), {
      headers: { apikey, Authorization: `Bearer ${await tokenOf(alice)}` },
    });

    expect(response.status).toBe(405);
  });
});

describe('coming back from a marketplace', () => {
  it('needs no session, and always answers with a redirect to the app', async () => {
    const response = await arriveAtCallback({ state: 'a-state-nobody-was-given', oauth_verifier: 'x' });

    expect(response.status).toBe(302);
    const location = response.headers.get('Location') ?? '';
    expect(location).toMatch(/\?result=failed$/);
    expect(location.startsWith('http')).toBe(false);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('never repeats what the request carried in the redirect', async () => {
    const hostile = {
      state: 'forged-state',
      redirect: 'https://evil.test/steal',
      redirect_uri: 'https://evil.test/steal',
      next: '//evil.test',
      result: 'connected',
      marketplace: 'discogs&result=connected',
      oauth_token: 'a-request-token',
      oauth_verifier: 'a-verifier',
    };

    const response = await arriveAtCallback(hostile);

    const location = response.headers.get('Location') ?? '';
    expect(response.status).toBe(302);
    expect(location).toMatch(/\?result=failed$/);
    for (const value of ['evil.test', 'forged-state', 'a-request-token', 'a-verifier', 'connected', 'discogs']) {
      expect(location).not.toContain(value);
    }
  });

  it('connects nothing for a state nobody was given', async () => {
    await arriveAtCallback({ state: 'a-state-nobody-was-given', code: 'approved' });

    expect(await listConnectedMarketplacesAsServer(alice.id)).toEqual([]);
  });

  it('answers only to GET', async () => {
    const response = await fetch(functionUrl('connect-callback'), { method: 'POST', redirect: 'manual' });

    expect(response.status).toBe(405);
  });
});

describe('disconnecting', () => {
  beforeEach(async () => {
    await createConnectionAsServer({ userId: alice.id, marketplace: 'discogs', accountName: 'alice-records' });
    await createConnectionAsServer({ userId: alice.id, marketplace: 'ebay', accountName: 'alice-ebay' });
    await createConnectionAsServer({ userId: bob.id, marketplace: 'discogs', accountName: 'bob-records' });
  });

  it('deletes the caller\'s connection to that marketplace, and no other', async () => {
    const response = await post('disconnect', { marketplace: 'discogs' }, await tokenOf(alice));

    expect(response.status).toBe(200);
    expect(await listConnectedMarketplacesAsServer(alice.id)).toEqual(['ebay']);
    expect(await listConnectedMarketplacesAsServer(bob.id)).toEqual(['discogs']);
  });

  it('can be asked twice', async () => {
    const token = await tokenOf(alice);
    await post('disconnect', { marketplace: 'discogs' }, token);

    const again = await post('disconnect', { marketplace: 'discogs' }, token);

    expect(again.status).toBe(200);
  });

  it('cannot disconnect another seller by naming them in the request', async () => {
    const response = await post(
      'disconnect',
      { marketplace: 'discogs', userId: bob.id, user_id: bob.id, id: bob.id },
      await tokenOf(alice),
    );

    expect(response.status).toBe(200);
    expect(await listConnectedMarketplacesAsServer(bob.id)).toEqual(['discogs']);
    expect(await listConnectedMarketplacesAsServer(alice.id)).toEqual(['ebay']);
  });

  it('is refused without a session token, and deletes nothing', async () => {
    const response = await post('disconnect', { marketplace: 'discogs' });

    expect(response.status).toBe(401);
    expect(await listConnectedMarketplacesAsServer(alice.id)).toEqual(['discogs', 'ebay']);
  });

  it('is refused by the function itself for a signed token that is nobody\'s session', async () => {
    const response = await post('disconnect', { marketplace: 'discogs' }, signedTokenOfNobody());

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ reason: 'not_signed_in' });
    expect(await listConnectedMarketplacesAsServer(alice.id)).toEqual(['discogs', 'ebay']);
    expect(await listConnectedMarketplacesAsServer(bob.id)).toEqual(['discogs']);
  });

  it('is refused for a marketplace Valan does not know', async () => {
    const response = await post('disconnect', { marketplace: 'reverb' }, await tokenOf(alice));

    expect(response.status).toBe(400);
    expect(await listConnectedMarketplacesAsServer(alice.id)).toEqual(['discogs', 'ebay']);
  });

  it('leaves the app unable to read what a connection keeps', async () => {
    await tokenOf(alice);

    const tokens = await getSupabase().from('platform_connections').select('access_token_encrypted, token_secret_encrypted');
    const attempts = await getSupabase().from('connection_handshakes').select('id');
    const own = await getSupabase().from('platform_connections').select('marketplace, external_username').order('marketplace');

    expect(tokens.error).not.toBeNull();
    expect(attempts.error).not.toBeNull();
    expect(own.data).toEqual([
      { marketplace: 'ebay', external_username: 'alice-ebay' },
      { marketplace: 'discogs', external_username: 'alice-records' },
    ]);
  });
});
