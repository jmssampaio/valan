import { assert, assertEquals, assertNotEquals, assertRejects } from '@std/assert';

import { hashState } from '../_shared/connections/state.ts';
import { fakeDiscogs, identify, memoryStore, NOW, testCipher } from '../_shared/connections/testing.ts';
import { ConnectorError } from '../_shared/connectors/types.ts';
import { TokenCipherError } from '../_shared/token-cipher.ts';
import { type ConnectStartServer, startConnection } from './connect-start.ts';

const CALLBACK = 'https://valan.test/functions/v1/connect-callback';

function server(overrides: Partial<ConnectStartServer> = {}) {
  const store = memoryStore();
  const discogs = fakeDiscogs();
  const reported: unknown[] = [];
  const it: ConnectStartServer = {
    identify,
    // Only Discogs has its keys on this server.
    connector: (marketplace) => (marketplace === 'discogs' ? discogs : null),
    store,
    cipher: testCipher,
    callbackUrl: () => CALLBACK,
    now: () => NOW,
    reportFailure: (error) => void reported.push(error),
    ...overrides,
  };
  return { it, store, discogs, reported };
}

const request = { token: 'ana-token', marketplace: 'discogs' };

/** The state the marketplace was given; the fake carries it in its authorization address. */
function stateIn(authorizationUrl: string): string {
  const state = new URL(authorizationUrl).searchParams.get('state');
  assert(state, 'the authorization address carries the state');
  return state;
}

async function start(it: ConnectStartServer, with_ = request): Promise<string> {
  const outcome = await startConnection(it, with_);
  assert(outcome.ok, 'the connection should start');
  return outcome.authorizationUrl;
}

Deno.test('connect-start: answers with the address where the seller approves access', async () => {
  const { it } = server();

  const url = new URL(await start(it));

  assertEquals(url.origin, 'https://fake-marketplace.test');
  // The marketplace is told to send the seller back to our callback, and nowhere else.
  assertEquals(url.searchParams.get('redirect_uri'), CALLBACK);
});

Deno.test('connect-start: refuses a caller who is not signed in, and asks the marketplace nothing', async () => {
  const { it, store } = server({
    connector: () => {
      throw new Error('the marketplace must not be reached');
    },
  });

  assertEquals(await startConnection(it, { ...request, token: null }), { ok: false, reason: 'not_signed_in' });
  assertEquals(await startConnection(it, { ...request, token: 'forged' }), { ok: false, reason: 'not_signed_in' });
  assertEquals(store.handshakes, []);
});

Deno.test('connect-start: refuses a marketplace Valan does not know', async () => {
  const { it, store } = server();

  for (const marketplace of ['reverb', '', 'DISCOGS', 42, null, undefined, {}, ['discogs'], '__proto__']) {
    assertEquals(await startConnection(it, { ...request, marketplace }), {
      ok: false,
      reason: 'unknown_marketplace',
    });
  }
  assertEquals(store.handshakes, []);
});

Deno.test('connect-start: is unavailable for a marketplace whose keys this server lacks', async () => {
  const { it, store } = server();

  assertEquals(await startConnection(it, { ...request, marketplace: 'ebay' }), { ok: false, reason: 'unavailable' });
  assertEquals(store.handshakes, []);
});

Deno.test('connect-start: keeps the attempt for the seller who asked, for ten minutes', async () => {
  const { it, store } = server();

  await start(it);

  assertEquals(store.handshakes.length, 1);
  const [attempt] = store.handshakes;
  assertEquals(attempt.userId, 'ana');
  assertEquals(attempt.marketplace, 'discogs');
  assertEquals(attempt.expiresAt, '2026-11-20T12:10:00.000Z');
});

Deno.test('connect-start: stores only the hash of the state', async () => {
  const { it, store } = server();

  const state = stateIn(await start(it));

  assertEquals(store.handshakes[0].stateHash, await hashState(state));
  assert(!JSON.stringify(store.handshakes).includes(state));
});

Deno.test('connect-start: uses a new, long state for every attempt', async () => {
  const { it } = server();

  const first = stateIn(await start(it));
  const second = stateIn(await start(it, { token: 'bob-token', marketplace: 'discogs' }));

  assertNotEquals(first, second);
  assert(first.length >= 43, 'at least 32 random bytes');
});

