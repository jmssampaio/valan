import { newDraft, parsePrice, withKind, withName, withoutCatalogue, withRelease, type ListingDraft } from '../draft';
import {
  canPublish,
  estimateFee,
  publishOptions,
  publishSummary,
  toggledMarketplace,
  type Connection,
} from '../publishing';

import type { CatalogueRelease } from '@/services/catalogue';
import type { MarketplaceInfo } from '@/services/marketplaces';

const release: CatalogueRelease = {
  id: 249504,
  title: 'Noites de Lisboa',
  artist: 'Os Marés',
  format: 'LP, Album',
  year: 1978,
  country: 'Portugal',
  label: 'Onda Discos',
  catalogueNumber: 'OD 1042',
};

const discogs: MarketplaceInfo = {
  id: 'discogs',
  name: 'Discogs',
  capabilities: { itemTypes: ['record'], requiresCatalogueRelease: true, respondToOffers: false },
  feeRate: 0.09,
};
const ebay: MarketplaceInfo = {
  id: 'ebay',
  name: 'eBay',
  capabilities: { itemTypes: ['record', 'equipment'], requiresCatalogueRelease: false, respondToOffers: true },
  feeRate: 0.13,
};
const marketplaces = [discogs, ebay];

const connected: Connection[] = [
  { marketplace: 'discogs', status: 'connected' },
  { marketplace: 'ebay', status: 'connected' },
];

const emptyDraft = newDraft('item-1');

const priced = (draft: ListingDraft, priceText = '28,00'): ListingDraft => ({ ...draft, priceText });
const linked = priced(withRelease(withName(emptyDraft, 'noites'), release));
const turntable = priced(withKind(withoutCatalogue(withName(emptyDraft, 'Gira-discos')), 'equipment'));

describe('parsePrice', () => {
  it.each([
    ['28', 2800],
    ['28,00', 2800],
    ['28.5', 2850],
    ['28,5', 2850],
    [' 1250,99 ', 125099],
    ['0,50', 50],
  ])('reads "%s" as %i cents', (text, minor) => {
    expect(parsePrice(text)).toBe(minor);
  });

  it.each(['', '  ', 'abc', '28,999', '28,0,0', '-5', '0', '0,00', '1e3', '28 €'])(
    'does not accept "%s"',
    (text) => {
      expect(parsePrice(text)).toBeNull();
    },
  );

  it('does not accept a price too large to be meant', () => {
    expect(parsePrice('1000000')).toBeNull();
    expect(parsePrice('999999,99')).toBe(99999999);
  });
});

describe('estimateFee', () => {
  it('takes the marketplace rate from the price, to the cent', () => {
    expect(estimateFee(2800, 0.09)).toBe(252);
    expect(estimateFee(2800, 0.13)).toBe(364);
    expect(estimateFee(999, 0.13)).toBe(130);
  });
});

describe('publishOptions', () => {
  const stateOf = (draft: ListingDraft, connections = connected) =>
    publishOptions(draft, marketplaces, connections).map(({ marketplace, state, selected, feeMinor }) => [
      marketplace.name,
      state,
      selected,
      feeMinor,
    ]);

  it('offers every connected marketplace the listing can reach, chosen and with its fee', () => {
    expect(stateOf(linked)).toEqual([
      ['Discogs', 'ready', true, 252],
      ['eBay', 'ready', true, 364],
    ]);
  });

  it('shows a marketplace the listing cannot use, with the reason, and never chooses it', () => {
    const options = publishOptions(turntable, marketplaces, connected);

    expect(options[0]).toMatchObject({ state: 'excluded', reason: 'noCatalogueRelease', selected: false, feeMinor: null });
    expect(options[1]).toMatchObject({ state: 'ready', selected: true });
  });

  it('shows a marketplace whose account is not connected, and never chooses it', () => {
    expect(stateOf(linked, [{ marketplace: 'ebay', status: 'connected' }])).toEqual([
      ['Discogs', 'notConnected', false, null],
      ['eBay', 'ready', true, 364],
    ]);
  });

  it('treats an expired or revoked connection as not connected', () => {
    const connections: Connection[] = [
      { marketplace: 'discogs', status: 'expired' },
      { marketplace: 'ebay', status: 'revoked' },
    ];

    expect(stateOf(linked, connections).map(([, state]) => state)).toEqual(['notConnected', 'notConnected']);
  });

  it('leaves out a marketplace the seller unticked, and brings it back when ticked again', () => {
    const without = toggledMarketplace(linked, 'ebay');

    expect(stateOf(without)).toEqual([
      ['Discogs', 'ready', true, 252],
      ['eBay', 'ready', false, 364],
    ]);
    expect(stateOf(toggledMarketplace(without, 'ebay'))).toEqual(stateOf(linked));
  });

  it('has no fee to estimate until the price makes sense', () => {
    expect(stateOf(priced(linked, 'abc')).map(([, , , fee]) => fee)).toEqual([null, null]);
  });
});

describe('publishing', () => {
  it('is possible with a valid price and at least one marketplace chosen', () => {
    expect(canPublish(linked, publishOptions(linked, marketplaces, connected))).toBe(true);
  });

  it('is not possible without a valid price', () => {
    const draft = priced(linked, '');

    expect(canPublish(draft, publishOptions(draft, marketplaces, connected))).toBe(false);
  });

  it('is not possible with no marketplace chosen', () => {
    const none = toggledMarketplace(toggledMarketplace(linked, 'ebay'), 'discogs');

    expect(canPublish(none, publishOptions(none, marketplaces, connected))).toBe(false);
    expect(canPublish(linked, publishOptions(linked, marketplaces, []))).toBe(false);
  });
});

describe('publishSummary', () => {
  it('counts the marketplaces the listing was published on', () => {
    expect(
      publishSummary([
        { marketplace: 'discogs', status: 'published' },
        { marketplace: 'ebay', status: 'error', reason: 'missingShippingPolicy' },
      ]),
    ).toEqual({ published: 1, total: 2 });
  });
});
