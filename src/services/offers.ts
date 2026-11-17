import type { ListedItem } from './listings';

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

// No marketplace is connected for real yet, so no seller has an offer to answer. This counts
// the real pending offers once the offers Edge Function writes them. An offer past its time
// is not pending: the server decides, and the count must agree with the inbox.
export async function countPendingOffers(): Promise<number> {
  return 0;
}

/** Every offer on the seller's listings, answered or not, the newest first. None exist yet. */
export async function listOffers(): Promise<OfferRow[]> {
  return [];
}

/**
 * Answers an offer, with the amount the seller saw. The server (an Edge Function, because only
 * the server writes offers) refuses it, as an OfferError, when the offer has expired, changed,
 * cannot be answered from outside, or was already answered the other way; asking again with the
 * same answer finds it done. There is no such function yet, and no offer to answer.
 */
export async function respondOffer(_answer: {
  offerId: string;
  response: OfferResponse;
  amountMinor: number;
}): Promise<Tables<'offers'>> {
  throw new OfferError('unavailable', 'Answering offers needs the offers Edge Function.');
}
