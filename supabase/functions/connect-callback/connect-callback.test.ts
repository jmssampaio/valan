import { assert, assertEquals, assertRejects } from '@std/assert';

import { hashState } from '../_shared/connections/state.ts';
import { fakeDiscogs, identify, memoryStore, NOW, testCipher } from '../_shared/connections/testing.ts';
import { ConnectorError } from '../_shared/connectors/types.ts';
import { createTokenCipher, TokenCipherError } from '../_shared/token-cipher.ts';
import { type ConnectStartServer, startConnection } from '../connect-start/connect-start.ts';
import { callbackRedirect, type ConnectCallbackServer, finishConnection } from './connect-callback.ts';

const CALLBACK = 'https://valan.test/functions/v1/connect-callback';
const APP = 'valan://connect';

/** One server for both steps, as in real life: what the first stores, the second finds. */
function server(overrides: Partial<ConnectCallbackServer> = {}) {
  const store = memoryStore();
  const discogs = fakeDiscogs();
  const reported: unknown[] = [];
  let now = NOW;

  const shared = {
    connector: (marketplace: string) => (marketplace === 'discogs' ? discogs : null),
    store,
    cipher: testCipher,
    now: () => now,
    reportFailure: (error: unknown) => void reported.push(error),
  };
  const starting: ConnectStartServer = { ...shared, identify, callbackUrl: () => CALLBACK };
  const it: ConnectCallbackServer = { ...shared, ...overrides };

  /** A seller starts connecting; the result is what the marketplace would send back. */
  async function sellerStarts(token = 'ana-token'): Promise<{ state: string; approved: Record<string, string> }> {
    const outcome = await startConnection(starting, { token, marketplace: 'discogs' });
    assert(outcome.ok, 'the connection should start');
    const state = new URL(outcome.authorizationUrl).searchParams.get('state') ?? '';
    return { state, approved: { state, code: 'approved' } };
  }

  return {
    it,
    store,
    discogs,
    reported,
    sellerStarts,
    minutesPass: (minutes: number) => {
      now = new Date(now.getTime() + minutes * 60_000);
    },
  };
}

Deno.test('connect-callback: connects the account of the seller who started', async () => {
  const { it, store, sellerStarts } = server();
  const { approved } = await sellerStarts();

  assertEquals(await finishConnection(it, approved), { result: 'connected', marketplace: 'discogs' });

  assertEquals(store.connections.length, 1);
  const [connection] = store.connections;
  assertEquals(connection.userId, 'ana');
  assertEquals(connection.marketplace, 'discogs');
  assertEquals(connection.accountName, 'fake-seller');
});

Deno.test('connect-callback: stores the token encrypted for that seller, marketplace and column', async () => {
  const { it, store, discogs, sellerStarts } = server();
  const { approved } = await sellerStarts();

  await finishConnection(it, approved);

  const cipher = await testCipher();
  const row = { userId: 'ana', marketplace: 'discogs' };
  const stored = store.connections[0].accessTokenEncrypted;
  const token = await cipher.decrypt(stored, { ...row, purpose: 'access_token' });

  // It is the token the marketplace issued: it works there.
  assertEquals(await discogs.listOffers({ accessToken: token }), []);
  assert(!JSON.stringify(store.connections).includes(token));
  await assertRejects(() => cipher.decrypt(stored, { ...row, userId: 'bob', purpose: 'access_token' }), TokenCipherError);
  await assertRejects(() => cipher.decrypt(stored, { ...row, purpose: 'token_secret' }), TokenCipherError);
});

