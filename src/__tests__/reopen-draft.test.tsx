import { useNetworkState } from 'expo-network';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { searchReleases, type CatalogueRelease } from '@/services/catalogue';
import { listConnections } from '@/services/connections';
import { saveDraft } from '@/services/drafts';
import { getListingDetail, type ListingDetail } from '@/services/listing-detail';
import { listItems, type ListedItem } from '@/services/listings';
import { supportedMarketplaces, type MarketplaceInfo } from '@/services/marketplaces';
import { countPendingOffers } from '@/services/offers';
import { listSales } from '@/services/sales';

// System boundaries: the device language, the network state and the services.
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'pt', languageTag: 'pt-PT' }],
}));
jest.mock('expo-network', () => ({ useNetworkState: jest.fn() }));
jest.mock('@/services/catalogue');
jest.mock('@/services/drafts');
jest.mock('@/services/listing-detail');
jest.mock('@/services/listings');
jest.mock('@/services/marketplaces');
jest.mock('@/services/offers');
jest.mock('@/services/sales');
jest.mock('@/services/connections');

const APP_DIR = 'src/app';
const REOPEN = '/new-listing/condition?draft=item-1';

const firstPressing: CatalogueRelease = {
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

/** A record saved as a draft without a catalogue edition, graded already. */
const draftItem: ListedItem = {
  id: 'item-1',
  user_id: 'user-1',
  type: 'record',
  title: 'Noites de Lisboa',
  artist: 'Os Marés',
  discogs_release_id: null,
  format: null,
  release_year: null,
  media_condition: 'VG+',
  sleeve_condition: null,
  equipment_condition: null,
  description: null,
  price_minor: null,
  currency: 'EUR',
  accepts_offers: false,
  status: 'draft',
  created_at: '2026-11-01T10:00:00Z',
  updated_at: '2026-11-01T10:00:00Z',
  listings: [],
  photo: null,
};

function detailOf(item: ListedItem): ListingDetail {
  return { item, photos: [], listings: [], offers: [], sale: null };
}

function setOnline(isConnected: boolean) {
  jest.mocked(useNetworkState).mockReturnValue({ isConnected, isInternetReachable: isConnected });
}

beforeEach(() => {
  jest.clearAllMocks();
  setOnline(true);
  jest.mocked(supportedMarketplaces).mockReturnValue([discogs, ebay]);
  jest.mocked(searchReleases).mockResolvedValue([firstPressing]);
  jest.mocked(saveDraft).mockResolvedValue({ id: 'item-1', photosFailed: 0 });
  jest.mocked(listItems).mockResolvedValue([]);
  jest.mocked(countPendingOffers).mockResolvedValue(0);
  jest.mocked(listSales).mockResolvedValue([]);
  jest.mocked(listConnections).mockResolvedValue([]);
  jest.mocked(getListingDetail).mockResolvedValue(detailOf(draftItem));
});

describe('reopening a draft', () => {
  it('says it is opening the draft while it loads', async () => {
    let deliver: (loaded: ListingDetail) => void = () => {};
    jest.mocked(getListingDetail).mockReturnValue(new Promise((resolve) => (deliver = resolve)));
    await renderRouter(APP_DIR, { initialUrl: REOPEN });

    expect(screen.getByLabelText('A abrir o rascunho')).toBeOnTheScreen();

    await act(async () => deliver(detailOf(draftItem)));

    expect(screen.queryByLabelText('A abrir o rascunho')).not.toBeOnTheScreen();
  });

  it('opens at step 2 with what the draft already has', async () => {
    await renderRouter(APP_DIR, { initialUrl: REOPEN });

    expect(await screen.findByRole('progressbar', { name: 'Passo 2 de 4' })).toBeOnTheScreen();
    expect(screen.getAllByRole('radio', { name: 'VG+' })[0]).toBeChecked();
  });

  it('shows the photos the draft already has, and saves them with it under their own ids', async () => {
    const stored = ['photo-a', 'photo-b'].map((id) => ({
      id,
      full: { uri: `https://storage.test/.jpg`, cacheKey: id },
      small: { uri: `https://storage.test/-small.jpg`, cacheKey: `-small` },
    }));
    jest.mocked(getListingDetail).mockResolvedValue({ ...detailOf(draftItem), photos: stored });
    await renderRouter(APP_DIR, { initialUrl: REOPEN });

    expect(await screen.findByText('Fotos · 2 de 8')).toBeOnTheScreen();
    expect(screen.getByLabelText('Foto 2 de 2')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));

    expect(jest.mocked(saveDraft).mock.calls[0][0].photos.map(({ id }) => id)).toEqual([
      'photo-a',
      'photo-b',
    ]);
  });

  it('goes back to step 1 with the name filled in', async () => {
    await renderRouter(APP_DIR, { initialUrl: REOPEN });

    await fireEvent.press(await screen.findByRole('button', { name: 'Voltar' }));

    expect(screen).toHavePathname('/new-listing/catalogue');
    expect(screen.getByLabelText('Nome do que vais vender')).toHaveDisplayValue('Noites de Lisboa');
  });

  it('lets the seller pick a catalogue edition on step 1, which makes Discogs available', async () => {
    await renderRouter(APP_DIR, { initialUrl: REOPEN });
    await fireEvent.press(await screen.findByRole('button', { name: 'Voltar' }));

    await fireEvent.press(await screen.findByRole('button', { name: /1978/ }));

    expect(screen.getByLabelText('Publica em: Discogs, eBay')).toBeOnTheScreen();
  });

  it('saves under the same id when the seller leaves', async () => {
    await renderRouter(APP_DIR, { initialUrl: REOPEN });
    await fireEvent.press(await screen.findByRole('button', { name: 'Voltar' }));

    await fireEvent.press(await screen.findByRole('button', { name: 'Cancelar' }));

    expect(saveDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        // What the draft already had is not lost by opening it and leaving.
        item: expect.objectContaining({ id: 'item-1', artist: 'Os Marés' }),
      }),
    );
  });

  it('lets the seller close the sheet while the draft loads', async () => {
    jest.mocked(getListingDetail).mockReturnValue(new Promise(() => {}));
    await renderRouter(APP_DIR, { initialUrl: REOPEN });

    await fireEvent.press(screen.getByRole('button', { name: 'Fechar' }));

    expect(screen).toHavePathname('/');
  });

  it('says so when the draft cannot be opened, and tries again on request', async () => {
    jest.mocked(getListingDetail).mockRejectedValueOnce(new Error('network'));
    await renderRouter(APP_DIR, { initialUrl: REOPEN });

    expect(await screen.findByText('Não conseguimos abrir o rascunho')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));

    expect(await screen.findByRole('progressbar', { name: 'Passo 2 de 4' })).toBeOnTheScreen();
  });

  it('lets the seller close the sheet when the draft cannot be opened', async () => {
    jest.mocked(getListingDetail).mockRejectedValue(new Error('network'));
    await renderRouter(APP_DIR, { initialUrl: REOPEN });
    await screen.findByText('Não conseguimos abrir o rascunho');

    await fireEvent.press(screen.getByRole('button', { name: 'Fechar' }));

    expect(screen).toHavePathname('/');
  });

  it('says there is no connection when it cannot open the draft offline', async () => {
    setOnline(false);
    jest.mocked(getListingDetail).mockRejectedValue(new Error('network'));
    await renderRouter(APP_DIR, { initialUrl: REOPEN });

    expect(await screen.findByText('Estás sem ligação')).toBeOnTheScreen();
    expect(screen.queryByText('Não conseguimos abrir o rascunho')).not.toBeOnTheScreen();
  });

  it.each([
    ['is no longer a draft', detailOf({ ...draftItem, status: 'active' })],
    ['no longer exists', null],
  ])('says the draft is gone, with nothing to retry, when it %s', async (_case, found) => {
    jest.mocked(getListingDetail).mockResolvedValue(found);
    await renderRouter(APP_DIR, { initialUrl: REOPEN });

    expect(await screen.findByText('Este rascunho já não existe')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Tentar de novo' })).not.toBeOnTheScreen();
    expect(screen.queryByRole('progressbar')).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Fechar' }));

    expect(screen).toHavePathname('/');
  });
});
