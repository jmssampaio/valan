// The Discogs connector against hand-written answers, never the live service. The requests
// and answers follow the OAuth 1.0a flow in https://www.discogs.com/developers
// (Authentication > OAuth Flow, and User Identity > Identity).

import { assert, assertEquals, assertNotEquals } from '@std/assert';

import { assertConnectorError } from './contract.ts';
import { createDiscogsConnector, type DiscogsConfig } from './discogs.ts';

const CONSUMER_KEY = 'valan-consumer-key';
const CONSUMER_SECRET = 'valan-consumer-secret';
const REQUEST_TOKEN = 'request-token-1';
const REQUEST_SECRET = 'request-secret-1';
const ACCESS_TOKEN = 'access-token-1';
const ACCESS_SECRET = 'access-secret-1';
const VERIFIER = 'verifier-1';

const SECRETS = [CONSUMER_SECRET, REQUEST_SECRET, ACCESS_TOKEN, ACCESS_SECRET, VERIFIER];

interface SentRequest {
  readonly method: string;
  readonly url: string;
  readonly headers: Headers;
  /** The fields of the OAuth Authorization header, decoded. */
  readonly oauth: Record<string, string>;
  /** The same header as it went on the wire. */
  readonly authorization: string;
  /** What the request says to do with a redirect. */
  readonly redirect: RequestRedirect | undefined;
}

type Answer = Response | Error | 'never';
type Answers = Partial<Record<'request_token' | 'access_token' | 'identity', Answer>>;