Deno.test('connect-callback: encrypts every credential the marketplace gives, each for its own column', async () => {
  const { it, store, discogs, sellerStarts } = server();
  discogs.finishConnect = () =>
    Promise.resolve({
      credentials: {
        accessToken: 'the-access-token',
        tokenSecret: 'the-token-secret',
        refreshToken: 'the-refresh-token',
        expiresAt: '2026-11-20T14:00:00.000Z',
      },
      accountName: 'ana-records',
    });
  const { approved } = await sellerStarts();

  await finishConnection(it, approved);

  const cipher = await testCipher();
  const row = { userId: 'ana', marketplace: 'discogs' };
  const [connection] = store.connections;
  for (const secret of ['the-access-token', 'the-token-secret', 'the-refresh-token']) {
    assert(!JSON.stringify(connection).includes(secret));
  }
  assertEquals(await cipher.decrypt(connection.accessTokenEncrypted, { ...row, purpose: 'access_token' }), 'the-access-token');
  assertEquals(await cipher.decrypt(connection.tokenSecretEncrypted ?? '', { ...row, purpose: 'token_secret' }), 'the-token-secret');
  assertEquals(await cipher.decrypt(connection.refreshTokenEncrypted ?? '', { ...row, purpose: 'refresh_token' }), 'the-refresh-token');
  assertEquals(connection.expiresAt, '2026-11-20T14:00:00.000Z');
  assertEquals(connection.accountName, 'ana-records');
});

Deno.test('connect-callback: leaves empty what the marketplace does not use', async () => {
  const { it, store, sellerStarts } = server();
  const { approved } = await sellerStarts();

  await finishConnection(it, approved);

  const [connection] = store.connections;
  assertEquals(connection.tokenSecretEncrypted, null);
  assertEquals(connection.refreshTokenEncrypted, null);
  assertEquals(connection.expiresAt, null);
});

Deno.test('connect-callback: an attempt is deleted when it is used, and works only once', async () => {
  const { it, store, sellerStarts } = server();
  const { approved } = await sellerStarts();

  await finishConnection(it, approved);
  assertEquals(store.handshakes, []);
  const connected = structuredClone(store.connections);

  assertEquals(await finishConnection(it, approved), { result: 'failed', marketplace: null });
  assertEquals(store.connections, connected);
});

Deno.test('connect-callback: refuses a state nobody was given', async () => {
  const { it, store, sellerStarts } = server();
  await sellerStarts();

  const guesses: Record<string, string>[] = [
    { state: 'forged', code: 'approved' },
    { state: '', code: 'approved' },
    { code: 'approved' },
    {},
  ];
  for (const params of guesses) {
    assertEquals(await finishConnection(it, params), { result: 'failed', marketplace: null });
  }
  assertEquals(store.connections, []);
  // Ana's own attempt is untouched by the guesses.
  assertEquals(store.handshakes.length, 1);
});

Deno.test('connect-callback: the hash of a state is not the state', async () => {
  const { it, store, sellerStarts } = server();
  const { state } = await sellerStarts();

  // What a reader of the database would have.
  const fromTheDatabase = await hashState(state);

  assertEquals(await finishConnection(it, { state: fromTheDatabase, code: 'approved' }), {
    result: 'failed',
    marketplace: null,
  });
  assertEquals(store.connections, []);
});

Deno.test('connect-callback: refuses an attempt that expired, and deletes it', async () => {
  const { it, store, sellerStarts, minutesPass } = server();
  const { approved } = await sellerStarts();

  minutesPass(10);

  assertEquals(await finishConnection(it, approved), { result: 'failed', marketplace: 'discogs' });
  assertEquals(store.connections, []);
  assertEquals(store.handshakes, []);
});

Deno.test('connect-callback: accepts an attempt just before it expires', async () => {
  const { it, sellerStarts, minutesPass } = server();
  const { approved } = await sellerStarts();

  minutesPass(9.9);

  assertEquals((await finishConnection(it, approved)).result, 'connected');
});

Deno.test('connect-callback: a seller who refused is told so, and nothing is connected', async () => {
  const { it, store, sellerStarts } = server();
  const { state } = await sellerStarts();

  assertEquals(await finishConnection(it, { state, error: 'access_denied' }), {
    result: 'denied',
    marketplace: 'discogs',
  });
  assertEquals(store.connections, []);
  assertEquals(store.handshakes, []);
});

