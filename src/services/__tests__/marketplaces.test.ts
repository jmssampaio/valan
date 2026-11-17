import { supportedMarketplaces } from '../marketplaces';

describe('supportedMarketplaces', () => {
  it('lists each marketplace with its name and what it can list', () => {
    expect(supportedMarketplaces()).toEqual([
      { id: 'discogs', name: 'Discogs', capabilities: { itemTypes: ['record'], requiresCatalogueRelease: true } },
      { id: 'ebay', name: 'eBay', capabilities: { itemTypes: ['record', 'equipment'], requiresCatalogueRelease: false } },
    ]);
  });
});
