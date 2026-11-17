import type { ChoiceOption } from '@/components/segmented-control';
import type { TagTone } from '@/components/tag';
import { t, type TranslationKey } from '@/i18n';
import type { ListedItem, ListingSummary } from '@/services/listings';
import type { Enums, Tables } from '@/types/database';

export type ListingFilter = 'active' | 'drafts' | 'sold';

const statusByFilter: Record<ListingFilter, Enums<'item_status'>> = {
  active: 'active',
  drafts: 'draft',
  sold: 'sold',
};

const labelKeyByFilter: Record<ListingFilter, TranslationKey> = {
  active: 'listings.filter.active',
  drafts: 'listings.filter.drafts',
  sold: 'listings.filter.sold',
};

// The sold tab grows without limit, so its count would say little; the mockup leaves it out.
const countedFilters: readonly ListingFilter[] = ['active', 'drafts'];

const marketplaceNames: Record<Enums<'marketplace'>, string> = {
  discogs: 'Discogs',
  ebay: 'eBay',
};

const DETAIL_SEPARATOR = ' · ';

export function itemsForFilter(items: readonly ListedItem[], filter: ListingFilter): ListedItem[] {
  return items.filter((item) => item.status === statusByFilter[filter]);
}

export function filterOptions(items: readonly ListedItem[]): ChoiceOption<ListingFilter>[] {
  return (Object.keys(statusByFilter) as ListingFilter[]).map((filter) => {
    const label = t(labelKeyByFilter[filter]);
    if (!countedFilters.includes(filter)) return { value: filter, label };

    const count = itemsForFilter(items, filter).length;
    return { value: filter, label: t('listings.filter.withCount', { label, count }) };
  });
}

/** "LP" from the catalogue's "LP, Album, Reissue": a row has room for the carrier only. */
function mainFormat(format: string | null): string | null {
  return format?.split(',')[0].trim() || null;
}

/** The second line of a row: what the item is, in as much detail as it has so far. */
export function itemDetail(
  item: Pick<Tables<'items'>, 'type' | 'artist' | 'format' | 'media_condition'>,
): string {
  if (item.type === 'equipment') return t('listings.item.equipment');

  return [item.artist, mainFormat(item.format), item.media_condition]
    .filter(Boolean)
    .join(DETAIL_SEPARATOR);
}

export type ListingTag = {
  key: string;
  label: string;
  tone: TagTone;
};

export function listingTags(listings: readonly ListingSummary[]): ListingTag[] {
  return listings.flatMap((listing): ListingTag[] => {
    const marketplace = marketplaceNames[listing.marketplace];
    switch (listing.status) {
      case 'published':
        return [{ key: listing.id, label: marketplace, tone: 'neutral' }];
      case 'error':
        return [{ key: listing.id, label: t('listings.tag.error', { marketplace }), tone: 'error' }];
      case 'pending':
        return [
          { key: listing.id, label: t('listings.tag.pending', { marketplace }), tone: 'waiting' },
        ];
      case 'paused':
        return [
          { key: listing.id, label: t('listings.tag.paused', { marketplace }), tone: 'waiting' },
        ];
      case 'removed':
        return [];
    }
  });
}

export type ListingsSummary = {
  activeCount: number;
  pendingOffers: number;
  soldThisMonthMinor: number;
  currency: string;
  month: Date;
};

const DEFAULT_CURRENCY = 'EUR';

function isSameMonth(first: Date, second: Date): boolean {
  return first.getFullYear() === second.getFullYear() && first.getMonth() === second.getMonth();
}

export function summarise({
  items,
  pendingOffers,
  sales,
  now,
}: {
  items: readonly ListedItem[];
  pendingOffers: number;
  sales: readonly Tables<'sales'>[];
  now: Date;
}): ListingsSummary {
  const salesThisMonth = sales.filter((sale) => isSameMonth(new Date(sale.sold_at), now));

  return {
    activeCount: itemsForFilter(items, 'active').length,
    pendingOffers,
    soldThisMonthMinor: salesThisMonth.reduce((total, sale) => total + sale.price_minor, 0),
    currency: salesThisMonth[0]?.currency ?? DEFAULT_CURRENCY,
    month: now,
  };
}
