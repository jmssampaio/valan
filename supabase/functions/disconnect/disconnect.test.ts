import { assertEquals } from '@std/assert';

import type { PendingHandshake, StoredConnection } from '../_shared/connections/store.ts';
import { identify, memoryStore } from '../_shared/connections/testing.ts';
import { disconnect, type DisconnectServer } from './disconnect.ts';

function connection(userId: string, marketplace: 'discogs' | 'ebay'): StoredConnection {
  return {
    userId,
    marketplace,
    accessTokenEncrypted: 'v1.iv.sealed',
    tokenSecretEncrypted: null,
    refreshTokenEncrypted: null,
    expiresAt: null,
    accountName: `${userId}-on-${marketplace}`,
  };
}

function attempt(userId: string, marketplace: 'discogs' | 'ebay'): PendingHandshake {
  return {
    userId,
    marketplace,
    stateHash: `${userId}-${marketplace}`,
    handshakeEncrypted: 'v1.iv.sealed',
    expiresAt: '2026-11-20T12:10:00.000Z',
  };
}

function server() {
  const store = memoryStore();
  store.connections.push(connection('ana', 'discogs'), connection('ana', 'ebay'), connection('bob', 'discogs'));
  const reported: unknown[] = [];
  const it: DisconnectServer = { identify, store, reportFailure: (error) => void reported.push(error) };
  return { it, store, reported };
}

const request = { token: 'ana-token', marketplace: 'discogs' };
const accounts = (rows: readonly { userId: string; marketplace: string }[]) =>
  rows.map(({ userId, marketplace }) => `${userId}:${marketplace}`).sort();

Deno.test('disconnect: deletes the caller\'s connection to that marketplace, and no other', async () => {
  const { it, store } = server();

  assertEquals(await disconnect(it, request), { ok: true });

  assertEquals(accounts(store.connections), ['ana:ebay', 'bob:discogs']);
});

Deno.test('disconnect: also drops an attempt that was still pending', async () => {
  const { it, store } = server();
  store.handshakes.push(attempt('ana', 'discogs'), attempt('bob', 'discogs'));

  await disconnect(it, request);

  assertEquals(accounts(store.handshakes), ['bob:discogs']);
});

Deno.test('disconnect: succeeds when there was nothing connected', async () => {
  const { it, store } = server();

  await disconnect(it, request);

  assertEquals(await disconnect(it, request), { ok: true });
  assertEquals(accounts(store.connections), ['ana:ebay', 'bob:discogs']);
});

Deno.test('disconnect: refuses a caller who is not signed in, and deletes nothing', async () => {
  const { it, store } = server();

  assertEquals(await disconnect(it, { ...request, token: null }), { ok: false, reason: 'not_signed_in' });
  assertEquals(await disconnect(it, { ...request, token: 'forged' }), { ok: false, reason: 'not_signed_in' });
  assertEquals(store.connections.length, 3);
});

Deno.test('disconnect: refuses a marketplace Valan does not know', async () => {
  const { it, store } = server();

  for (const marketplace of ['reverb', '', 42, null, undefined, ['discogs']]) {
    assertEquals(await disconnect(it, { ...request, marketplace }), { ok: false, reason: 'unknown_marketplace' });
  }
  assertEquals(store.connections.length, 3);
});

Deno.test('disconnect: acts only for the seller the token belongs to, whoever the request names', async () => {
  const { it, store } = server();
  // A request body can say anything; whose connection it is comes from the token alone.
  const forged = { ...request, userId: 'bob', user_id: 'bob' };

  await disconnect(it, forged);

  assertEquals(accounts(store.connections), ['ana:ebay', 'bob:discogs']);
});

Deno.test('disconnect: fails, and reports it, when the connection cannot be deleted', async () => {
  const { it, store, reported } = server();
  store.deleteConnection = () => Promise.reject(new Error('the database is down'));

  assertEquals(await disconnect(it, request), { ok: false, reason: 'failed' });
  assertEquals(reported.length, 1);
});
