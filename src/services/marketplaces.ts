import type { Enums } from '@/types/database';

/** What a marketplace can list. It mirrors the capabilities its connector declares on the server. */
export type MarketplaceCapabilities = {
  itemTypes: readonly Enums<'item_type'>[];
  /** True when the marketplace lists only records chosen from the catalogue. */
  requiresCatalogueRelease: boolean;
  /** False when offers can only be answered on the marketplace's own site. */
  respondToOffers: boolean;
};

export type MarketplaceInfo = {
  id: string;
  /** The brand name: the same in every language. */
  name: string;
  capabilities: MarketplaceCapabilities;
  /** The share of the price the marketplace keeps, for the estimate shown before publishing. */
  feeRate: number;
};

// Written out here until an Edge Function reports what each connector declares;
// callers already get the final shape, so a new marketplace is one more entry.
const marketplaces: readonly MarketplaceInfo[] = [
  {
    id: 'discogs',
    name: 'Discogs',
    capabilities: { itemTypes: ['record'], requiresCatalogueRelease: true, respondToOffers: false },
    feeRate: 0.09,
  },
  {
    id: 'ebay',
    name: 'eBay',
    capabilities: {
      itemTypes: ['record', 'equipment'],
      requiresCatalogueRelease: false,
      respondToOffers: true,
    },
    feeRate: 0.13,
  },
];

export function supportedMarketplaces(): MarketplaceInfo[] {
  return [...marketplaces];
}
