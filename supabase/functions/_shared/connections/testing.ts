// Stand-ins for the tests of the connection functions: a store that lives in memory, a
// cipher with a throwaway key, and a seller the server recognises by her token.

import { createFakeConnector, type FakeConnector } from '../connectors/fake.ts';
import type { Marketplace } from '../connectors/types.ts';
import { createTokenCipher, type TokenCipher } from '../token-cipher.ts';
import type { ConnectionStore, PendingHandshake, StoredConnection } from './store.ts';

export interface MemoryStore extends ConnectionStore {
  readonly handshakes: PendingHandshake[];
  readonly connections: StoredConnection[];
}

export function memoryStore(): MemoryStore {
  const handshakes: PendingHandshake[] = [];
  const connections: StoredConnection[] = [];

  const remove = <Row>(rows: Row[], matches: (row: Row) => boolean): Row[] => {
    const removed = rows.filter(matches);
    const kept = rows.filter((row) => !matches(row));
    rows.splice(0, rows.length, ...kept);
    return removed;
  };
  const sameAccount = (userId: string, marketplace: Marketplace) => (row: { userId: string; marketplace: Marketplace }) =>
    row.userId === userId && row.marketplace === marketplace;

  return {
    handshakes,
    connections,
    saveHandshake(handshake) {
      remove(handshakes, sameAccount(handshake.userId, handshake.marketplace));
      handshakes.push(handshake);
      return Promise.resolve();
    },
    takeHandshake(stateHash) {
      const [taken] = remove(handshakes, (row) => row.stateHash === stateHash);
      return Promise.resolve(taken ?? null);
    },
    deleteExpiredHandshakes(now) {
      remove(handshakes, (row) => new Date(row.expiresAt) <= now);
      return Promise.resolve();
    },
    saveConnection(connection) {
      remove(connections, sameAccount(connection.userId, connection.marketplace));
      connections.push(connection);
      return Promise.resolve();
    },
    deleteConnection(userId, marketplace) {
      remove(connections, sameAccount(userId, marketplace));
      remove(handshakes, sameAccount(userId, marketplace));
      return Promise.resolve();
    },
  };
}

const TEST_KEY = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));

export function testCipher(): Promise<TokenCipher> {
  return createTokenCipher({ keys: { v1: TEST_KEY }, current: 'v1' });
}

/** The server knows Ana and Bob by their session tokens, and nobody else. */
export function identify(token: string): Promise<{ id: string } | null> {
  const sellers: Record<string, string> = { 'ana-token': 'ana', 'bob-token': 'bob' };
  return Promise.resolve(token in sellers ? { id: sellers[token] } : null);
}

/** A marketplace that lives in memory, standing in for Discogs. */
export function fakeDiscogs(): FakeConnector {
  return createFakeConnector({
    marketplace: 'discogs',
    capabilities: { itemTypes: ['record'], requiresCatalogueRelease: true, respondToOffers: false },
  });
}

export const NOW = new Date('2026-11-20T12:00:00Z');
