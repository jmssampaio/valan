import type { TagTone } from '@/components/tag';
import { t, type TranslationKey } from '@/i18n';
import { formatDate, formatPrice } from '@/features/listings/format';
import { carrierOf } from '@/features/new-listing/labels';
import type { DetailListing } from '@/services/listing-detail';
import type { ListedItem, ListingSummary } from '@/services/listings';
import { supportedMarketplaces } from '@/services/marketplaces';
import type { Enums, Tables } from '@/types/database';

const DETAIL_SEPARATOR = ' · ';
const MS_PER_HOUR = 3_600_000;
const HOURS_PER_DAY = 24;

/** The brand name, read from the marketplaces the app supports so no screen writes it. */
export function marketplaceName(id: string): string {
  return supportedMarketplaces().find((marketplace) => marketplace.id === id)?.name ?? id;
}

/** "Disco VG+", "Capa VG": the medium is named after what the format says it is. */
export function conditionLines(
  item: Pick<
    ListedItem,
    'type' | 'format' | 'media_condition' | 'sleeve_condition' | 'equipment_condition'
  >,
): string[] {
  if (item.type === 'equipment') {
    return item.equipment_condition
      ? [t(`newListing.equipmentCondition.${item.equipment_condition}`)]
      : [];
  }

  const medium = t(`listingDetail.media.${carrierOf(item.format)}`);
  return [
    item.media_condition ? `${medium} ${item.media_condition}` : null,
    item.sleeve_condition ? `${t('listingDetail.sleeve')} ${item.sleeve_condition}` : null,
  ].filter((line) => line !== null);
}

/** The line under the title: what the item is, and whether buyers may make offers. */
export function detailLine(
  item: Pick<ListedItem, 'type' | 'artist' | 'format' | 'release_year' | 'accepts_offers'>,
): string {
  const parts =
    item.type === 'equipment'
      ? [t('listings.item.equipment')]
      : [item.artist, item.format, item.release_year];

  return [...parts, item.accepts_offers ? t('listingDetail.acceptsOffers') : null]
    .filter((part) => part !== null && part !== '')
    .join(DETAIL_SEPARATOR);
}

function counted(count: number, one: TranslationKey, other: TranslationKey): string {
  return t(count === 1 ? one : other, { count });
}

/** "14 visitas · 1 proposta". */
export function statsLine(visits: number, offers: number): string {
  return [
    counted(visits, 'listingDetail.visits.one', 'listingDetail.visits.other'),
    counted(offers, 'listingDetail.offers.one', 'listingDetail.offers.other'),
  ].join(DETAIL_SEPARATOR);
}

export type StatusTag = { label: string; tone: TagTone };

export function listingStatusTag(status: Enums<'listing_status'>): StatusTag | null {
  switch (status) {
    case 'published':
      return { label: t('newListing.result.published'), tone: 'success' };
    case 'error':
      return { label: t('newListing.result.error'), tone: 'error' };
    case 'pending':
      return { label: t('newListing.result.retrying'), tone: 'waiting' };
    case 'paused':
      return { label: t('listingDetail.status.paused'), tone: 'waiting' };
    case 'removed':
      return null;
  }
}

/** The second line of a marketplace row: its numbers when it is live, otherwise what is going on. */
export function listingMeta(listing: DetailListing, pendingOffers: number): string | undefined {
  const name = marketplaceName(listing.marketplace);

  switch (listing.status) {
    case 'published':
      return statsLine(listing.visits, pendingOffers);
    case 'error':
      return t(`newListing.result.reason.${listing.reason ?? 'unknown'}`, { name });
    case 'pending':
      return t('listingDetail.meta.pending', { name });
    case 'paused':
      return t('listingDetail.meta.paused');
    case 'removed':
      return undefined;
  }
}

/** How long an offer has left. Null when it does not expire. The clock is passed in. */
export function expiryLabel(expiresAt: string | null, now: Date): string | null {
  if (expiresAt === null) return null;

  const hoursLeft = (new Date(expiresAt).getTime() - now.getTime()) / MS_PER_HOUR;
  if (hoursLeft <= 0) return t('listingDetail.expired');
  if (hoursLeft < HOURS_PER_DAY) {
    return t('listingDetail.expires.hours', { count: Math.ceil(hoursLeft) });
  }

  const days = Math.floor(hoursLeft / HOURS_PER_DAY);
  return counted(days, 'listingDetail.expires.day', 'listingDetail.expires.days');
}

/** One offer as the detail screen lists it. */
export type OfferLine = {
  title: string;
  meta: string | undefined;
  price: string;
};

export function offerRow(offer: Tables<'offers'>, marketplace: string, now: Date): OfferLine {
  const name = marketplaceName(marketplace);

  return {
    title: offer.buyer ? [offer.buyer, name].join(DETAIL_SEPARATOR) : name,
    meta: expiryLabel(offer.expires_at, now) ?? undefined,
    price: formatPrice(offer.amount_minor, offer.currency),
  };
}

export type DetailAction = 'pause' | 'resume' | 'remove' | 'continueDraft' | 'deleteDraft';

/** What the seller may do with the item. The server checks it again; this only decides what to offer. */
export function availableActions(
  item: Pick<ListedItem, 'status'>,
  listings: readonly Pick<ListingSummary, 'status'>[],
): DetailAction[] {
  switch (item.status) {
    case 'draft':
      return ['continueDraft', 'deleteDraft'];
    case 'active':
      return [...pauseOrResume(listings), 'remove'];
    case 'sold':
    case 'removed':
      return [];
  }
}

function pauseOrResume(listings: readonly Pick<ListingSummary, 'status'>[]): DetailAction[] {
  const live = listings.filter(({ status }) => status !== 'removed');
  if (live.length > 0 && live.every(({ status }) => status === 'paused')) return ['resume'];
  return live.some(({ status }) => status === 'published') ? ['pause'] : [];
}

export type SaleLine = { label: string; value: string };

export function saleLines(sale: Tables<'sales'>): SaleLine[] {
  return [
    { label: t('listingDetail.sale.price'), value: formatPrice(sale.price_minor, sale.currency) },
    { label: t('listingDetail.sale.fees'), value: formatPrice(sale.fees_minor, sale.currency) },
    { label: t('listingDetail.sale.marketplace'), value: marketplaceName(sale.marketplace) },
    { label: t('listingDetail.sale.date'), value: formatDate(new Date(sale.sold_at)) },
  ];
}