Deno.test('connect-callback: the account and the marketplace come from the attempt, whatever the callback says', async () => {
  const { it, store, sellerStarts } = server();
  const { approved } = await sellerStarts();

  const outcome = await finishConnection(it, {
    ...approved,
    user_id: 'bob',
    userId: 'bob',
    marketplace: 'ebay',
    account: 'someone-else',
  });

  assertEquals(outcome, { result: 'connected', marketplace: 'discogs' });
  assertEquals(store.connections.map(({ userId, marketplace }) => [userId, marketplace]), [['ana', 'discogs']]);
});

Deno.test('connect-callback: connecting again replaces the connection, it does not add one', async () => {
  const { it, store, sellerStarts } = server();
  await finishConnection(it, (await sellerStarts()).approved);
  const first = store.connections[0].accessTokenEncrypted;

  await finishConnection(it, (await sellerStarts()).approved);

  assertEquals(store.connections.length, 1);
  assert(store.connections[0].accessTokenEncrypted !== first);
});

Deno.test('connect-callback: two sellers connect without touching each other', async () => {
  const { it, store, sellerStarts } = server();
  const ana = await sellerStarts('ana-token');
  const bob = await sellerStarts('bob-token');

  await finishConnection(it, bob.approved);
  await finishConnection(it, ana.approved);

  assertEquals(store.connections.map(({ userId }) => userId).sort(), ['ana', 'bob']);
});

Deno.test('connect-callback: fails, and reports it, while the marketplace is down', async () => {
  const { it, store, discogs, reported, sellerStarts } = server();
  const { approved } = await sellerStarts();
  discogs.goOffline();

  assertEquals(await finishConnection(it, approved), { result: 'failed', marketplace: 'discogs' });
  assertEquals(store.connections, []);
  assert(reported[0] instanceof ConnectorError);
});

Deno.test('connect-callback: fails when the connection cannot be stored', async () => {
  const { it, store, reported, sellerStarts } = server();
  const { approved } = await sellerStarts();
  store.saveConnection = () => Promise.reject(new Error('the database is down'));

  assertEquals(await finishConnection(it, approved), { result: 'failed', marketplace: 'discogs' });
  assertEquals(reported.length, 1);
});

Deno.test('connect-callback: fails when the attempt cannot be read back (the key changed)', async () => {
  const otherKey = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
  const { it, store, sellerStarts } = server({
    cipher: () => createTokenCipher({ keys: { v1: otherKey }, current: 'v1' }),
  });
  const { approved } = await sellerStarts();

  assertEquals(await finishConnection(it, approved), { result: 'failed', marketplace: 'discogs' });
  assertEquals(store.connections, []);
});

Deno.test('connect-callback: fails for a marketplace whose keys this server no longer has', async () => {
  const { it, store, sellerStarts } = server({ connector: () => null });
  const { approved } = await sellerStarts();

  assertEquals(await finishConnection(it, approved), { result: 'failed', marketplace: 'discogs' });
  assertEquals(store.connections, []);
});

// The way back to the app -------------------------------------------------------------------

function callbackUrl(params: Record<string, string>): string {
  return `${CALLBACK}?${new URLSearchParams(params)}`;
}

Deno.test('connect-callback: sends the seller back to the app with the result and the marketplace', async () => {
  const { it, sellerStarts } = server();
  const { approved } = await sellerStarts();

  assertEquals(await callbackRedirect(it, callbackUrl(approved), APP), 'valan://connect?result=connected&marketplace=discogs');
});

Deno.test('connect-callback: says only that it failed when it cannot tell which attempt it was', async () => {
  const { it } = server();

  assertEquals(await callbackRedirect(it, callbackUrl({ state: 'forged' }), APP), 'valan://connect?result=failed');
  assertEquals(await callbackRedirect(it, CALLBACK, APP), 'valan://connect?result=failed');
});

Deno.test('connect-callback: tells the app when the seller refused', async () => {
  const { it, sellerStarts } = server();
  const { state } = await sellerStarts();

  assertEquals(
    await callbackRedirect(it, callbackUrl({ state, error: 'access_denied' }), APP),
    'valan://connect?result=denied&marketplace=discogs',
  );
});

