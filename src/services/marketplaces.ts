import type { Enums } from '@/types/database';

/** What a marketplace can list. It mirrors the capabilities its connector declares on the server. */
export type MarketplaceCapabilities = {
  itemTypes: readonly Enums<'item_type'>[];
  /** True when the marketplace lists only records chosen from the catalogue. */
  requiresCatalogueRelease: boolean;
};

export type MarketplaceInfo = {
  id: string;
  /** The brand name: the same in every language. */
  name: string;
  capabilities: MarketplaceCapabilities;
};

// Written out here until an Edge Function reports what each connector declares;
// callers already get the final shape, so a new marketplace is one more entry.
const marketplaces: readonly MarketplaceInfo[] = [
  {
    id: 'discogs',
    name: 'Discogs',
    capabilities: { itemTypes: ['record'], requiresCatalogueRelease: true },
  },
  {
    id: 'ebay',
    name: 'eBay',
    capabilities: { itemTypes: ['record', 'equipment'], requiresCatalogueRelease: false },
  },
];

export function supportedMarketplaces(): MarketplaceInfo[] {
  return [...marketplaces];
}
