// The behaviour every connector must show, whatever the marketplace. Each connector's
// test file calls testConnectorContract with a harness built on its own fixtures.

import { assert, assertEquals, assertRejects } from '@std/assert';

import {
  type ConnectStart,
  type Connector,
  type ConnectorCredentials,
  ConnectorError,
  type ConnectorErrorKind,
  type ListingDraft,
} from './types.ts';

export interface ContractHarness {
  readonly connector: Connector;
  readonly credentials: ConnectorCredentials;
  readonly expiredCredentials: ConnectorCredentials;
  /** What the marketplace sends back when the seller approves or refuses access. */
  approvedCallbackParams(start: ConnectStart): Record<string, string>;
  deniedCallbackParams(start: ConnectStart): Record<string, string>;
  readonly supportedListing: ListingDraft;
  /** Null when the marketplace lists every item type. */
  readonly unsupportedListing: ListingDraft | null;
  /** Offers that already exist on the marketplace, by external id. */
  readonly offers: { readonly toAccept: string; readonly toReject: string; readonly expired: string };
  /** A date and the external ids of the orders placed on or after it. */
  readonly orders: { readonly since: string; readonly expectedOrderIds: readonly string[] };
}

const connectInput = { redirectUrl: 'https://valan.test/connect/callback', state: 'state-123' };

export async function assertConnectorError(
  action: () => Promise<unknown>,
  kind: ConnectorErrorKind,
): Promise<ConnectorError> {
  const error = await assertRejects(action, ConnectorError);
  assertEquals(error.kind, kind);
  return error;
}

export function testConnectorContract(name: string, makeHarness: () => ContractHarness): void {
  const test = (behaviour: string, run: (harness: ContractHarness) => Promise<void>) =>
    Deno.test(`${name}: ${behaviour}`, () => run(makeHarness()));

  test('declares at least one item type it can list', ({ connector }) => {
    assert(connector.capabilities.itemTypes.length > 0);
    return Promise.resolve();
  });

  test('starts a connection with a secure authorization URL', async ({ connector }) => {
    const start = await connector.startConnect(connectInput);

    assertEquals(new URL(start.authorizationUrl).protocol, 'https:');
  });

  test('returns credentials when the seller approves access', async (harness) => {
    const start = await harness.connector.startConnect(connectInput);

    const credentials = await harness.connector.finishConnect({
      handshake: start.handshake,
      callbackParams: harness.approvedCallbackParams(start),
    });

    assert(credentials.accessToken.length > 0);
  });

  test('rejects a connection the seller refused', async (harness) => {
    const start = await harness.connector.startConnect(connectInput);

    await assertConnectorError(
      () =>
        harness.connector.finishConnect({
          handshake: start.handshake,
          callbackParams: harness.deniedCallbackParams(start),
        }),
      'auth_denied',
    );
  });

  test('publishes a supported item and returns its id and URL', async (harness) => {
    const published = await harness.connector.publish(harness.credentials, harness.supportedListing);

    assert(published.externalId.length > 0);
    assertEquals(new URL(published.url).protocol, 'https:');
  });

  test('rejects an item type it does not support', async (harness) => {
    const unsupported = harness.unsupportedListing;
    if (unsupported === null) return;

    await assertConnectorError(
      () => harness.connector.publish(harness.credentials, unsupported),
      'unsupported',
    );
  });

  test('updates a published listing', async ({ connector, credentials, supportedListing }) => {
    const { externalId } = await connector.publish(credentials, supportedListing);

    await connector.update(credentials, externalId, { priceMinor: 2500, paused: true });
  });

  test('fails to update a listing that does not exist', async ({ connector, credentials }) => {
    await assertConnectorError(
      () => connector.update(credentials, 'no-such-listing', { priceMinor: 2500 }),
      'not_found',
    );
  });

  test('removes a listing, and removing it again succeeds', async (harness) => {
    const { connector, credentials } = harness;
    const { externalId } = await connector.publish(credentials, harness.supportedListing);

    await connector.remove(credentials, externalId);
    await connector.remove(credentials, externalId);

    await assertConnectorError(() => connector.update(credentials, externalId, {}), 'not_found');
  });

  test('lists the orders placed since a date', async ({ connector, credentials, orders }) => {
    const found = await connector.listOrders(credentials, { since: orders.since });

    assertEquals(found.map((order) => order.externalOrderId).sort(), [...orders.expectedOrderIds].sort());
  });

  test('lists offers with their status', async ({ connector, credentials, offers }) => {
    const found = await connector.listOffers(credentials);

    const pending = found.find((offer) => offer.externalOfferId === offers.toAccept);
    assertEquals(pending?.status, 'pending');
  });

  test('accepts and rejects offers when the marketplace allows it', async (harness) => {
    const { connector, credentials, offers } = harness;
    if (!connector.capabilities.respondToOffers) {
      await assertConnectorError(
        () => connector.respondOffer(credentials, offers.toAccept, 'accept'),
        'unsupported',
      );
      return;
    }

    await connector.respondOffer(credentials, offers.toAccept, 'accept');
    await connector.respondOffer(credentials, offers.toReject, 'reject');

    const statusById = new Map(
      (await connector.listOffers(credentials)).map((offer) => [offer.externalOfferId, offer.status]),
    );
    assertEquals(statusById.get(offers.toAccept), 'accepted');
    assertEquals(statusById.get(offers.toReject), 'rejected');
  });

  test('refuses to respond to an offer that has expired', async (harness) => {
    const { connector, credentials, offers } = harness;
    if (!connector.capabilities.respondToOffers) return;

    await assertConnectorError(
      () => connector.respondOffer(credentials, offers.expired, 'accept'),
      'offer_expired',
    );
  });

  test('fails to respond to an offer that does not exist', async ({ connector, credentials }) => {
    if (!connector.capabilities.respondToOffers) return;

    await assertConnectorError(
      () => connector.respondOffer(credentials, 'no-such-offer', 'accept'),
      'not_found',
    );
  });

  test('reports expired credentials on every call that uses them', async (harness) => {
    const { connector, expiredCredentials: expired, supportedListing } = harness;

    await assertConnectorError(() => connector.publish(expired, supportedListing), 'auth_expired');
    await assertConnectorError(() => connector.update(expired, 'any', {}), 'auth_expired');
    await assertConnectorError(() => connector.remove(expired, 'any'), 'auth_expired');
    await assertConnectorError(() => connector.listOrders(expired, { since: '2026-01-01T00:00:00Z' }), 'auth_expired');
    await assertConnectorError(() => connector.listOffers(expired), 'auth_expired');
  });

  test('never puts a token in an error', async ({ connector, expiredCredentials, supportedListing }) => {
    const error = await assertConnectorError(
      () => connector.publish(expiredCredentials, supportedListing),
      'auth_expired',
    );

    const everythingTheErrorSays = `${error.message} ${error.stack} ${JSON.stringify(error)}`;
    assert(!everythingTheErrorSays.includes(expiredCredentials.accessToken));
  });
}
