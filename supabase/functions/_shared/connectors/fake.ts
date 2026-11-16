// An in-memory marketplace. It lets Edge Functions and their tests run the whole
// publish / offers / orders flow before any real eBay or Discogs code exists.

import {
  type ConnectCallback,
  type ConnectStart,
  type Connector,
  type ConnectorCapabilities,
  type ConnectorCredentials,
  ConnectorError,
  type ListingChanges,
  type ListingDraft,
  type Marketplace,
  type MarketplaceOffer,
  type MarketplaceOrder,
  type OfferResponse,
  type PublishedListing,
} from './types.ts';

export interface FakeConnectorOptions {
  readonly marketplace: Marketplace;
  readonly capabilities: ConnectorCapabilities;
  readonly now?: () => Date;
}

export interface FakeConnector extends Connector {
  /** Credentials as if a seller had already connected. */
  issueCredentials(): ConnectorCredentials;
  expireCredentials(credentials: ConnectorCredentials): void;
  /** A pending offer made by a buyer on the marketplace. */
  addOffer(offer: Omit<MarketplaceOffer, 'status'>): void;
  addOrder(order: MarketplaceOrder): void;
  /** Every later call fails as if the marketplace were down. */
  goOffline(): void;
}

const baseUrl = 'https://fake-marketplace.test';

export function createFakeConnector(options: FakeConnectorOptions): FakeConnector {
  const now = options.now ?? (() => new Date());
  const validTokens = new Set<string>();
  const listings = new Map<string, ListingDraft>();
  const offers = new Map<string, MarketplaceOffer>();
  const orders: MarketplaceOrder[] = [];
  let issuedTokens = 0;
  let publishedListings = 0;
  let offline = false;

  function requireOnline(): void {
    if (offline) throw new ConnectorError('unavailable', 'The marketplace did not respond.');
  }

  function requireAccess(credentials: ConnectorCredentials): void {
    requireOnline();
    if (!validTokens.has(credentials.accessToken)) {
      throw new ConnectorError('auth_expired', 'The marketplace no longer accepts this connection.');
    }
  }

  function issueCredentials(): ConnectorCredentials {
    issuedTokens += 1;
    const accessToken = `fake-token-${issuedTokens}`;
    validTokens.add(accessToken);
    return { accessToken };
  }

  function hasExpired(offer: MarketplaceOffer): boolean {
    return offer.expiresAt !== undefined && new Date(offer.expiresAt) <= now();
  }

  return {
    marketplace: options.marketplace,
    capabilities: options.capabilities,

    async startConnect({ redirectUrl, state }): Promise<ConnectStart> {
      requireOnline();
      const query = new URLSearchParams({ state, redirect_uri: redirectUrl });
      return {
        authorizationUrl: `${baseUrl}/authorize?${query}`,
        handshake: { state },
      };
    },

    async finishConnect({ handshake, callbackParams }: ConnectCallback): Promise<ConnectorCredentials> {
      requireOnline();
      const approved = callbackParams.state === handshake.state && callbackParams.code !== undefined;
      if (!approved) {
        throw new ConnectorError('auth_denied', 'The marketplace did not grant access.');
      }
      return issueCredentials();
    },

    async publish(credentials, listing): Promise<PublishedListing> {
      requireAccess(credentials);
      if (!options.capabilities.itemTypes.includes(listing.type)) {
        throw new ConnectorError('unsupported', `This marketplace does not list ${listing.type} items.`);
      }
      publishedListings += 1;
      const externalId = `fake-listing-${publishedListings}`;
      listings.set(externalId, listing);
      return { externalId, url: `${baseUrl}/listings/${externalId}` };
    },

    async update(credentials, externalId, changes: ListingChanges): Promise<void> {
      requireAccess(credentials);
      const listing = listings.get(externalId);
      if (listing === undefined) {
        throw new ConnectorError('not_found', 'The listing does not exist on the marketplace.');
      }
      const { paused: _paused, ...fields } = changes;
      listings.set(externalId, { ...listing, ...fields });
          },

    async remove(credentials, externalId): Promise<void> {
      requireAccess(credentials);
      listings.delete(externalId);
          },

    async listOrders(credentials, { since }): Promise<MarketplaceOrder[]> {
      requireAccess(credentials);
      const sinceDate = new Date(since);
      return orders.filter((order) => new Date(order.soldAt) >= sinceDate);
    },

    async listOffers(credentials): Promise<MarketplaceOffer[]> {
      requireAccess(credentials);
      return [...offers.values()];
    },

    async respondOffer(credentials, externalOfferId, response: OfferResponse): Promise<void> {
      requireAccess(credentials);
      if (!options.capabilities.respondToOffers) {
        throw new ConnectorError('unsupported', 'Offers on this marketplace are answered on its own site.');
      }
      const offer = offers.get(externalOfferId);
      if (offer === undefined) {
        throw new ConnectorError('not_found', 'The offer does not exist on the marketplace.');
      }
      if (hasExpired(offer)) {
        throw new ConnectorError('offer_expired', 'The offer has expired.');
      }
      offers.set(externalOfferId, { ...offer, status: response === 'accept' ? 'accepted' : 'rejected' });
          },

    issueCredentials,

    expireCredentials(credentials): void {
      validTokens.delete(credentials.accessToken);
    },

    addOffer(offer): void {
      offers.set(offer.externalOfferId, { ...offer, status: 'pending' });
    },

    addOrder(order): void {
      orders.push(order);
    },

    goOffline(): void {
      offline = true;
    },
  };
}
