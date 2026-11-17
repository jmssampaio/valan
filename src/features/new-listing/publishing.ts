import { marketplaceReach, parsePrice, type ListingDraft, type MarketplaceReach } from './draft';

import type { MarketplaceInfo } from '@/services/marketplaces';
import type { ListingOutcome } from '@/services/publishing';
import type { Tables } from '@/types/database';

export { parsePrice };

/** The seller's account on a marketplace, as far as the app may see it. */
export type Connection = Pick<Tables<'platform_connections'>, 'marketplace' | 'status'>;

/** What the marketplace is expected to keep of a sale, to the cent. */
export function estimateFee(priceMinor: number, rate: number): number {
  return Math.round(priceMinor * rate);
}

export type PublishOption = {
  marketplace: MarketplaceInfo;
  /**
   * 'excluded': the listing cannot go there (see reason). 'notConnected': it could, once the
   * seller connects the account. Both are shown, disabled, so nothing is left out in silence.
   */
  state: 'ready' | 'notConnected' | 'excluded';
  reason: MarketplaceReach['reason'];
  /** Will be published there. Only a ready marketplace can be. */
  selected: boolean;
  /** Null while the price is not valid, or the marketplace is not ready. */
  feeMinor: number | null;
};

/** One row per marketplace for the publish step: where the listing goes, and why not. */
export function publishOptions(
  draft: ListingDraft,
  marketplaces: readonly MarketplaceInfo[],
  connections: readonly Connection[],
): PublishOption[] {
  const priceMinor = parsePrice(draft.priceText);
  const connectedIds = new Set(
    connections.filter(({ status }) => status === 'connected').map(({ marketplace }) => marketplace),
  );

  return marketplaceReach(draft, marketplaces).map(({ marketplace, available, reason }) => {
    const state = !available
      ? 'excluded'
      : connectedIds.has(marketplace.id as Connection['marketplace'])
        ? 'ready'
        : 'notConnected';
    const ready = state === 'ready';

    return {
      marketplace,
      state,
      reason,
      selected: ready && !draft.skippedMarketplaces.includes(marketplace.id),
      feeMinor: ready && priceMinor !== null ? estimateFee(priceMinor, marketplace.feeRate) : null,
    };
  });
}

/** Ticks or unticks a marketplace. */
export function toggledMarketplace(draft: ListingDraft, marketplaceId: string): ListingDraft {
  const skipped = draft.skippedMarketplaces;
  return {
    ...draft,
    skippedMarketplaces: skipped.includes(marketplaceId)
      ? skipped.filter((id) => id !== marketplaceId)
      : [...skipped, marketplaceId],
  };
}

export function selectedMarketplaces(options: readonly PublishOption[]): MarketplaceInfo[] {
  return options.filter(({ selected }) => selected).map(({ marketplace }) => marketplace);
}

export function canPublish(draft: ListingDraft, options: readonly PublishOption[]): boolean {
  return parsePrice(draft.priceText) !== null && selectedMarketplaces(options).length > 0;
}

export function publishSummary(listings: readonly ListingOutcome[]): {
  published: number;
  total: number;
} {
  return {
    published: listings.filter(({ status }) => status === 'published').length,
    total: listings.length,
  };
}