Deno.test('connect-start: encrypts what the connector asked to keep, for that seller and marketplace', async () => {
  const { it, store } = server();
  const state = stateIn(await start(it));
  const cipher = await testCipher();
  const stored = store.handshakes[0].handshakeEncrypted;

  // The fake's handshake is its state; a real one holds a request-token secret.
  assert(!stored.includes(state));
  assertEquals(
    JSON.parse(await cipher.decrypt(stored, { userId: 'ana', marketplace: 'discogs', purpose: 'handshake' })),
    { state },
  );
  await assertRejects(
    () => cipher.decrypt(stored, { userId: 'bob', marketplace: 'discogs', purpose: 'handshake' }),
    TokenCipherError,
  );
  await assertRejects(
    () => cipher.decrypt(stored, { userId: 'ana', marketplace: 'ebay', purpose: 'handshake' }),
    TokenCipherError,
  );
});

Deno.test('connect-start: starting again replaces the attempt that was pending', async () => {
  const { it, store } = server();

  await start(it);
  const state = stateIn(await start(it));

  assertEquals(store.handshakes.length, 1);
  assertEquals(store.handshakes[0].stateHash, await hashState(state));
});

Deno.test('connect-start: each seller has their own attempt', async () => {
  const { it, store } = server();

  await start(it);
  await start(it, { token: 'bob-token', marketplace: 'discogs' });

  assertEquals(store.handshakes.map(({ userId }) => userId).sort(), ['ana', 'bob']);
});

Deno.test('connect-start: clears the attempts that expired, whoever they belonged to', async () => {
  const { it, store } = server();
  const old = { marketplace: 'discogs' as const, handshakeEncrypted: 'v1.x.y' };
  store.handshakes.push(
    { ...old, userId: 'bob', stateHash: 'expired', expiresAt: '2026-11-20T11:59:59.000Z' },
    { ...old, userId: 'carla', stateHash: 'still-good', expiresAt: '2026-11-20T12:05:00.000Z' },
  );

  await start(it);

  assertEquals(store.handshakes.map(({ userId }) => userId).sort(), ['ana', 'carla']);
});

Deno.test('connect-start: still starts when the clearing fails, and reports it', async () => {
  const { it, store, reported } = server();
  store.deleteExpiredHandshakes = () => Promise.reject(new Error('the database is busy'));

  await start(it);

  assertEquals(store.handshakes.length, 1);
  assertEquals(reported.length, 1);
});

Deno.test('connect-start: is unavailable while the marketplace is down, and keeps nothing', async () => {
  const { it, store, discogs, reported } = server();
  discogs.goOffline();

  assertEquals(await startConnection(it, request), { ok: false, reason: 'unavailable' });
  assertEquals(store.handshakes, []);
  assert(reported[0] instanceof ConnectorError);
});

Deno.test('connect-start: fails without an address when the attempt cannot be kept', async () => {
  const { it, store, reported } = server();
  store.saveHandshake = () => Promise.reject(new Error('the database is down'));

  assertEquals(await startConnection(it, request), { ok: false, reason: 'failed' });
  assertEquals(reported.length, 1);
});

Deno.test('connect-start: fails without an address when the encryption key is missing', async () => {
  const { it, store } = server({
    cipher: () => Promise.reject(new TokenCipherError('There is no encryption key.')),
  });

  assertEquals(await startConnection(it, request), { ok: false, reason: 'failed' });
  assertEquals(store.handshakes, []);
});

Deno.test('connect-start: fails, asking the marketplace nothing, when it has no address to be sent back to', async () => {
  const { it, store, discogs, reported } = server({
    callbackUrl: () => {
      throw new Error('CONNECT_CALLBACK_URL must be https.');
    },
  });
  let asked = false;
  discogs.startConnect = () => {
    asked = true;
    return Promise.reject(new Error('the marketplace must not be reached'));
  };

  assertEquals(await startConnection(it, request), { ok: false, reason: 'failed' });
  assertEquals(asked, false);
  assertEquals(store.handshakes, []);
  assertEquals(reported.length, 1);
});