function form(fields: Record<string, string>): Response {
  return new Response(new URLSearchParams(fields).toString(), {
    status: 200,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
}

const approved: Required<Answers> = {
  request_token: form({
    oauth_token: REQUEST_TOKEN,
    oauth_token_secret: REQUEST_SECRET,
    oauth_callback_confirmed: 'true',
  }),
  access_token: form({ oauth_token: ACCESS_TOKEN, oauth_token_secret: ACCESS_SECRET }),
  identity: Response.json({
    id: 1,
    username: 'ana-records',
    resource_url: 'https://api.discogs.com/users/ana-records',
    consumer_name: 'Valan',
  }),
};

function parseOAuth(header: string): Record<string, string> {
  assert(header.startsWith('OAuth '), 'the Authorization header must use the OAuth scheme');
  return Object.fromEntries(
    header
      .slice('OAuth '.length)
      .split(',')
      .map((field) => {
        const [name, quoted] = field.trim().split('=');
        return [name, decodeURIComponent(quoted.replace(/^"|"$/g, ''))];
      }),
  );
}

/** A Discogs that answers as told and remembers what it was asked. */
function discogs(answers: Answers = {}, config: Partial<DiscogsConfig> = {}) {
  const sent: SentRequest[] = [];
  const all = { ...approved, ...answers };

  const fetchStub: typeof fetch = (input, init) => {
    const url = String(input);
    const headers = new Headers(init?.headers);
    const authorization = headers.get('Authorization') ?? '';
    sent.push({ method: init?.method ?? 'GET', url, headers, oauth: parseOAuth(authorization), authorization, redirect: init?.redirect });

    const endpoint = url.endsWith('/oauth/request_token')
      ? 'request_token'
      : url.endsWith('/oauth/access_token')
        ? 'access_token'
        : 'identity';
    const answer = all[endpoint];
    if (answer === 'never') {
      // Answers only when the caller gives up.
      return new Promise((_, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
      });
    }
    if (answer instanceof Error) return Promise.reject(answer);
    return Promise.resolve(answer.clone());
  };

  const connector = createDiscogsConnector({
    consumerKey: CONSUMER_KEY,
    consumerSecret: CONSUMER_SECRET,
    userAgent: 'ValanTest/1.0',
    fetch: fetchStub,
    ...config,
  });
  return { connector, sent };
}

const connectInput = { redirectUrl: 'https://valan.test/functions/v1/connect-callback', state: 'state-123' };
const handshake = { requestToken: REQUEST_TOKEN, requestTokenSecret: REQUEST_SECRET };
const approvedParams = { state: 'state-123', oauth_token: REQUEST_TOKEN, oauth_verifier: VERIFIER };

// Starting ----------------------------------------------------------------------------------

Deno.test('discogs: asks for a request token, signed with the consumer secret alone', async () => {
  const { connector, sent } = discogs();

  await connector.startConnect(connectInput);

  assertEquals(sent.length, 1);
  const [request] = sent;
  assertEquals(request.method, 'GET');
  assertEquals(request.url, 'https://api.discogs.com/oauth/request_token');
  assertEquals(request.oauth.oauth_consumer_key, CONSUMER_KEY);
  assertEquals(request.oauth.oauth_signature_method, 'PLAINTEXT');
  assertEquals(request.oauth.oauth_signature, `${CONSUMER_SECRET}&`);
  assert(/^\d{10}$/.test(request.oauth.oauth_timestamp), 'the timestamp is in seconds');
  assert(request.oauth.oauth_nonce.length >= 16);
  assertEquals(request.headers.get('User-Agent'), 'ValanTest/1.0');
});

Deno.test('discogs: has the seller sent back to our callback, carrying the state', async () => {
  const { connector, sent } = discogs();

  await connector.startConnect(connectInput);

  assertEquals(
    sent[0].oauth.oauth_callback,
    'https://valan.test/functions/v1/connect-callback?state=state-123',
  );
});

Deno.test('discogs: sends the seller to the Discogs authorization page with the request token', async () => {
  const { connector } = discogs();

  const start = await connector.startConnect(connectInput);

  assertEquals(start.authorizationUrl, `https://www.discogs.com/oauth/authorize?oauth_token=${REQUEST_TOKEN}`);
});

Deno.test('discogs: hands back the request token and its secret to keep until the seller returns', async () => {
  const { connector } = discogs();

  const start = await connector.startConnect(connectInput);

  assertEquals(start.handshake, handshake);
});

Deno.test('discogs: uses a new nonce for every request', async () => {
  const { connector, sent } = discogs();

  await connector.startConnect(connectInput);
  await connector.startConnect(connectInput);

  assertNotEquals(sent[0].oauth.oauth_nonce, sent[1].oauth.oauth_nonce);
});

Deno.test('discogs: percent-encodes what goes in the header', async () => {
  const { connector, sent } = discogs({}, { consumerSecret: 'se"cr,et&=1' });

  await connector.startConnect(connectInput);

  // Decoded, the signature is the secret as OAuth encodes it, then "&".
  assertEquals(sent[0].oauth.oauth_signature, 'se%22cr%2Cet%26%3D1&');
  assert(!sent[0].authorization.includes('se"cr,et&=1'));
});

Deno.test('discogs: cannot start while Discogs is failing or refusing our keys', async () => {
  const failures: Answer[] = [
    new Response('down', { status: 500 }),
    new Response('slow down', { status: 429 }),
    new Response('Invalid consumer.', { status: 401 }),
    new Response('bad request', { status: 400 }),
    new TypeError('network down'),
  ];

  for (const request_token of failures) {
    const { connector } = discogs({ request_token });
    await assertConnectorError(() => connector.startConnect(connectInput), 'unavailable');
  }
});

Deno.test('discogs: cannot start with an answer that lacks the request token', async () => {
  const incomplete = [
    form({ oauth_token_secret: REQUEST_SECRET, oauth_callback_confirmed: 'true' }),
    form({ oauth_token: REQUEST_TOKEN, oauth_callback_confirmed: 'true' }),
    new Response('<html>maintenance</html>', { status: 200 }),
  ];

  for (const request_token of incomplete) {
    const { connector } = discogs({ request_token });
    await assertConnectorError(() => connector.startConnect(connectInput), 'unavailable');
  }
});

Deno.test('discogs: cannot start when Discogs did not take our callback', async () => {
  // Without it the seller would be left on Discogs with a code to copy by hand.
  const { connector } = discogs({
    request_token: form({ oauth_token: REQUEST_TOKEN, oauth_token_secret: REQUEST_SECRET }),
  });

  await assertConnectorError(() => connector.startConnect(connectInput), 'unavailable');
});

Deno.test('discogs: gives up on a request that gets no answer', async () => {
  const { connector } = discogs({ request_token: 'never' }, { timeoutMs: 20 });

  await assertConnectorError(() => connector.startConnect(connectInput), 'unavailable');
});

// Finishing ---------------------------------------------------------------------------------

Deno.test('discogs: exchanges the verifier for an access token, signed with the request secret', async () => {
  const { connector, sent } = discogs();

  await connector.finishConnect({ handshake, callbackParams: approvedParams });

  const [exchange] = sent;
  assertEquals(exchange.method, 'POST');
  assertEquals(exchange.url, 'https://api.discogs.com/oauth/access_token');
  assertEquals(exchange.oauth.oauth_consumer_key, CONSUMER_KEY);
  assertEquals(exchange.oauth.oauth_token, REQUEST_TOKEN);
  assertEquals(exchange.oauth.oauth_verifier, VERIFIER);
  assertEquals(exchange.oauth.oauth_signature_method, 'PLAINTEXT');
  assertEquals(exchange.oauth.oauth_signature, `${CONSUMER_SECRET}&${REQUEST_SECRET}`);
  assertEquals(exchange.headers.get('User-Agent'), 'ValanTest/1.0');
});

Deno.test('discogs: asks whose account it is, signed with the access token', async () => {
  const { connector, sent } = discogs();

  await connector.finishConnect({ handshake, callbackParams: approvedParams });

  assertEquals(sent.length, 2);
  const identity = sent[1];
  assertEquals(identity.method, 'GET');
  assertEquals(identity.url, 'https://api.discogs.com/oauth/identity');
  assertEquals(identity.oauth.oauth_token, ACCESS_TOKEN);
  assertEquals(identity.oauth.oauth_signature, `${CONSUMER_SECRET}&${ACCESS_SECRET}`);
});

Deno.test('discogs: returns the access token, its secret and the account name', async () => {
  const { connector } = discogs();

  const account = await connector.finishConnect({ handshake, callbackParams: approvedParams });

  assertEquals(account, {
    credentials: { accessToken: ACCESS_TOKEN, tokenSecret: ACCESS_SECRET },
    accountName: 'ana-records',
  });
});

Deno.test('discogs: a seller who refused is denied, without asking Discogs anything', async () => {
  const refusals: Record<string, string>[] = [
    { state: 'state-123', denied: REQUEST_TOKEN },
    { state: 'state-123', oauth_token: REQUEST_TOKEN },
    { state: 'state-123', oauth_token: REQUEST_TOKEN, oauth_verifier: '' },
    { state: 'state-123' },
  ];

  for (const callbackParams of refusals) {
    const { connector, sent } = discogs();
    await assertConnectorError(() => connector.finishConnect({ handshake, callbackParams }), 'auth_denied');
    assertEquals(sent, []);
  }
});

Deno.test('discogs: a callback for another request token is denied, without asking Discogs anything', async () => {
  const { connector, sent } = discogs();

  await assertConnectorError(
    () =>
      connector.finishConnect({
        handshake,
        callbackParams: { ...approvedParams, oauth_token: 'someone-elses-request-token' },
      }),
    'auth_denied',
  );
  assertEquals(sent, []);
});

Deno.test('discogs: a handshake that lost its request token is denied', async () => {
  const { connector, sent } = discogs();

  await assertConnectorError(
    () => connector.finishConnect({ handshake: { requestToken: REQUEST_TOKEN }, callbackParams: approvedParams }),
    'auth_denied',
  );
  await assertConnectorError(
    () => connector.finishConnect({ handshake: {}, callbackParams: approvedParams }),
    'auth_denied',
  );
  assertEquals(sent, []);
});

Deno.test('discogs: a verifier Discogs no longer accepts is denied', async () => {
  // Discogs answers 400 for a wrong or expired verifier (it lasts 15 minutes).
  for (const status of [400, 401]) {
    const { connector } = discogs({ access_token: new Response('Invalid verifier.', { status }) });
    await assertConnectorError(
      () => connector.finishConnect({ handshake, callbackParams: approvedParams }),
      'auth_denied',
    );
  }
});

Deno.test('discogs: cannot finish while Discogs is failing', async () => {
  const failures: Answers[] = [
    { access_token: new Response('down', { status: 503 }) },
    { access_token: new TypeError('network down') },
    { access_token: new Response('<html>maintenance</html>', { status: 200 }) },
    { access_token: form({ oauth_token: ACCESS_TOKEN }) },
    { access_token: 'never' },
    { identity: new Response('down', { status: 500 }) },
    { identity: new TypeError('network down') },
    { identity: new Response('not json', { status: 200 }) },
    { identity: Response.json({ id: 1 }) },
    { identity: Response.json({ id: 1, username: '' }) },
    { identity: Response.json({ id: 1, username: 42 }) },
    { identity: Response.json(null) },
  ];

  for (const answers of failures) {
    const { connector } = discogs(answers, { timeoutMs: 20 });
    await assertConnectorError(
      () => connector.finishConnect({ handshake, callbackParams: approvedParams }),
      'unavailable',
    );
  }
});

Deno.test('discogs: an access token Discogs then refuses is unavailable, not a connection', async () => {
  const { connector } = discogs({
    identity: Response.json({ message: 'You must authenticate to access this resource.' }, { status: 401 }),
  });

  await assertConnectorError(
    () => connector.finishConnect({ handshake, callbackParams: approvedParams }),
    'unavailable',
  );
});

// Secrets -----------------------------------------------------------------------------------

Deno.test('discogs: never puts a secret, a token or the answer of Discogs in an error', async () => {
  // Each failure echoes every secret back, as a careless server or library might.
  const leaky = `echo ${SECRETS.join(' ')} ${CONSUMER_KEY}`;
  const cases: { answers: Answers; run: (c: ReturnType<typeof discogs>['connector']) => Promise<unknown> }[] = [
    { answers: { request_token: new Response(leaky, { status: 500 }) }, run: (c) => c.startConnect(connectInput) },
    { answers: { request_token: new Error(leaky) }, run: (c) => c.startConnect(connectInput) },
    {
      answers: { access_token: new Response(leaky, { status: 400 }) },
      run: (c) => c.finishConnect({ handshake, callbackParams: approvedParams }),
    },
    {
      answers: { access_token: new Error(leaky) },
      run: (c) => c.finishConnect({ handshake, callbackParams: approvedParams }),
    },
    {
      answers: { identity: new Response(leaky, { status: 500 }) },
      run: (c) => c.finishConnect({ handshake, callbackParams: approvedParams }),
    },
    {
      answers: {},
      run: (c) => c.finishConnect({ handshake, callbackParams: { ...approvedParams, oauth_token: 'other' } }),
    },
  ];

  for (const { answers, run } of cases) {
    const { connector } = discogs(answers);
    let error: unknown;
    try {
      await run(connector);
    } catch (thrown) {
      error = thrown;
    }
    assert(error instanceof Error, 'the case must fail');

    const everythingItSays = `${error.message} ${error.stack} ${JSON.stringify(error)} ${String(error.cause ?? '')}`;
    for (const secret of [...SECRETS, CONSUMER_KEY, REQUEST_TOKEN]) {
      assert(!everythingItSays.includes(secret), `the error gives away ${secret}`);
    }
  }
});

// What it can do so far ---------------------------------------------------------------------

Deno.test('discogs: declares records from the catalogue only, and no answering of offers', () => {
  const { connector } = discogs();

  assertEquals(connector.marketplace, 'discogs');
  assertEquals(connector.capabilities, {
    itemTypes: ['record'],
    requiresCatalogueRelease: true,
    respondToOffers: false,
  });
});

Deno.test('discogs: everything but connecting is unsupported for now, and asks Discogs nothing', async () => {
  const { connector, sent } = discogs();
  const credentials = { accessToken: ACCESS_TOKEN, tokenSecret: ACCESS_SECRET };
  const record = {
    type: 'record' as const,
    title: 'Noites de Lisboa',
    discogsReleaseId: 249504,
    mediaCondition: 'VG+' as const,
    priceMinor: 2000,
    currency: 'EUR',
    acceptsOffers: false,
    photoUrls: [],
  };

  await assertConnectorError(() => connector.publish(credentials, record), 'unsupported');
  await assertConnectorError(() => connector.update(credentials, 'listing-1', {}), 'unsupported');
  await assertConnectorError(() => connector.remove(credentials, 'listing-1'), 'unsupported');
  await assertConnectorError(() => connector.listOrders(credentials, { since: '2026-01-01T00:00:00Z' }), 'unsupported');
  await assertConnectorError(() => connector.listOffers(credentials), 'unsupported');
  await assertConnectorError(() => connector.respondOffer(credentials, 'offer-1', 'accept'), 'unsupported');
  assertEquals(sent, []);
});

// Hardening -----------------------------------------------------------------------------------

Deno.test('discogs: never follows a redirect with a signed request', async () => {
  const { connector, sent } = discogs();

  await connector.startConnect(connectInput);
  await connector.finishConnect({ handshake, callbackParams: approvedParams });

  assertEquals(sent.map(({ redirect }) => redirect), ['error', 'error', 'error']);
});

Deno.test('discogs: a refusal says whether it was the seller or Discogs, for the server log', async () => {
  const seller = await assertConnectorError(
    () => discogs().connector.finishConnect({ handshake, callbackParams: { state: 'state-123', denied: REQUEST_TOKEN } }),
    'auth_denied',
  );
  const verifier = await assertConnectorError(
    () =>
      discogs({ access_token: new Response('Invalid verifier.', { status: 400 }) }).connector.finishConnect({
        handshake,
        callbackParams: approvedParams,
      }),
    'auth_denied',
  );

  // Told apart, because a rejected signature would otherwise look like a seller saying no.
  assertNotEquals(seller.message, verifier.message);
  assert(verifier.message.includes('400'));
});
