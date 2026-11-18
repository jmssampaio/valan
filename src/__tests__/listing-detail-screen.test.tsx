import { useNetworkState } from 'expo-network';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { Alert, type AlertButton } from 'react-native';

import {
  deleteDraft,
  getListingDetail,
  type DetailListing,
  type ListingDetail,
} from '@/services/listing-detail';
import type { ListedItem } from '@/services/listings';
import type { Tables } from '@/types/database';

// System boundaries: the device language, the network state and the service.
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'pt', languageTag: 'pt-PT' }],
}));
jest.mock('expo-network', () => ({ useNetworkState: jest.fn() }));
jest.mock('@/services/listing-detail');

const APP_DIR = 'src/app';
const URL = '/listing/item-1';

function item(overrides: Partial<ListedItem> = {}): ListedItem {
  return {
    id: 'item-1',
    user_id: 'user-1',
    type: 'record',
    title: 'Noites de Lisboa',
    artist: 'Os Marés',
    discogs_release_id: 249504,
    format: 'LP, Album',
    release_year: 1978,
    media_condition: 'VG+',
    sleeve_condition: 'VG',
    equipment_condition: null,
    description: null,
    price_minor: 2800,
    currency: 'EUR',
    accepts_offers: true,
    status: 'active',
    created_at: '2026-11-01T10:00:00Z',
    updated_at: '2026-11-01T10:00:00Z',
    listings: [],
    photo: null,
    ...overrides,
  };
}

const discogs: DetailListing = {
  id: 'listing-discogs',
  marketplace: 'discogs',
  status: 'published',
  reason: null,
  visits: 14,
};
const ebay: DetailListing = {
  id: 'listing-ebay',
  marketplace: 'ebay',
  status: 'published',
  reason: null,
  visits: 32,
};

const offer: Tables<'offers'> = {
  id: 'offer-1',
  user_id: 'user-1',
  listing_id: 'listing-ebay',
  external_id: 'x',
  buyer: 'vinil_porto',
  amount_minor: 2400,
  currency: 'EUR',
  status: 'pending',
  expires_at: null,
  created_at: '2026-11-16T10:00:00Z',
  updated_at: '2026-11-16T10:00:00Z',
};

function detail(overrides: Partial<ListingDetail> = {}): ListingDetail {
  return { item: item(), photos: [], listings: [discogs, ebay], offers: [offer], sale: null, ...overrides };
}

function setOnline(isConnected: boolean) {
  jest.mocked(useNetworkState).mockReturnValue({ isConnected, isInternetReachable: isConnected });
}

/** Presses the button of the confirmation that was just shown. */
async function answerAlert(style: AlertButton['style']) {
  const alertSpy = jest.mocked(Alert.alert);
  const buttons = alertSpy.mock.calls.at(-1)?.[2] ?? [];
  const button = buttons.find((candidate) => candidate.style === style);
  await act(async () => button?.onPress?.());
}

