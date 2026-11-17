import { useNetworkState } from 'expo-network';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { Alert, type AlertButton } from 'react-native';

import { openExternal } from '@/services/external-link';
import { supportedMarketplaces, type MarketplaceInfo } from '@/services/marketplaces';
import {
  countPendingOffers,
  listOffers,
  OfferError,
  respondOffer,
  type OfferRow,
} from '@/services/offers';
import type { Tables } from '@/types/database';

// System boundaries: the device language, the network state and the services.
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'pt', languageTag: 'pt-PT' }],
}));
jest.mock('expo-network', () => ({ useNetworkState: jest.fn() }));
// Only the three calls are replaced; the error class stays real, so a refusal keeps its kind.
jest.mock('@/services/offers', () => ({
  ...jest.requireActual('@/services/offers'),
  countPendingOffers: jest.fn(),
  listOffers: jest.fn(),
  respondOffer: jest.fn(),
}));
jest.mock('@/services/external-link');
jest.mock('@/services/marketplaces');

const APP_DIR = 'src/app';
const OFFERS = '/offers';
const HOUR_MS = 3_600_000;

const ebay: MarketplaceInfo = {
  id: 'ebay',
  name: 'eBay',
  capabilities: { itemTypes: ['record', 'equipment'], requiresCatalogueRelease: false, respondToOffers: true },
  feeRate: 0.13,
};
const discogs: MarketplaceInfo = {
  id: 'discogs',
  name: 'Discogs',
  capabilities: { itemTypes: ['record'], requiresCatalogueRelease: true, respondToOffers: false },
  feeRate: 0.09,
};

function inHours(hours: number): string {
  return new Date(Date.now() + hours * HOUR_MS).toISOString();
}

function row(
  id: string,
  overrides: Partial<Tables<'offers'>> = {},
  marketplace: OfferRow['marketplace'] = 'ebay',
  title = 'Noites de Lisboa',
  amountMinor = 2400,
): OfferRow {
  return {
    offer: {
      id,
      user_id: 'user-1',
      listing_id: `listing-${id}`,
      external_id: id,
      buyer: 'vinil_porto',
      amount_minor: amountMinor,
      currency: 'EUR',
      status: 'pending',
      expires_at: inHours(21),
      created_at: '2026-11-16T10:00:00Z',
      updated_at: '2026-11-16T10:00:00Z',
      ...overrides,
    },
    item: { id: `item-${id}`, title, price_minor: 2800, currency: 'EUR' },
    marketplace,
    listingUrl: `https://www.${marketplace}.com/`,
  };
}

const waiting = row('offer-1');
const waitingToo = row('offer-2', { buyer: 'hifi.madrid', expires_at: inHours(50) }, 'ebay', 'Gira-discos Aurora', 15000);
const onDiscogs = row('offer-3', { buyer: 'crate_digger', expires_at: null }, 'discogs', 'Blue Harbor Sessions', 3800);
const accepted = row('offer-4', { status: 'accepted', buyer: 'north_records' }, 'ebay', 'Night Ferry', 2500);
const lapsed = row('offer-5', { expires_at: inHours(-1), buyer: 'late_buyer' }, 'ebay', 'Verde Mar', 1200);

function setOnline(isConnected: boolean) {
  jest.mocked(useNetworkState).mockReturnValue({ isConnected, isInternetReachable: isConnected });
}

/** Presses a button of the alert that was just shown. */
async function pressAlertButton(text: string) {
  const buttons: AlertButton[] = jest.mocked(Alert.alert).mock.calls.at(-1)?.[2] ?? [];
  const button = buttons.find((candidate) => candidate.text === text);
  if (!button) throw new Error(`The alert has no "${text}" button.`);
  await act(async () => button.onPress?.());
}

beforeEach(() => {
  jest.clearAllMocks();
  setOnline(true);
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.mocked(supportedMarketplaces).mockReturnValue([discogs, ebay]);
  jest.mocked(listOffers).mockResolvedValue([waiting, waitingToo, onDiscogs, accepted]);
  jest.mocked(countPendingOffers).mockResolvedValue(3);
  jest.mocked(respondOffer).mockResolvedValue(waiting.offer);
  jest.mocked(openExternal).mockResolvedValue();
});

afterEach(() => jest.restoreAllMocks());

