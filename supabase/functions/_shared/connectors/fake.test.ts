import { assertEquals } from '@std/assert';

import { assertConnectorError, type ContractHarness, testConnectorContract } from './contract.ts';
import { createFakeConnector, type FakeConnector, type FakeConnectorOptions } from './fake.ts';
import type { ListingDraft } from './types.ts';

const record: ListingDraft = {
  type: 'record',
  title: 'Noites de Lisboa',
  artist: 'Os Marés',
  discogsReleaseId: 249504,
  format: 'LP, Album',
  releaseYear: 1978,
  mediaCondition: 'VG+',
  sleeveCondition: 'VG',
  priceMinor: 2000,
  currency: 'EUR',
  acceptsOffers: true,
  photoUrls: ['https://valan.test/photos/front.jpg'],
};

const turntable: ListingDraft = {
  type: 'equipment',
  title: 'Gira-discos',
  equipmentCondition: 'good',
  priceMinor: 12000,
  currency: 'EUR',
  acceptsOffers: false,
  photoUrls: ['https://valan.test/photos/turntable.jpg'],
};

const now = new Date('2026-11-16T12:00:00Z');

function makeHarness(options: FakeConnectorOptions): ContractHarness & { connector: FakeConnector } {
  const connector = createFakeConnector({ ...options, now: () => now });
  const credentials = connector.issueCredentials();
  const expiredCredentials = connector.issueCredentials();
  connector.expireCredentials(expiredCredentials);

  const offer = { externalListingId: 'listing-1', buyer: 'buyer-1', amountMinor: 1800, currency: 'EUR' };
  connector.addOffer({ ...offer, externalOfferId: 'offer-accept', expiresAt: '2026-11-17T12:00:00Z' });
  connector.addOffer({ ...offer, externalOfferId: 'offer-reject', expiresAt: '2026-11-17T12:00:00Z' });
  connector.addOffer({ ...offer, externalOfferId: 'offer-expired', expiresAt: '2026-11-15T12:00:00Z' });

  const order = { externalListingId: 'listing-1', priceMinor: 2000, feesMinor: 252, currency: 'EUR', buyer: 'buyer-1' };
  connector.addOrder({ ...order, externalOrderId: 'order-old', soldAt: '2026-10-01T09:00:00Z' });
  connector.addOrder({ ...order, externalOrderId: 'order-new', soldAt: '2026-11-10T09:00:00Z' });

  const listsEquipment = connector.capabilities.itemTypes.includes('equipment');

  return {
    connector,
    credentials,
    expiredCredentials,
    approvedCallbackParams: (start) => ({ state: start.handshake.state, code: 'approved' }),
    deniedCallbackParams: (start) => ({ state: start.handshake.state, error: 'access_denied' }),
    supportedListing: record,
    equipmentListing: listsEquipment ? turntable : null,
    unsupportedListing: listsEquipment ? null : turntable,
    offers: { toAccept: 'offer-accept', toReject: 'offer-reject', expired: 'offer-expired' },
    orders: { since: '2026-11-01T00:00:00Z', expectedOrderIds: ['order-new'] },
  };
}

const everything: FakeConnectorOptions = {
  marketplace: 'ebay',
  capabilities: { itemTypes: ['record', 'equipment'], respondToOffers: true },
};
const recordsOnlyNoOfferResponses: FakeConnectorOptions = {
  marketplace: 'discogs',
  capabilities: { itemTypes: ['record'], respondToOffers: false },
};

testConnectorContract('fake connector that supports everything', () => makeHarness(everything));
testConnectorContract(
  'fake connector for records only, without offer responses',
  () => makeHarness(recordsOnlyNoOfferResponses),
);

Deno.test('fake connector: rejects a callback whose state does not match the handshake', async () => {
  const { connector } = makeHarness(everything);
  const start = await connector.startConnect({ redirectUrl: 'https://valan.test/callback', state: 'state-123' });

  await assertConnectorError(
    () => connector.finishConnect({ handshake: start.handshake, callbackParams: { state: 'forged', code: 'approved' } }),
    'auth_denied',
  );
});

Deno.test('fake connector: issues credentials that work', async () => {
  const { connector, approvedCallbackParams } = makeHarness(everything);
  const start = await connector.startConnect({ redirectUrl: 'https://valan.test/callback', state: 'state-123' });

  const credentials = await connector.finishConnect({
    handshake: start.handshake,
    callbackParams: approvedCallbackParams(start),
  });

  assertEquals(await connector.listOrders(credentials, { since: '2026-11-01T00:00:00Z' }).then((o) => o.length), 1);
});

Deno.test('fake connector: reports the marketplace as unavailable during an outage', async () => {
  const { connector, credentials } = makeHarness(everything);
  connector.goOffline();

  await assertConnectorError(() => connector.publish(credentials, record), 'unavailable');
  await assertConnectorError(() => connector.listOffers(credentials), 'unavailable');
});

Deno.test('fake connector: keeps the release details of a published record', async () => {
  const { connector, credentials } = makeHarness(everything);

  const { externalId } = await connector.publish(credentials, record);

  const published = connector.publishedListing(externalId);
  assertEquals(published?.format, 'LP, Album');
  assertEquals(published?.releaseYear, 1978);
});

Deno.test('fake connector: keeps the condition of published equipment', async () => {
  const { connector, credentials } = makeHarness(everything);

  const { externalId } = await connector.publish(credentials, turntable);

  assertEquals(connector.publishedListing(externalId)?.equipmentCondition, 'good');
});

Deno.test('fake connector: has no listing once it is removed', async () => {
  const { connector, credentials } = makeHarness(everything);
  const { externalId } = await connector.publish(credentials, record);

  await connector.remove(credentials, externalId);

  assertEquals(connector.publishedListing(externalId), undefined);
});

Deno.test('fake connector: stores the marketplace condition, not Valan\'s', async () => {
  const { connector, credentials } = makeHarness(everything);

  const { externalId } = await connector.publish(credentials, { ...turntable, equipmentCondition: 'like_new' });

  assertEquals(connector.marketplaceCondition(externalId), 'USED');
});

Deno.test('fake connector: maps several of Valan\'s conditions to one of the marketplace\'s', async () => {
  const { connector, credentials } = makeHarness(everything);

  const good = await connector.publish(credentials, { ...turntable, equipmentCondition: 'good' });
  const fair = await connector.publish(credentials, { ...turntable, equipmentCondition: 'fair' });

  assertEquals(connector.marketplaceCondition(good.externalId), connector.marketplaceCondition(fair.externalId));
});

Deno.test('fake connector: refuses equipment in a condition it has no mapping for', async () => {
  const { connector, credentials } = makeHarness({
    ...everything,
    equipmentConditions: { new: 'NEW', good: 'USED' },
  });

  await assertConnectorError(
    () => connector.publish(credentials, { ...turntable, equipmentCondition: 'for_parts' }),
    'unsupported',
  );
});
