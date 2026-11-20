// The rules for starting a marketplace connection, apart from how the server is reached,
// so they can be tested without one. index.ts wires them to Supabase.

import { newState, hashState } from '../_shared/connections/state.ts';
import type { ConnectionStore } from '../_shared/connections/store.ts';
import { type Connector, ConnectorError, isMarketplace, type Marketplace } from '../_shared/connectors/types.ts';
import type { TokenCipher } from '../_shared/token-cipher.ts';

/** Long enough to sign in at the marketplace and approve; short, because it is a credential. */
const ATTEMPT_MINUTES = 10;

export interface ConnectStartServer {
  /** Who a session token belongs to; null when it is missing, forged or expired. */
  identify(token: string): Promise<{ id: string } | null>;
  /** Null when this server has no keys for the marketplace. */
  connector(marketplace: Marketplace): Connector | null;
  readonly store: ConnectionStore;
  /** Made only when something has to be encrypted, so a missing key fails nothing else. */
  cipher(): Promise<TokenCipher>;
  /**
   * Our own connect-callback address: where the marketplace sends the seller back. Read only
   * when a connection really starts, and it throws when the server has no usable one.
   */
  callbackUrl(): string;
  now?(): Date;
  /** Records a failure where the people running the server can see it. Never a secret. */
  reportFailure?(error: unknown): void;
}

export interface ConnectStartRequest {
  readonly token: string | null;
  /** As it came in the request: anything at all. */
  readonly marketplace: unknown;
}

export type ConnectStartOutcome =
  | { ok: true; authorizationUrl: string }
  | { ok: false; reason: 'not_signed_in' | 'unknown_marketplace' | 'unavailable' | 'failed' };

/**
 * Starts connecting a marketplace account for whoever the token belongs to, and answers
 * with the address where they approve it. What the marketplace asks us to keep meanwhile
 * (for Discogs, a request-token secret) is a credential, so it is stored encrypted.
 */
export async function startConnection(
  server: ConnectStartServer,
  request: ConnectStartRequest,
): Promise<ConnectStartOutcome> {
  const seller = request.token === null ? null : await server.identify(request.token);
  if (seller === null) return { ok: false, reason: 'not_signed_in' };

  const { marketplace } = request;
  if (!isMarketplace(marketplace)) return { ok: false, reason: 'unknown_marketplace' };

  try {
    const connector = server.connector(marketplace);
    if (connector === null) return { ok: false, reason: 'unavailable' };

    const now = server.now?.() ?? new Date();
    // Housekeeping: attempts nobody finished. If it fails, the seller can still connect.
    await server.store.deleteExpiredHandshakes(now).catch((error) => server.reportFailure?.(error));

    const redirectUrl = server.callbackUrl();
    const state = newState();
    const start = await connector.startConnect({ redirectUrl, state });

    const cipher = await server.cipher();
    await server.store.saveHandshake({
      userId: seller.id,
      marketplace,
      stateHash: await hashState(state),
      handshakeEncrypted: await cipher.encrypt(JSON.stringify(start.handshake), {
        userId: seller.id,
        marketplace,
        purpose: 'handshake',
      }),
      expiresAt: new Date(now.getTime() + ATTEMPT_MINUTES * 60_000).toISOString(),
    });

    // Only now: an address handed out without its attempt stored could never be finished.
    return { ok: true, authorizationUrl: start.authorizationUrl };
  } catch (error) {
    server.reportFailure?.(error);
    // The marketplace not answering is worth saying apart: trying later may work.
    const marketplaceIsDown = error instanceof ConnectorError && error.kind === 'unavailable';
    return { ok: false, reason: marketplaceIsDown ? 'unavailable' : 'failed' };
  }
}