Deno.test('connect-callback: never puts anything from the request in the address it redirects to', async () => {
  const allowed = new Set([
    'valan://connect?result=connected&marketplace=discogs',
    'valan://connect?result=denied&marketplace=discogs',
    'valan://connect?result=failed&marketplace=discogs',
    'valan://connect?result=failed',
  ]);
  const hostile: Record<string, string> = {
    redirect: 'https://evil.test/steal',
    redirect_uri: 'https://evil.test/steal',
    redirect_to: 'https://evil.test/steal',
    return_to: 'evil://take',
    next: '//evil.test',
    url: 'javascript:alert(1)',
    result: 'connected',
    marketplace: 'evil&result=connected',
    oauth_token: 'a-request-token',
    oauth_verifier: 'a-verifier',
    code: 'an-authorization-code',
    error: '"><script>alert(1)</script>',
    error_description: 'line one\r\nLocation: https://evil.test',
  };

  const { it, sellerStarts } = server();
  const { state } = await sellerStarts();
  const attempts = [
    hostile,
    { ...hostile, state: 'forged' },
    { ...hostile, state },
    { state: 'x\r\nLocation: https://evil.test' },
  ];

  for (const params of attempts) {
    const location = await callbackRedirect(it, callbackUrl(params), APP);

    assert(allowed.has(location), `unexpected redirect: ${location}`);
    for (const value of Object.values(params)) {
      assert(!location.includes(value) || value === 'connected', `the redirect repeats "${value}"`);
    }
  }
});

Deno.test('connect-callback: goes back to the app address this server was given, as it is', async () => {
  const { it, sellerStarts } = server();
  const { approved } = await sellerStarts();

  // Expo Go in development is reached at another address than the installed app.
  assertEquals(
    await callbackRedirect(it, callbackUrl(approved), 'exp://127.0.0.1:8081/--/connect'),
    'exp://127.0.0.1:8081/--/connect?result=connected&marketplace=discogs',
  );
});

Deno.test('connect-callback: still redirects to the app when everything goes wrong', async () => {
  const { it, sellerStarts } = server({
    cipher: () => Promise.reject(new Error('no key')),
  });
  const { approved } = await sellerStarts();

  const location = await callbackRedirect(it, callbackUrl(approved), APP);

  assert(location.startsWith('valan://connect?result=failed'));
});

Deno.test('connect-callback: a failure report never quotes what an attempt kept', async () => {
  const kept = 'request-token-secret-that-must-stay-secret';
  const real = await testCipher();
  const { it, reported, sellerStarts } = server({
    // An attempt whose content is not what we wrote: reading it fails, and the reason must not quote it.
    cipher: () => Promise.resolve({ encrypt: real.encrypt, decrypt: () => Promise.resolve(kept) }),
  });
  const { approved } = await sellerStarts();

  assertEquals(await finishConnection(it, approved), { result: 'failed', marketplace: 'discogs' });

  assertEquals(reported.length, 1);
  const error = reported[0];
  assert(error instanceof Error);
  assert(!`${error.message} ${error.stack} ${String(error.cause ?? '')}`.includes(kept.slice(0, 8)));
});

Deno.test('connect-callback: refuses an attempt whose expiry cannot be read', async () => {
  for (const expiresAt of ['infinity', '', 'not-a-date']) {
    const { it, store, sellerStarts } = server();
    const { approved } = await sellerStarts();
    store.handshakes[0] = { ...store.handshakes[0], expiresAt };

    assertEquals(await finishConnection(it, approved), { result: 'failed', marketplace: 'discogs' });
    assertEquals(store.connections, []);
  }
});

Deno.test('connect-callback: reports a refusal too, so one that was not the seller can be told apart', async () => {
  const { it, reported, sellerStarts } = server();
  const { state } = await sellerStarts();

  await finishConnection(it, { state, error: 'access_denied' });

  assertEquals(reported.length, 1);
  assert(reported[0] instanceof ConnectorError);
});
