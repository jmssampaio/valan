// The rules for disconnecting a marketplace account, apart from how the server is reached.

import type { ConnectionStore } from '../_shared/connections/store.ts';
import { isMarketplace } from '../_shared/connectors/types.ts';

export interface DisconnectServer {
  /** Who a session token belongs to; null when it is missing, forged or expired. */
  identify(token: string): Promise<{ id: string } | null>;
  readonly store: ConnectionStore;
  /** Records a failure where the people running the server can see it. */
  reportFailure?(error: unknown): void;
}

export interface DisconnectRequest {
  readonly token: string | null;
  /** As it came in the request: anything at all. */
  readonly marketplace: unknown;
}

export type DisconnectOutcome =
  | { ok: true }
  | { ok: false; reason: 'not_signed_in' | 'unknown_marketplace' | 'failed' };

/**
 * Forgets the marketplace account of whoever the token belongs to: the stored credentials
 * are deleted, so Valan can no longer act on that account. Asking twice is safe.
 *
 * Discogs has no way to revoke a token through its API; the seller can also remove Valan's
 * access in their Discogs settings, and the app tells them so.
 */
export async function disconnect(server: DisconnectServer, request: DisconnectRequest): Promise<DisconnectOutcome> {
  const seller = request.token === null ? null : await server.identify(request.token);
  if (seller === null) return { ok: false, reason: 'not_signed_in' };

  if (!isMarketplace(request.marketplace)) return { ok: false, reason: 'unknown_marketplace' };

  try {
    await server.store.deleteConnection(seller.id, request.marketplace);
    return { ok: true };
  } catch (error) {
    server.reportFailure?.(error);
    return { ok: false, reason: 'failed' };
  }
}