describe('offers screen', () => {
  it('says it is loading until the offers arrive', async () => {
    let deliver: (loaded: OfferRow[]) => void = () => {};
    jest.mocked(listOffers).mockReturnValue(new Promise((resolve) => (deliver = resolve)));
    await renderRouter(APP_DIR, { initialUrl: OFFERS });

    expect(screen.getByLabelText('A carregar as propostas')).toBeOnTheScreen();

    await act(async () => deliver([waiting]));

    expect(screen.queryByLabelText('A carregar as propostas')).not.toBeOnTheScreen();
  });

  it('opens on the offers waiting for an answer, counted on its tab', async () => {
    await renderRouter(APP_DIR, { initialUrl: OFFERS });

    expect(await screen.findByRole('tab', { name: 'Pendentes · 3' })).toBeSelected();
    expect(screen.getByRole('tab', { name: 'Respondidas' })).not.toBeSelected();
    expect(screen.queryByText('Night Ferry')).not.toBeOnTheScreen();
  });

  it('shows each pending offer with the item, who offered, when it expires, what is asked and offered', async () => {
    await renderRouter(APP_DIR, { initialUrl: OFFERS });

    expect(await screen.findByText('Noites de Lisboa')).toBeOnTheScreen();
    expect(screen.getByText('vinil_porto · eBay · Expira em 21 h')).toBeOnTheScreen();
    expect(screen.getAllByText('Pedes 28 €')).toHaveLength(3);
    expect(screen.getByText('24 €')).toBeOnTheScreen();
  });

  it('puts the offer that expires first at the top', async () => {
    await renderRouter(APP_DIR, { initialUrl: OFFERS });
    await screen.findByText('Noites de Lisboa');

    const titles = screen.getAllByText(/Noites de Lisboa|Gira-discos Aurora|Blue Harbor Sessions/);

    expect(titles.map((title) => title.props.children)).toEqual([
      'Noites de Lisboa',
      'Gira-discos Aurora',
      'Blue Harbor Sessions',
    ]);
  });

  it('shows the answered offers on their own tab, each with its outcome', async () => {
    jest.mocked(listOffers).mockResolvedValue([waiting, accepted, lapsed]);
    await renderRouter(APP_DIR, { initialUrl: OFFERS });

    await fireEvent.press(await screen.findByRole('tab', { name: /Respondidas/ }));

    expect(screen.getByText('Night Ferry')).toBeOnTheScreen();
    expect(screen.getByText('Aceite')).toBeOnTheScreen();
    expect(screen.getByText('Verde Mar')).toBeOnTheScreen();
    expect(screen.getByText('Expirada')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /Aceitar/ })).not.toBeOnTheScreen();
  });

  it('counts an offer that ran out of time as answered, and says it can no longer be answered', async () => {
    jest.mocked(listOffers).mockResolvedValue([waiting, lapsed]);
    await renderRouter(APP_DIR, { initialUrl: OFFERS });

    expect(await screen.findByRole('tab', { name: 'Pendentes · 1' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('tab', { name: /Respondidas/ }));

    expect(screen.getByText('late_buyer · eBay')).toBeOnTheScreen();
    expect(screen.getByText('Expirada')).toBeOnTheScreen();
    expect(screen.getByText('Já não podes responder a esta proposta.')).toBeOnTheScreen();
  });
});

