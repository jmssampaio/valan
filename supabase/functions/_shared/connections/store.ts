// Where connection attempts and finished connections are kept. The functions depend on this
// interface; the Supabase tables behind it are reached only with the service-role key.

import type { SupabaseClient } from '@supabase/supabase-js';

import type { Marketplace } from '../connectors/types.ts';

/** A connection attempt waiting for the seller to come back from the marketplace. */
export interface PendingHandshake {
  readonly userId: string;
  readonly marketplace: Marketplace;
  readonly stateHash: string;
  /** What the connector asked us to keep (a request-token secret, for one), encrypted. */
  readonly handshakeEncrypted: string;
  /** ISO 8601 timestamp. */
  readonly expiresAt: string;
}

/** A connected marketplace account. Every credential is ciphertext. */
export interface StoredConnection {
  readonly userId: string;
  readonly marketplace: Marketplace;
  readonly accessTokenEncrypted: string;
  readonly tokenSecretEncrypted: string | null;
  readonly refreshTokenEncrypted: string | null;
  /** ISO 8601 timestamp; null when the marketplace's tokens do not expire. */
  readonly expiresAt: string | null;
  readonly accountName: string;
}

export interface ConnectionStore {
  /** Keeps one attempt per seller and marketplace: a new one replaces the one before. */
  saveHandshake(handshake: PendingHandshake): Promise<void>;
  /** Returns the attempt and deletes it in one step, so it can be used only once. */
  takeHandshake(stateHash: string): Promise<PendingHandshake | null>;
  deleteExpiredHandshakes(now: Date): Promise<void>;
  /** Connecting again replaces the connection the seller had with that marketplace. */
  saveConnection(connection: StoredConnection): Promise<void>;
  /** Removes the connection and any attempt still pending. Succeeds when there is neither. */
  deleteConnection(userId: string, marketplace: Marketplace): Promise<void>;
}

// The Supabase tables behind the store ---------------------------------------------------------

/** The little of a Supabase error that is safe to log: never the row it was about. */
function failure(doing: string, error: { message: string; code?: string }): Error {
  return new Error(`Could not ${doing}: ${error.message}${error.code ? ` (${error.code})` : ''}`);
}

interface HandshakeRow {
  user_id: string;
  marketplace: Marketplace;
  state_hash: string;
  handshake_encrypted: string;
  expires_at: string;
}

const HANDSHAKE_COLUMNS = 'user_id, marketplace, state_hash, handshake_encrypted, expires_at';
const ONE_PER_ACCOUNT = { onConflict: 'user_id,marketplace' };

/**
 * The store on the real tables. The client must hold the service-role key: the app's roles
 * have no access to connection_handshakes and may not write platform_connections.
 */
export function createConnectionStore(client: SupabaseClient): ConnectionStore {
  const attempts = () => client.from('connection_handshakes');
  const connections = () => client.from('platform_connections');

  return {
    async saveHandshake(handshake) {
      const { error } = await attempts().upsert(
        {
          user_id: handshake.userId,
          marketplace: handshake.marketplace,
          state_hash: handshake.stateHash,
          handshake_encrypted: handshake.handshakeEncrypted,
          expires_at: handshake.expiresAt,
        },
        ONE_PER_ACCOUNT,
      );
      if (error) throw failure('keep the connection attempt', error);
    },

    async takeHandshake(stateHash) {
      // One statement deletes and returns the row, so two callbacks cannot both get it.
      const { data, error } = await attempts()
        .delete()
        .eq('state_hash', stateHash)
        .select(HANDSHAKE_COLUMNS)
        .maybeSingle<HandshakeRow>();
      if (error) throw failure('read the connection attempt', error);
      if (data === null) return null;

      return {
        userId: data.user_id,
        marketplace: data.marketplace,
        stateHash: data.state_hash,
        handshakeEncrypted: data.handshake_encrypted,
        expiresAt: data.expires_at,
      };
    },

    async deleteExpiredHandshakes(now) {
      const { error } = await attempts().delete().lte('expires_at', now.toISOString());
      if (error) throw failure('clear the expired connection attempts', error);
    },

    async saveConnection(connection) {
      const { error } = await connections().upsert(
        {
          user_id: connection.userId,
          marketplace: connection.marketplace,
          status: 'connected',
          access_token_encrypted: connection.accessTokenEncrypted,
          token_secret_encrypted: connection.tokenSecretEncrypted,
          refresh_token_encrypted: connection.refreshTokenEncrypted,
          expires_at: connection.expiresAt,
          external_username: connection.accountName,
        },
        ONE_PER_ACCOUNT,
      );
      if (error) throw failure('store the connection', error);
    },

    async deleteConnection(userId, marketplace) {
      const account = { user_id: userId, marketplace };
      const pending = await attempts().delete().match(account);
      if (pending.error) throw failure('drop the pending connection attempt', pending.error);
      const connected = await connections().delete().match(account);
      if (connected.error) throw failure('delete the connection', connected.error);
    },
  };
}
