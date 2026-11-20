// The rules for finishing a marketplace connection, apart from how the server is reached.
//
// This is the one function anybody can call: the marketplace sends the seller's browser
// here, and a browser coming from another site carries no Valan session. What says whose
// attempt it is, is the state: random, kept only as a hash, good for ten minutes and
// deleted the moment it is used.

import { hashState } from '../_shared/connections/state.ts';
import type { ConnectionStore } from '../_shared/connections/store.ts';
import { type Connector, ConnectorError, type Marketplace } from '../_shared/connectors/types.ts';
import type { CipherContext, TokenCipher } from '../_shared/token-cipher.ts';

export interface ConnectCallbackServer {
  /** Null when this server has no keys for the marketplace. */
  connector(marketplace: Marketplace): Connector | null;
  readonly store: ConnectionStore;
  cipher(): Promise<TokenCipher>;
  now?(): Date;
  /** Records a failure where the people running the server can see it. Never a secret. */
  reportFailure?(error: unknown): void;
}

export interface CallbackOutcome {
  /** "denied" is the seller saying no on the marketplace; everything else that is not a connection is "failed". */
  readonly result: 'connected' | 'denied' | 'failed';
  /** From the stored attempt, never from the request; null when no attempt was found. */
  readonly marketplace: Marketplace | null;
}

/**
 * What an attempt kept, as the connector handed it over. A parse error would quote the text
 * it failed on, and that text is a credential, so the failure is replaced by one that says nothing.
 */
function readHandshake(json: string): Record<string, string> {
  let kept: unknown;
  try {
    kept = JSON.parse(json);
  } catch {
    kept = null;
  }
  if (typeof kept !== 'object' || kept === null || Array.isArray(kept)) {
    throw new Error('The stored connection attempt could not be read.');
  }
  return kept as Record<string, string>;
}

/**
 * Finishes the attempt the state belongs to: asks the marketplace for the account's
 * credentials and stores them encrypted, for the seller who started it. The seller and the
 * marketplace come from the stored attempt alone, whatever else the callback carries.
 */
export async function finishConnection(
  server: ConnectCallbackServer,
  params: Readonly<Record<string, string>>,
): Promise<CallbackOutcome> {
  let marketplace: Marketplace | null = null;

  try {
    if (!params.state) return { result: 'failed', marketplace };

    // Taken, not read: a second callback with the same state finds nothing.
    const attempt = await server.store.takeHandshake(await hashState(params.state));
    if (attempt === null) return { result: 'failed', marketplace };
    marketplace = attempt.marketplace;

    const now = server.now?.() ?? new Date();
    // Written so that an expiry that cannot be read counts as passed.
    if (!(new Date(attempt.expiresAt) > now)) return { result: 'failed', marketplace };

    const connector = server.connector(marketplace);
    if (connector === null) return { result: 'failed', marketplace };

    const cipher = await server.cipher();
    const row = { userId: attempt.userId, marketplace };
    const seal = (secret: string | undefined, purpose: CipherContext['purpose']) =>
      secret === undefined ? null : cipher.encrypt(secret, { ...row, purpose });

    const handshake = readHandshake(await cipher.decrypt(attempt.handshakeEncrypted, { ...row, purpose: 'handshake' }));
    const { credentials, accountName } = await connector.finishConnect({ handshake, callbackParams: params });

    await server.store.saveConnection({
      ...row,
      accessTokenEncrypted: await cipher.encrypt(credentials.accessToken, { ...row, purpose: 'access_token' }),
      tokenSecretEncrypted: await seal(credentials.tokenSecret, 'token_secret'),
      refreshTokenEncrypted: await seal(credentials.refreshToken, 'refresh_token'),
      expiresAt: credentials.expiresAt ?? null,
      accountName,
    });
    return { result: 'connected', marketplace };
  } catch (error) {
    // A refusal is reported too: the log tells a seller saying no from a marketplace refusing us.
    server.reportFailure?.(error);
    const refused = error instanceof ConnectorError && error.kind === 'auth_denied';
    return { result: refused ? 'denied' : 'failed', marketplace };
  }
}

/**
 * The address that takes the seller back to the app. It is built from the app address this
 * server was configured with and from our own outcome: nothing of the request is copied
 * into it, so the callback cannot be used to send a browser anywhere else.
 */
export function appReturnUrl(appUrl: string, outcome: CallbackOutcome): string {
  const query = new URLSearchParams({ result: outcome.result });
  if (outcome.marketplace !== null) query.set('marketplace', outcome.marketplace);
  return `${appUrl}?${query}`;
}

/** The whole answer to a callback: where to send the browser, whatever happened. */
export async function callbackRedirect(
  server: ConnectCallbackServer,
  requestUrl: string,
  appUrl: string,
): Promise<string> {
  const params = Object.fromEntries(new URL(requestUrl).searchParams);
  return appReturnUrl(appUrl, await finishConnection(server, params));
}