describe('offers screen, answering', () => {
  it('rejects at once, with the amount the seller saw, and loads the offers and the count again', async () => {
    await renderRouter(APP_DIR, { initialUrl: OFFERS });
    await screen.findByText('Noites de Lisboa');
    const loads = jest.mocked(listOffers).mock.calls.length;
    const counts = jest.mocked(countPendingOffers).mock.calls.length;

    await fireEvent.press(
      screen.getByRole('button', { name: 'Rejeitar a proposta de 24 € para Noites de Lisboa' }),
    );

    expect(Alert.alert).not.toHaveBeenCalled();
    expect(respondOffer).toHaveBeenCalledWith({ offerId: 'offer-1', response: 'reject', amountMinor: 2400 });
    expect(listOffers).toHaveBeenCalledTimes(loads + 1);
    expect(countPendingOffers).toHaveBeenCalledTimes(counts + 1);
  });

  it('asks before accepting, naming the buyer, the item and the amount', async () => {
    await renderRouter(APP_DIR, { initialUrl: OFFERS });

    await fireEvent.press(
      await screen.findByRole('button', { name: 'Aceitar a proposta de 24 € para Noites de Lisboa' }),
    );

    expect(Alert.alert).toHaveBeenCalledWith(
      'Aceitar 24\u00A0€?',
      'vinil_porto compra "Noites de Lisboa" por 24\u00A0€. A venda fica registada e o anúncio sai das outras plataformas. Não podes desfazer.',
      expect.any(Array),
    );
    expect(respondOffer).not.toHaveBeenCalled();
  });

  it('accepts nothing when the seller cancels', async () => {
    await renderRouter(APP_DIR, { initialUrl: OFFERS });
    await fireEvent.press(
      await screen.findByRole('button', { name: 'Aceitar a proposta de 24 € para Noites de Lisboa' }),
    );

    await pressAlertButton('Cancelar');

    expect(respondOffer).not.toHaveBeenCalled();
  });

  it('accepts once confirmed, and only once however many times it is confirmed', async () => {
    jest.mocked(respondOffer).mockReturnValue(new Promise(() => {}));
    await renderRouter(APP_DIR, { initialUrl: OFFERS });
    await fireEvent.press(
      await screen.findByRole('button', { name: 'Aceitar a proposta de 24 € para Noites de Lisboa' }),
    );

    await pressAlertButton('Aceitar');
    await pressAlertButton('Aceitar');

    expect(respondOffer).toHaveBeenCalledTimes(1);
    expect(respondOffer).toHaveBeenCalledWith({ offerId: 'offer-1', response: 'accept', amountMinor: 2400 });
  });

  it('keeps the buttons of an offer out of reach while it is being answered', async () => {
    jest.mocked(respondOffer).mockReturnValue(new Promise(() => {}));
    await renderRouter(APP_DIR, { initialUrl: OFFERS });
    const reject = await screen.findByRole('button', {
      name: 'Rejeitar a proposta de 24 € para Noites de Lisboa',
    });

    await fireEvent.press(reject);

    expect(reject).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Rejeitar a proposta de 150 € para Gira-discos Aurora' }),
    ).toBeEnabled();
  });

  it('shows the number on the tab bar again once an offer is answered', async () => {
    jest.mocked(countPendingOffers).mockResolvedValueOnce(3).mockResolvedValue(2);
    await renderRouter(APP_DIR, { initialUrl: OFFERS });
    expect(
      await screen.findByRole('tab', { name: 'Propostas', value: { text: '3 propostas por responder' } }),
    ).toBeOnTheScreen();

    await fireEvent.press(
      screen.getByRole('button', { name: 'Rejeitar a proposta de 24 € para Noites de Lisboa' }),
    );

    expect(
      await screen.findByRole('tab', { name: 'Propostas', value: { text: '2 propostas por responder' } }),
    ).toBeOnTheScreen();
  });

  it.each([
    ['expired', 'A proposta expirou. Nada foi aceite.'],
    ['changed', 'O comprador mudou o valor. Vê a proposta atualizada antes de responderes.'],
    ['already_answered', 'Esta proposta já foi respondida. A lista foi atualizada.'],
  ] as const)('says why when the answer is refused as %s, and loads the offers again', async (kind, body) => {
    jest.mocked(respondOffer).mockRejectedValue(new OfferError(kind, 'refused'));
    await renderRouter(APP_DIR, { initialUrl: OFFERS });
    await screen.findByText('Noites de Lisboa');
    const loads = jest.mocked(listOffers).mock.calls.length;

    await fireEvent.press(
      screen.getByRole('button', { name: 'Rejeitar a proposta de 24 € para Noites de Lisboa' }),
    );

    expect(Alert.alert).toHaveBeenCalledWith('Não conseguimos rejeitar a proposta', body);
    expect(listOffers).toHaveBeenCalledTimes(loads + 1);
  });

  it('says nothing changed when the answer did not get through', async () => {
    jest.mocked(respondOffer).mockRejectedValue(new Error('network'));
    await renderRouter(APP_DIR, { initialUrl: OFFERS });
    await fireEvent.press(
      await screen.findByRole('button', { name: 'Rejeitar a proposta de 24 € para Noites de Lisboa' }),
    );

    expect(Alert.alert).toHaveBeenCalledWith(
      'Não conseguimos rejeitar a proposta',
      'Nada mudou. Tenta de novo dentro de momentos.',
    );
  });
});

