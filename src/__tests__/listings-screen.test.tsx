import { useNetworkState } from 'expo-network';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { listItems, type ListedItem } from '@/services/listings';
import { countPendingOffers } from '@/services/offers';
import { listSales } from '@/services/sales';

// System boundaries: the device language, the network state and the services.
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'pt', languageTag: 'pt-PT' }],
}));
jest.mock('expo-network', () => ({ useNetworkState: jest.fn() }));
jest.mock('@/services/listings');
jest.mock('@/services/offers');
jest.mock('@/services/sales');

const APP_DIR = 'src/app';

function item(overrides: Partial<ListedItem>): ListedItem {
  return {
    id: 'item-1',
    user_id: 'user-1',
    type: 'record',
    title: 'Noites de Lisboa',
    artist: 'Os Marés',
    discogs_release_id: null,
    media_condition: 'VG+',
    sleeve_condition: 'VG',
    description: null,
    price_minor: 2800,
    currency: 'EUR',
    accepts_offers: true,
    status: 'active',
    created_at: '2026-11-01T10:00:00Z',
    updated_at: '2026-11-01T10:00:00Z',
    listings: [
      { id: 'listing-1', marketplace: 'discogs', status: 'published' },
      { id: 'listing-2', marketplace: 'ebay', status: 'error' },
    ],
    photo: null,
    ...overrides,
  };
}

const items = [
  item({}),
  item({ id: 'item-2', title: 'Verde Mar', artist: 'Quarteto Atlântico', price_minor: 1600, listings: [] }),
  item({ id: 'item-3', title: 'Lado B sem título', status: 'draft', price_minor: null, listings: [] }),
];

function setOnline(isConnected: boolean) {
  jest.mocked(useNetworkState).mockReturnValue({ isConnected, isInternetReachable: isConnected });
}

beforeEach(() => {
  setOnline(true);
  jest.mocked(listItems).mockResolvedValue(items);
  jest.mocked(countPendingOffers).mockResolvedValue(3);
  jest.mocked(listSales).mockResolvedValue([]);
});

describe('listings screen', () => {
  it('says it is loading until the listings arrive', async () => {
    // Held back by hand: rendering otherwise finishes after the services have already answered.
    let deliver: (loaded: ListedItem[]) => void = () => {};
    jest.mocked(listItems).mockReturnValue(new Promise((resolve) => (deliver = resolve)));
    await renderRouter(APP_DIR);

    expect(screen.getByLabelText('A carregar os anúncios')).toBeOnTheScreen();

    await act(async () => deliver(items));

    expect(screen.queryByLabelText('A carregar os anúncios')).not.toBeOnTheScreen();
    expect(screen.getByText('Noites de Lisboa')).toBeOnTheScreen();
  });

  it('shows each active listing with its detail, price and marketplaces', async () => {
    await renderRouter(APP_DIR);

    expect(await screen.findByText('Noites de Lisboa')).toBeOnTheScreen();
    expect(screen.getByText('Os Marés · VG+')).toBeOnTheScreen();
    expect(screen.getByText('28 €')).toBeOnTheScreen();
    expect(screen.getByText('eBay · erro')).toBeOnTheScreen();
    expect(screen.queryByText('Lado B sem título')).not.toBeOnTheScreen();
  });

  it('summarises active listings, pending offers and the month', async () => {
    await renderRouter(APP_DIR);

    expect(await screen.findByLabelText('Ativos: 2')).toBeOnTheScreen();
    expect(screen.getByLabelText('Propostas: 3')).toBeOnTheScreen();
  });

  it('shows only the drafts when the drafts tab is chosen', async () => {
    await renderRouter(APP_DIR);

    await fireEvent.press(await screen.findByRole('tab', { name: 'Rascunhos · 1' }));

    expect(screen.getByText('Lado B sem título')).toBeOnTheScreen();
    expect(screen.getByText('Sem preço')).toBeOnTheScreen();
    expect(screen.queryByText('Noites de Lisboa')).not.toBeOnTheScreen();
  });

  it('says so when a tab has no listings', async () => {
    await renderRouter(APP_DIR);

    await fireEvent.press(await screen.findByRole('tab', { name: 'Vendidos' }));

    expect(screen.getByText('Não há anúncios neste separador.')).toBeOnTheScreen();
  });

  it('opens a listing when its row is pressed', async () => {
    await renderRouter(APP_DIR);

    await fireEvent.press(await screen.findByRole('button', { name: /Verde Mar/ }));

    expect(screen).toHavePathname('/listing/item-2');
  });

  it('starts a new listing from the button beside the title', async () => {
    await renderRouter(APP_DIR);

    await fireEvent.press(await screen.findByRole('button', { name: 'Criar anúncio' }));

    expect(screen).toHavePathname('/new-listing/catalogue');
  });

  it('invites the seller to create the first listing when there are none', async () => {
    jest.mocked(listItems).mockResolvedValue([]);
    await renderRouter(APP_DIR);

    expect(await screen.findByRole('header', { name: 'Ainda não tens anúncios' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Criar anúncio' })).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Criar o primeiro anúncio' }));

    expect(screen).toHavePathname('/new-listing/catalogue');
  });

  it('explains a failed load and loads again on retry', async () => {
    jest.mocked(listItems).mockRejectedValueOnce(new Error('server error'));
    await renderRouter(APP_DIR);

    expect(
      await screen.findByRole('header', { name: 'Não conseguimos carregar os anúncios' }),
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));

    expect(await screen.findByText('Noites de Lisboa')).toBeOnTheScreen();
  });

  it('says the device is offline when a load fails without a connection', async () => {
    setOnline(false);
    jest.mocked(listItems).mockRejectedValue(new Error('network'));
    await renderRouter(APP_DIR);

    expect(await screen.findByRole('header', { name: 'Estás sem ligação' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeOnTheScreen();
  });

  it('loads the listings again when the list is pulled down', async () => {
    await renderRouter(APP_DIR);
    await screen.findByText('Noites de Lisboa');
    jest.mocked(listItems).mockResolvedValue([item({ title: 'Fado Elétrico' })]);

    await fireEvent(screen.getByTestId('listings-list'), 'refresh');

    expect(await screen.findByText('Fado Elétrico')).toBeOnTheScreen();
    expect(screen.queryByText('Noites de Lisboa')).not.toBeOnTheScreen();
  });

  it('keeps the listings and says so when pulling down fails to update them', async () => {
    await renderRouter(APP_DIR);
    await screen.findByText('Noites de Lisboa');
    jest.mocked(listItems).mockRejectedValue(new Error('server error'));

    await fireEvent(screen.getByTestId('listings-list'), 'refresh');

    expect(
      await screen.findByText('Não conseguimos atualizar. Puxa para baixo para tentar de novo.'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Noites de Lisboa')).toBeOnTheScreen();
  });

  it('keeps the listings and warns they may be out of date when the connection drops', async () => {
    setOnline(false);
    await renderRouter(APP_DIR);

    expect(await screen.findByText('Noites de Lisboa')).toBeOnTheScreen();
    expect(screen.getByText('Sem ligação. Estes dados podem estar desatualizados.')).toBeOnTheScreen();
  });
});
