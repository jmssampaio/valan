import type { ChoiceOption } from '@/components/segmented-control';
import type { TagTone } from '@/components/tag';
import { expiryLabel, marketplaceName } from '@/features/listing-detail/labels';
import { formatDate, formatPrice } from '@/features/listings/format';
import { t } from '@/i18n';
import { supportedMarketplaces } from '@/services/marketplaces';
import type { OfferRow } from '@/services/offers';
import type { Enums } from '@/types/database';

export type OfferTab = 'pending' | 'answered';

const META_SEPARATOR = ' · ';

/** True for an offer that is still pending on paper but whose time has run out. */
function hasLapsed({ offer }: OfferRow, now: Date): boolean {
  return (
    offer.status === 'pending' &&
    offer.expires_at !== null &&
    new Date(offer.expires_at).getTime() <= now.getTime()
  );
}

/** How the offer stands for the seller: a lapsed offer is expired, whatever the marketplace has said yet. */
function effectiveStatus(row: OfferRow, now: Date): Enums<'offer_status'> {
  return hasLapsed(row, now) ? 'expired' : row.offer.status;
}

function expiryTime({ offer }: OfferRow): number {
  return offer.expires_at === null ? Infinity : new Date(offer.expires_at).getTime();
}

/** The offers waiting for an answer, soonest to expire first, and the answered ones, latest first. */
export function splitOffers(
  rows: readonly OfferRow[],
  now: Date,
): { pending: OfferRow[]; answered: OfferRow[] } {
  const isPending = (row: OfferRow) => effectiveStatus(row, now) === 'pending';

  return {
    pending: rows
      .filter(isPending)
      .sort((first, second) => expiryTime(first) - expiryTime(second)),
    answered: rows
      .filter((row) => !isPending(row))
      .sort((first, second) => second.offer.updated_at.localeCompare(first.offer.updated_at)),
  };
}

export function offerTabs(pendingCount: number): ChoiceOption<OfferTab>[] {
  return [
    {
      value: 'pending',
      label: t('listings.filter.withCount', { label: t('offers.tab.pending'), count: pendingCount }),
    },
    { value: 'answered', label: t('offers.tab.answered') },
  ];
}

export type CardFacts = {
  title: string;
  /** Who offered, where, and when it expires. */
  meta: string;
  /** What the seller asks, or null when the item has no price. */
  asking: string | null;
  /** What the buyer offers. */
  price: string;
};

export function cardFacts(row: OfferRow, now: Date): CardFacts {
  const { offer, item, marketplace } = row;
  // While the offer can be answered, how long is left; after that, when it ended. The outcome
  // already says how, and saying it twice is noise.
  const when =
    effectiveStatus(row, now) === 'pending'
      ? expiryLabel(offer.expires_at, now)
      : formatDate(new Date(hasLapsed(row, now) ? (offer.expires_at as string) : offer.updated_at));

  return {
    title: item.title,
    meta: [offer.buyer, marketplaceName(marketplace), when]
      .filter((part) => part !== null && part !== '')
      .join(META_SEPARATOR),
    asking:
      item.price_minor === null
        ? null
        : t('offers.asking', { price: formatPrice(item.price_minor, item.currency) }),
    price: formatPrice(offer.amount_minor, offer.currency),
  };
}

export type OfferAction =
  | 'respond'
  | 'openOnMarketplace'
  /** The app cannot answer it and has nowhere to send the seller: it can only be answered there. */
  | 'elsewhere'
  | 'expired'
  | 'none';

/**
 * What the seller can do with the offer. Whether the app can answer it comes from what the
 * marketplace declares it supports, never from its name.
 */
export function offerAction(row: OfferRow, now: Date): OfferAction {
  const status = effectiveStatus(row, now);
  if (status === 'expired') return 'expired';
  if (status !== 'pending') return 'none';

  const marketplace = supportedMarketplaces().find(({ id }) => id === row.marketplace);
  if (marketplace?.capabilities.respondToOffers) return 'respond';
  return row.listingUrl === null ? 'elsewhere' : 'openOnMarketplace';
}

const outcomeTones: Record<Exclude<Enums<'offer_status'>, 'pending'>, TagTone> = {
  accepted: 'success',
  rejected: 'neutral',
  expired: 'waiting',
  withdrawn: 'waiting',
};

/** The outcome of an answered offer, as a tag; null for one still waiting. */
export function outcomeTag(row: OfferRow, now: Date): { label: string; tone: TagTone } | null {
  const status = effectiveStatus(row, now);
  if (status === 'pending') return null;
  return { label: t(`offers.outcome.${status}`), tone: outcomeTones[status] };
}

/** What the seller is asked before accepting: it commits them to a sale. */
export function acceptConfirmation({ offer, item }: OfferRow): { title: string; body: string } {
  const price = formatPrice(offer.amount_minor, offer.currency);

  return {
    title: t('offers.accept.title', { price }),
    body: t('offers.accept.body', {
      buyer: offer.buyer ?? t('offers.buyer.unknown'),
      title: item.title,
      price,
    }),
  };
}

/** The spoken name of a button, which says which offer it is for: several cards share a label. */
export function actionLabel(action: 'accept' | 'reject' | 'openOn', row: OfferRow): string {
  return t(`offers.action.${action}.label`, {
    price: formatPrice(row.offer.amount_minor, row.offer.currency),
    title: row.item.title,
    name: marketplaceName(row.marketplace),
  });
}