describe('offers screen, answering from outside', () => {
  it('offers only to open the offer on a marketplace that cannot be answered from outside', async () => {
    await renderRouter(APP_DIR, { initialUrl: OFFERS });
    await screen.findByText('Blue Harbor Sessions');

    expect(
      screen.getByRole('button', {
        name: 'Responder em Discogs à proposta de 38 € para Blue Harbor Sessions',
      }),
    ).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /Aceitar a proposta de 38/ })).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /Rejeitar a proposta de 38/ })).not.toBeOnTheScreen();
  });

  it('opens the marketplace', async () => {
    await renderRouter(APP_DIR, { initialUrl: OFFERS });

    await fireEvent.press(
      await screen.findByRole('button', {
        name: 'Responder em Discogs à proposta de 38 € para Blue Harbor Sessions',
      }),
    );

    expect(openExternal).toHaveBeenCalledWith('https://www.discogs.com/');
  });

  it('says so when the marketplace cannot be opened', async () => {
    jest.mocked(openExternal).mockRejectedValue(new Error('cannot open'));
    await renderRouter(APP_DIR, { initialUrl: OFFERS });

    await fireEvent.press(
      await screen.findByRole('button', {
        name: 'Responder em Discogs à proposta de 38 € para Blue Harbor Sessions',
      }),
    );

    expect(Alert.alert).toHaveBeenCalledWith(
      'Não conseguimos abrir Discogs',
      'Nada mudou. Tenta de novo dentro de momentos.',
    );
  });

  it('follows what each marketplace declares, not its name', async () => {
    // The two marketplaces trade places: Discogs answers from outside and eBay does not.
    jest.mocked(supportedMarketplaces).mockReturnValue([
      { ...discogs, capabilities: { ...discogs.capabilities, respondToOffers: true } },
      { ...ebay, capabilities: { ...ebay.capabilities, respondToOffers: false } },
    ]);
    await renderRouter(APP_DIR, { initialUrl: OFFERS });
    await screen.findByText('Noites de Lisboa');

    expect(
      screen.getByRole('button', { name: 'Responder em eBay à proposta de 24 € para Noites de Lisboa' }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Aceitar a proposta de 38 € para Blue Harbor Sessions' }),
    ).toBeOnTheScreen();
  });
});

describe('offers screen, when it cannot show or answer offers', () => {
  it('says what went wrong and loads again on retry', async () => {
    jest.mocked(listOffers).mockRejectedValueOnce(new Error('network'));
    await renderRouter(APP_DIR, { initialUrl: OFFERS });

    expect(await screen.findByText('Não conseguimos carregar as propostas')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));

    expect(await screen.findByText('Noites de Lisboa')).toBeOnTheScreen();
  });

  it('says there is no connection when it cannot load offline', async () => {
    setOnline(false);
    jest.mocked(listOffers).mockRejectedValue(new Error('network'));
    await renderRouter(APP_DIR, { initialUrl: OFFERS });

    expect(await screen.findByText('Estás sem ligação')).toBeOnTheScreen();
  });

  it('keeps every action out of reach while offline, and says why', async () => {
    setOnline(false);
    await renderRouter(APP_DIR, { initialUrl: OFFERS });

    expect(
      await screen.findByRole('button', { name: 'Aceitar a proposta de 24 € para Noites de Lisboa' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Rejeitar a proposta de 24 € para Noites de Lisboa' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', {
        name: 'Responder em Discogs à proposta de 38 € para Blue Harbor Sessions',
      }),
    ).toBeDisabled();
    expect(screen.getByText('Sem ligação. Não podes responder às propostas.')).toBeOnTheScreen();
  });

  it('says there are no offers yet, with no tabs', async () => {
    jest.mocked(listOffers).mockResolvedValue([]);
    await renderRouter(APP_DIR, { initialUrl: OFFERS });

    expect(await screen.findByText('Ainda não tens propostas')).toBeOnTheScreen();
    expect(screen.queryByRole('tab', { name: /Pendentes/ })).not.toBeOnTheScreen();
  });

  it('says so when no offer is waiting, with the answered ones one tab away', async () => {
    jest.mocked(listOffers).mockResolvedValue([accepted]);
    await renderRouter(APP_DIR, { initialUrl: OFFERS });

    expect(await screen.findByText('Não há propostas por responder.')).toBeOnTheScreen();
    expect(screen.getByRole('tab', { name: 'Pendentes · 0' })).toBeSelected();
  });

  it('says so when no offer was answered yet', async () => {
    jest.mocked(listOffers).mockResolvedValue([waiting]);
    await renderRouter(APP_DIR, { initialUrl: OFFERS });

    await fireEvent.press(await screen.findByRole('tab', { name: /Respondidas/ }));

    expect(screen.getByText('Ainda não respondeste a nenhuma proposta.')).toBeOnTheScreen();
  });
});

describe('offers screen, opened on an offer', () => {
  it('shows an offer that is waiting', async () => {
    await renderRouter(APP_DIR, { initialUrl: `${OFFERS}?offer=offer-2` });

    expect(await screen.findByText('Gira-discos Aurora')).toBeOnTheScreen();
    expect(screen.getByRole('tab', { name: 'Pendentes · 3' })).toBeSelected();
  });

  it('switches to the answered offers when that is where the offer is', async () => {
    await renderRouter(APP_DIR, { initialUrl: `${OFFERS}?offer=offer-4` });

    expect(await screen.findByText('Night Ferry')).toBeOnTheScreen();
    expect(screen.getByRole('tab', { name: 'Respondidas' })).toBeSelected();
  });
});
