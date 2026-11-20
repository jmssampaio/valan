// The Discogs connector. So far it only connects an account (OAuth 1.0a); listing, orders
// and offers come with the publish work and answer "unsupported" until then.
//
// The flow, as documented at https://www.discogs.com/developers (Authentication > OAuth Flow):
//   1. GET  /oauth/request_token  with our callback            -> request token and secret
//   2. the seller approves at www.discogs.com/oauth/authorize  -> back to us with a verifier
//   3. POST /oauth/access_token   with the verifier            -> access token and secret
//   4. GET  /oauth/identity                                    -> whose account it is
// Requests are signed with PLAINTEXT over HTTPS, which Discogs recommends. Access tokens do
// not expire; the seller can revoke them in their Discogs settings.

import {
  type ConnectCallback,
  type ConnectedAccount,
  type Connector,
  type ConnectorCapabilities,
  ConnectorError,
  type ConnectStart,
} from './types.ts';

const API = 'https://api.discogs.com';
const AUTHORIZE_PAGE = 'https://www.discogs.com/oauth/authorize';
const DEFAULT_TIMEOUT_MS = 10_000;

export interface DiscogsConfig {
  readonly consumerKey: string;
  readonly consumerSecret: string;
  /** Discogs asks every application to name itself. */
  readonly userAgent: string;
  readonly fetch?: typeof fetch;
  /** How long to wait for Discogs before giving up. */
  readonly timeoutMs?: number;
}

const capabilities: ConnectorCapabilities = {
  itemTypes: ['record'],
  requiresCatalogueRelease: true,
  // Whether the API can accept or reject an offer is not confirmed, so the seller answers on Discogs.
  respondToOffers: false,
};

/** Percent-encoding as OAuth 1.0a wants it (RFC 5849, 3.6): stricter than encodeURIComponent. */
function encode(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function unavailable(): ConnectorError {
  // Deliberately says nothing of the request or the answer: both can carry secrets.
  return new ConnectorError('unavailable', 'Discogs did not give a usable answer.');
}

/** `why` is for the server log, and never anything the request or the answer carried. */
function denied(why: string): ConnectorError {
  return new ConnectorError('auth_denied', `Discogs did not grant access to the account: ${why}.`);
}

function notYet(): Promise<never> {
  return Promise.reject(new ConnectorError('unsupported', 'The Discogs connector cannot do this yet.'));
}

export function createDiscogsConnector(config: DiscogsConfig): Connector {
  const send = config.fetch ?? fetch;
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  function authorization(fields: Record<string, string>, tokenSecret: string): string {
    const oauth: Record<string, string> = {
      oauth_consumer_key: config.consumerKey,
      oauth_nonce: crypto.randomUUID().replaceAll('-', ''),
      oauth_signature_method: 'PLAINTEXT',
      oauth_timestamp: String(Math.floor(Date.now() / 1000)),
      ...fields,
      // PLAINTEXT: the two secrets, each encoded, joined by "&" (RFC 5849, 3.4.4).
      oauth_signature: `${encode(config.consumerSecret)}&${encode(tokenSecret)}`,
    };
    const header = Object.entries(oauth)
      .map(([name, value]) => `${name}="${encode(value)}"`)
      .join(', ');
    return `OAuth ${header}`;
  }

  /** One signed request. Fails as "unavailable" when Discogs cannot be reached in time. */
  async function request(
    method: 'GET' | 'POST',
    path: string,
    fields: Record<string, string>,
    tokenSecret = '',
  ): Promise<{ status: number; body: string }> {
    try {
      const response = await send(`${API}${path}`, {
        method,
        headers: {
          Authorization: authorization(fields, tokenSecret),
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': config.userAgent,
        },
        // A signed request goes to Discogs and nowhere it might point us to.
        redirect: 'error',
        signal: AbortSignal.timeout(timeoutMs),
      });
      return { status: response.status, body: await response.text() };
    } catch {
      // The cause is dropped on purpose: a network error can quote the request it failed on.
      throw unavailable();
    }
  }

  /** The token and secret of a form-encoded answer; null when either is missing. */
  function tokenPair(body: string): { token: string; secret: string } | null {
    const answer = new URLSearchParams(body);
    const token = answer.get('oauth_token');
    const secret = answer.get('oauth_token_secret');
    return token && secret ? { token, secret } : null;
  }

  async function accountName(accessToken: string, tokenSecret: string): Promise<string> {
    const { status, body } = await request('GET', '/oauth/identity', { oauth_token: accessToken }, tokenSecret);
    if (status !== 200) throw unavailable();

    let identity: unknown;
    try {
      identity = JSON.parse(body);
    } catch {
      throw unavailable();
    }
    const username =
      typeof identity === 'object' && identity !== null ? (identity as { username?: unknown }).username : undefined;
    if (typeof username !== 'string' || username === '') throw unavailable();
    return username;
  }

  return {
    marketplace: 'discogs',
    capabilities,

    async startConnect({ redirectUrl, state }): Promise<ConnectStart> {
      // OAuth 1.0a has no state of its own, so ours travels in the callback address.
      const callback = new URL(redirectUrl);
      callback.searchParams.set('state', state);

      const { status, body } = await request('GET', '/oauth/request_token', { oauth_callback: callback.toString() });
      if (status !== 200) throw unavailable();

      const pair = tokenPair(body);
      // Without the confirmation Discogs would show the seller a code instead of sending them back.
      if (pair === null || new URLSearchParams(body).get('oauth_callback_confirmed') !== 'true') {
        throw unavailable();
      }

      return {
        authorizationUrl: `${AUTHORIZE_PAGE}?oauth_token=${encode(pair.token)}`,
        handshake: { requestToken: pair.token, requestTokenSecret: pair.secret },
      };
    },

    async finishConnect({ handshake, callbackParams }: ConnectCallback): Promise<ConnectedAccount> {
      const { requestToken, requestTokenSecret } = handshake;
      const verifier = callbackParams.oauth_verifier;
      // No verifier means the seller refused; another token means this is not our request's answer.
      if (!requestToken || !requestTokenSecret) throw denied('the attempt kept no request token');
      if (!verifier) throw denied('the seller did not approve');
      if (callbackParams.oauth_token !== requestToken) throw denied('the callback is for another request');

      const { status, body } = await request(
        'POST',
        '/oauth/access_token',
        { oauth_token: requestToken, oauth_verifier: verifier },
        requestTokenSecret,
      );
      // A wrong or expired verifier (it lasts 15 minutes): the seller has to approve again.
      if (status === 400 || status === 401) throw denied(`the verifier was refused with HTTP ${status}`);
      if (status !== 200) throw unavailable();

      const pair = tokenPair(body);
      if (pair === null) throw unavailable();

      return {
        credentials: { accessToken: pair.token, tokenSecret: pair.secret },
        accountName: await accountName(pair.token, pair.secret),
      };
    },

    publish: notYet,
    update: notYet,
    remove: notYet,
    listOrders: notYet,
    listOffers: notYet,
    respondOffer: notYet,
  };
}
