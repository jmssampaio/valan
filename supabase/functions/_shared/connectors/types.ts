// The contract every marketplace connector implements. Edge Functions depend on this
// file only, so a marketplace can be added or swapped without touching the rest.

export const MARKETPLACES = ['ebay', 'discogs'] as const;
export type Marketplace = (typeof MARKETPLACES)[number];

/** Whether a value that came from outside names a marketplace Valan knows. */
export function isMarketplace(value: unknown): value is Marketplace {
  return typeof value === 'string' && (MARKETPLACES as readonly string[]).includes(value);
}

export type ItemType = 'record' | 'equipment';
export type RecordCondition = 'M' | 'NM' | 'VG+' | 'VG' | 'G+' | 'G' | 'F' | 'P';
/**
 * Valan's own scale, best to worst, and the only one the database stores. A connector maps
 * each value to its marketplace's conditions (several of ours may map to one of theirs) and
 * must map all of them. Values may be added later; none is removed.
 */
export const EQUIPMENT_CONDITIONS = ['new', 'like_new', 'good', 'fair', 'for_parts'] as const;
export type EquipmentCondition = (typeof EQUIPMENT_CONDITIONS)[number];
export type OfferStatus = 'pending' | 'accepted' | 'rejected' | 'expired' | 'withdrawn';
export type OfferResponse = 'accept' | 'reject';

export interface ConnectorCapabilities {
  /** Item types this marketplace can list. */
  readonly itemTypes: readonly ItemType[];
  /**
   * True when the marketplace lists only records chosen from the catalogue (a draft with a
   * discogsReleaseId). The app reads this to say where a listing can go and why not; it
   * never assumes it from the marketplace's name.
   */
  readonly requiresCatalogueRelease: boolean;
  /** False when offers can only be answered on the marketplace's own site. */
  readonly respondToOffers: boolean;
}

/** Decrypted marketplace tokens. They exist only in Edge Function memory. */
export interface ConnectorCredentials {
  readonly accessToken: string;
  /** OAuth 2 only. */
  readonly refreshToken?: string;
  /** OAuth 1.0a only. */
  readonly tokenSecret?: string;
  /** ISO 8601 timestamp. */
  readonly expiresAt?: string;
}

/** What a finished connection gives the server: the credentials to store, and whose they are. */
export interface ConnectedAccount {
  readonly credentials: ConnectorCredentials;
  /** The seller's name on the marketplace, shown in the app so they know which account is connected. */
  readonly accountName: string;
}

export interface ConnectStart {
  /** Where to send the seller to approve access. */
  readonly authorizationUrl: string;
  /** Values the server keeps until the seller comes back, then passes to finishConnect. */
  readonly handshake: Readonly<Record<string, string>>;
}

export interface ConnectCallback {
  readonly handshake: Readonly<Record<string, string>>;
  /** Query parameters the marketplace sent to the redirect URL. */
  readonly callbackParams: Readonly<Record<string, string>>;
}

export interface ListingDraft {
  readonly type: ItemType;
  readonly title: string;
  readonly artist?: string;
  readonly discogsReleaseId?: number;
  /** Records only. The release's format as the catalogue words it: "LP, Album". */
  readonly format?: string;
  /** Records only. */
  readonly releaseYear?: number;
  readonly mediaCondition?: RecordCondition;
  readonly sleeveCondition?: RecordCondition;
  /** Equipment only. Each connector maps it to the marketplace's own conditions. */
  readonly equipmentCondition?: EquipmentCondition;
  readonly description?: string;
  /** Minor units (cents). */
  readonly priceMinor: number;
  readonly currency: string;
  readonly acceptsOffers: boolean;
  readonly photoUrls: readonly string[];
}

export interface ListingChanges {
  readonly priceMinor?: number;
  readonly description?: string;
  readonly acceptsOffers?: boolean;
  readonly paused?: boolean;
}

export interface PublishedListing {
  readonly externalId: string;
  readonly url: string;
}

export interface MarketplaceOrder {
  readonly externalOrderId: string;
  readonly externalListingId: string;
  readonly priceMinor: number;
  readonly feesMinor: number;
  readonly currency: string;
  readonly buyer: string;
  /** ISO 8601 timestamp. */
  readonly soldAt: string;
}

export interface MarketplaceOffer {
  readonly externalOfferId: string;
  readonly externalListingId: string;
  readonly buyer: string;
  readonly amountMinor: number;
  readonly currency: string;
  readonly status: OfferStatus;
  /** ISO 8601 timestamp. */
  readonly expiresAt?: string;
}

export type ConnectorErrorKind =
  /** The seller refused access, or the callback does not match the handshake. */
  | 'auth_denied'
  /** The stored tokens no longer work; the seller must reconnect. */
  | 'auth_expired'
  /** The marketplace cannot do this (see capabilities). */
  | 'unsupported'
  | 'not_found'
  | 'offer_expired'
  /** Network failure or an unexpected response; safe to retry later. */
  | 'unavailable';

/** The only error a connector throws. Messages must never contain tokens. */
export class ConnectorError extends Error {
  readonly kind: ConnectorErrorKind;

  constructor(kind: ConnectorErrorKind, message: string) {
    super(message);
    this.name = 'ConnectorError';
    this.kind = kind;
  }
}

export interface Connector {
  readonly marketplace: Marketplace;
  readonly capabilities: ConnectorCapabilities;

  startConnect(input: { redirectUrl: string; state: string }): Promise<ConnectStart>;
  finishConnect(callback: ConnectCallback): Promise<ConnectedAccount>;

  publish(credentials: ConnectorCredentials, listing: ListingDraft): Promise<PublishedListing>;
  update(
    credentials: ConnectorCredentials,
    externalId: string,
    changes: ListingChanges,
  ): Promise<void>;
  /** Succeeds when the listing is already gone, so stock sync can repeat it safely. */
  remove(credentials: ConnectorCredentials, externalId: string): Promise<void>;

  listOrders(
    credentials: ConnectorCredentials,
    options: { since: string },
  ): Promise<MarketplaceOrder[]>;
  listOffers(credentials: ConnectorCredentials): Promise<MarketplaceOffer[]>;
  respondOffer(
    credentials: ConnectorCredentials,
    externalOfferId: string,
    response: OfferResponse,
  ): Promise<void>;
}
