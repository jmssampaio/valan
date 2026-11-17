import { listItems, type ListedItem } from './listings';
import { supportedMarketplaces } from './marketplaces';
import { allItems, allOffers, replaceItem, replaceOffer } from './sample-data';

import type { Enums, Tables } from '@/types/database';

/** An offer with what the inbox needs to show it: the item, where it was made, and where to open it. */
export type OfferRow = {
  offer: Tables<'offers'>;
  item: Pick<ListedItem, 'id' | 'title' | 'price_minor' | 'currency'>;
  marketplace: Enums<'marketplace'>;
  /** The listing on the marketplace. The offer has no page of its own in the schema yet. */
  listingUrl: string | null;
};

export type OfferResponse = 'accept' | 'reject';

/** Why an offer could not be answered: the kinds a connector reports, and the checks made before it. */
export type OfferErrorKind =
  | 'not_found'
  | 'expired'
  /** Someone already answered it, here or on the marketplace, in another way. */
  | 'already_answered'
  /** The marketplace cannot answer offers from outside; see its capabilities. */
  | 'unsupported'
  /** The buyer changed the amount since the seller looked at it. */
  | 'changed'
  | 'unavailable';

export class OfferError extends Error {
  readonly kind: OfferErrorKind;

  constructor(kind: OfferErrorKind, message: string) {
    super(message);
    this.name = 'OfferError';
    this.kind = kind;
  }
}

// What the server decides once the Edge Function exists: when an offer has run out of time.
function isPastExpiry(offer: Tables<'offers'>, now: Date): boolean {
  return offer.expires_at !== null && new Date(offer.expires_at).getTime() <= now.getTime();
}

/** True while an offer waits for an answer: pending, and not past its time. */
export function isAwaitingAnswer(offer: Tables<'offers'>, now: Date): boolean {
  return offer.status === 'pending' && !isPastExpiry(offer, now);
}

// Sample data until the Supabase queries exist; callers already get the final shape.
export async function countPendingOffers(): Promise<number> {
  // An offer is always made on a listing, so a seller without any has none to answer.
  const items = await listItems();
  if (items.length === 0) return 0;

  const now = new Date();
  return allOffers().filter((offer) => isAwaitingAnswer(offer, now)).length;
}

// Fake links until the listings carry their address: the marketplace's own site.
const sampleSites: Record<Enums<'marketplace'>, string> = {
  discogs: 'https://www.discogs.com/',
  ebay: 'https://www.ebay.com/',
};

function rowFor(offer: Tables<'offers'>): OfferRow | null {
  for (const item of allItems()) {
    const listing = item.listings.find(({ id }) => id === offer.listing_id);
    if (!listing) continue;

    return {
      offer,
      item: { id: item.id, title: item.title, price_minor: item.price_minor, currency: item.currency },
      marketplace: listing.marketplace,
      listingUrl: sampleSites[listing.marketplace],
    };
  }
  return null;
}

/** Every offer on the seller's listings, answered or not, the newest first. */
export async function listOffers(): Promise<OfferRow[]> {
  return allOffers()
    .flatMap((offer) => rowFor(offer) ?? [])
    .sort((first, second) => second.offer.created_at.localeCompare(first.offer.created_at));
}

const outcomeOf: Record<OfferResponse, Enums<'offer_status'>> = {
  accept: 'accepted',
  reject: 'rejected',
};

/**
 * Answers an offer. The amount is the one the seller saw: the answer is refused if it has
 * changed, so the seller never accepts a different price than the one they confirmed.
 * Asking again with the same answer is safe and finds it done; the opposite answer is refused.
 *
 * In the real app this is an Edge Function, because only the server writes offers. There
 * the sale is recorded, and the other listings are removed, when the marketplace reports the
 * order; this sample marks the item sold at once.
 */
export async function respondOffer({
  offerId,
  response,
  amountMinor,
}: {
  offerId: string;
  response: OfferResponse;
  amountMinor: number;
}): Promise<Tables<'offers'>> {
  const now = new Date();
  const offer = allOffers().find(({ id }) => id === offerId);
  const row = offer ? rowFor(offer) : null;
  if (!offer || !row) throw new OfferError('not_found', 'This offer does not exist.');

  const marketplace = supportedMarketplaces().find(({ id }) => id === row.marketplace);
  if (!marketplace?.capabilities.respondToOffers) {
    throw new OfferError('unsupported', 'This marketplace answers offers on its own site.');
  }

  if (offer.status === outcomeOf[response]) return offer;
  if (offer.status === 'expired' || (offer.status === 'pending' && isPastExpiry(offer, now))) {
    throw new OfferError('expired', 'This offer has expired.');
  }
  if (offer.status !== 'pending') {
    throw new OfferError('already_answered', 'This offer was already answered.');
  }
  if (offer.amount_minor !== amountMinor) {
    throw new OfferError('changed', 'The buyer changed the amount.');
  }

  const answered = { ...offer, status: outcomeOf[response], updated_at: now.toISOString() };
  replaceOffer(answered);
  if (response === 'accept') markSold(row.item.id);
  return answered;
}

function markSold(itemId: string): void {
  const item = allItems().find(({ id }) => id === itemId);
  if (!item) return;

  replaceItem({
    ...item,
    status: 'sold',
    listings: item.listings.map((listing) => ({ ...listing, status: 'removed' })),
  });
}