beforeEach(() => {
  jest.clearAllMocks();
  setOnline(true);
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.mocked(getListingDetail).mockResolvedValue(detail());
  jest.mocked(deleteDraft).mockResolvedValue();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('listing detail screen', () => {
  it('says it is loading until the item arrives', async () => {
    let deliver: (loaded: ListingDetail) => void = () => {};
    jest.mocked(getListingDetail).mockReturnValue(new Promise((resolve) => (deliver = resolve)));
    await renderRouter(APP_DIR, { initialUrl: URL });

    expect(screen.getByLabelText('A carregar o anúncio')).toBeOnTheScreen();

    await act(async () => deliver(detail()));

    expect(screen.queryByLabelText('A carregar o anúncio')).not.toBeOnTheScreen();
  });

  it('shows the item with its price, condition and details', async () => {
    await renderRouter(APP_DIR, { initialUrl: URL });

    expect(await screen.findByRole('header', { name: 'Noites de Lisboa' })).toBeOnTheScreen();
    expect(screen.getByText('28 €')).toBeOnTheScreen();
    expect(screen.getByText('Disco VG+')).toBeOnTheScreen();
    expect(screen.getByText('Capa VG')).toBeOnTheScreen();
    expect(screen.getByText('Os Marés · LP, Album · 1978 · Aceita propostas')).toBeOnTheScreen();
  });

  it('does not offer to edit the listing yet', async () => {
    await renderRouter(APP_DIR, { initialUrl: URL });
    await screen.findByText('Noites de Lisboa');

    expect(screen.queryByText('Editar')).not.toBeOnTheScreen();
  });

  it('shows each marketplace with its status, visits and offers', async () => {
    await renderRouter(APP_DIR, { initialUrl: URL });

    expect(await screen.findByText('Discogs')).toBeOnTheScreen();
    expect(screen.getByText('14 visitas · 0 propostas')).toBeOnTheScreen();
    expect(screen.getByText('32 visitas · 1 proposta')).toBeOnTheScreen();
    expect(screen.getAllByText('Publicado')).toHaveLength(2);
  });

  it('shows the reason a marketplace refused the listing; trying again is not available yet', async () => {
    const refused: DetailListing = { ...ebay, status: 'error', reason: 'missingShippingPolicy', visits: 0 };
    jest.mocked(getListingDetail).mockResolvedValue(detail({ listings: [discogs, refused], offers: [] }));
    await renderRouter(APP_DIR, { initialUrl: URL });

    expect(await screen.findByText(/Falta definir a política de envio na tua conta eBay/)).toBeOnTheScreen();
    expect(screen.getByText('Erro')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeDisabled();
  });

  it('leaves the visits out when the marketplace has not reported any', async () => {
    jest.mocked(getListingDetail).mockResolvedValue(
      detail({ listings: [{ ...discogs, visits: null }], offers: [] }),
    );
    await renderRouter(APP_DIR, { initialUrl: URL });

    expect(await screen.findByText('0 propostas')).toBeOnTheScreen();
    expect(screen.queryByText(/visitas/)).not.toBeOnTheScreen();
  });

  it('lists the pending offers and opens Propostas from one', async () => {
    await renderRouter(APP_DIR, { initialUrl: URL });

    expect(await screen.findByText('vinil_porto · eBay')).toBeOnTheScreen();
    expect(screen.getByText('24 €')).toBeOnTheScreen();

    await fireEvent.press(
      screen.getByRole('button', { name: 'Ver a proposta de 24\u00A0€ de vinil_porto · eBay' }),
    );

    expect(screen).toHavePathname('/offers');
    // The offer is named, so the inbox can bring it into view.
    expect(screen).toHaveSearchParams({ offer: 'offer-1' });
  });

  it('leaves out the offers section when there are none', async () => {
    jest.mocked(getListingDetail).mockResolvedValue(detail({ offers: [] }));
    await renderRouter(APP_DIR, { initialUrl: URL });
    await screen.findByText('Discogs');

    expect(screen.queryByText('Propostas')).not.toBeOnTheScreen();
  });

  // Pausing, resuming and removing change what is on the marketplaces, which only the
  // server may do. Until it can, they are shown so the seller knows they are coming.
  it('shows pausing and removing as coming soon, and neither can be pressed', async () => {
    await renderRouter(APP_DIR, { initialUrl: URL });

    expect(await screen.findByRole('button', { name: 'Pausar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Remover' })).toBeDisabled();
    expect(
      screen.getByText('Pausar, retomar e remover anúncios fica disponível em breve.'),
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Remover' }));

    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('shows resuming as coming soon for a listing that is paused', async () => {
    const paused = [discogs, ebay].map((listing) => ({ ...listing, status: 'paused' as const }));
    jest.mocked(getListingDetail).mockResolvedValue(detail({ listings: paused }));
    await renderRouter(APP_DIR, { initialUrl: URL });

    expect(await screen.findByRole('button', { name: 'Retomar' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Pausar' })).not.toBeOnTheScreen();
  });

  it('says there is no connection while offline', async () => {
    setOnline(false);
    await renderRouter(APP_DIR, { initialUrl: URL });

    expect(
      await screen.findByText('Sem ligação. Não podes alterar este anúncio.'),
    ).toBeOnTheScreen();
  });
});

describe('listing detail screen, a draft', () => {
  const draftItem = item({ status: 'draft', price_minor: null });

  beforeEach(() => {
    jest
      .mocked(getListingDetail)
      .mockResolvedValue({ item: draftItem, photos: [], listings: [], offers: [], sale: null });
  });

  it('shows what the draft has and no marketplaces', async () => {
    await renderRouter(APP_DIR, { initialUrl: URL });

    expect(await screen.findByRole('header', { name: 'Noites de Lisboa' })).toBeOnTheScreen();
    expect(screen.getByText('Sem preço')).toBeOnTheScreen();
    expect(screen.queryByText('Plataformas')).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Pausar' })).not.toBeOnTheScreen();
  });

  it('reopens the new-listing flow with the draft', async () => {
    await renderRouter(APP_DIR, { initialUrl: URL });

    await fireEvent.press(await screen.findByRole('button', { name: 'Continuar rascunho' }));

    expect(screen).toHavePathname('/new-listing/condition');
    expect(screen).toHaveSearchParams({ draft: 'item-1' });
  });

  it('deletes the draft only after the seller confirms', async () => {
    await renderRouter(APP_DIR, { initialUrl: URL });

    await fireEvent.press(await screen.findByRole('button', { name: 'Eliminar rascunho' }));
    expect(deleteDraft).not.toHaveBeenCalled();

    await answerAlert('destructive');

    expect(deleteDraft).toHaveBeenCalledWith('item-1');
    expect(screen).toHavePathname('/');
  });
});

describe('listing detail screen, a sold item', () => {
  const sale: Tables<'sales'> = {
    id: 'sale-1',
    user_id: 'user-1',
    listing_id: null,
    marketplace: 'ebay',
    item_title: 'Noites de Lisboa',
    item_artist: 'Os Marés',
    external_order_id: 'order-1',
    price_minor: 2800,
    fees_minor: 364,
    currency: 'EUR',
    buyer: null,
    sold_at: '2026-11-03T09:00:00Z',
    created_at: '2026-11-03T09:00:00Z',
  };

  it('shows the sale and no actions', async () => {
    jest
      .mocked(getListingDetail)
      .mockResolvedValue({ item: item({ status: 'sold' }), photos: [], listings: [], offers: [], sale });
    await renderRouter(APP_DIR, { initialUrl: URL });

    expect(await screen.findByText('Vendido por')).toBeOnTheScreen();
    expect(screen.getByText('3,64 €')).toBeOnTheScreen();
    expect(screen.getByText('eBay')).toBeOnTheScreen();
    expect(screen.getByText('3/11/2026')).toBeOnTheScreen();
    expect(screen.queryByRole('button')).not.toBeOnTheScreen();
  });
});

describe('listing detail screen, when it cannot show the item', () => {
  it('says the listing no longer exists, and leads back to Anúncios', async () => {
    jest.mocked(getListingDetail).mockResolvedValue(null);
    await renderRouter(APP_DIR, { initialUrl: URL });

    expect(await screen.findByText('Este anúncio já não existe')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Ir para Anúncios' }));

    expect(screen).toHavePathname('/');
  });

  it('says what went wrong and loads again on retry', async () => {
    jest.mocked(getListingDetail).mockRejectedValueOnce(new Error('network'));
    await renderRouter(APP_DIR, { initialUrl: URL });

    expect(await screen.findByText('Não conseguimos carregar o anúncio')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));

    expect(await screen.findByRole('header', { name: 'Noites de Lisboa' })).toBeOnTheScreen();
  });

  it('says there is no connection when it cannot load offline', async () => {
    setOnline(false);
    jest.mocked(getListingDetail).mockRejectedValue(new Error('network'));
    await renderRouter(APP_DIR, { initialUrl: URL });

    expect(await screen.findByText('Estás sem ligação')).toBeOnTheScreen();
  });
});
