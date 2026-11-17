import { useNetworkState } from 'expo-network';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { Alert } from 'react-native';

import { searchReleases, type CatalogueRelease } from '@/services/catalogue';
import { saveDraft } from '@/services/drafts';
import { listItems } from '@/services/listings';
import { countPendingOffers } from '@/services/offers';
import { pickPhotos, takePhoto } from '@/services/photo-picker';
import { listSales } from '@/services/sales';

// System boundaries: the device language, the network state, the camera and the services.
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'pt', languageTag: 'pt-PT' }],
}));
jest.mock('expo-network', () => ({ useNetworkState: jest.fn() }));
jest.mock('@/services/catalogue');
jest.mock('@/services/drafts');
jest.mock('@/services/photo-picker');
jest.mock('@/services/listings');
jest.mock('@/services/offers');
jest.mock('@/services/sales');

const APP_DIR = 'src/app';
const CATALOGUE = '/new-listing/catalogue';

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
const reissue: CatalogueRelease = {
  ...firstPressing,
  id: 249505,
  format: 'LP, Reissue',
  year: 1994,
  country: 'Europa',
  catalogueNumber: 'OD 2210',
};

const alert = jest.spyOn(Alert, 'alert');

/** Presses a button of the system alert that is on screen. */
async function pressAlertButton(label: string) {
  const buttons = alert.mock.calls.at(-1)?.[2] ?? [];
  const button = buttons.find(({ text }) => text === label);
  if (!button) throw new Error(`The alert has no "${label}" button.`);
  await act(async () => button.onPress?.());
}

function setOnline(isConnected: boolean) {
  jest.mocked(useNetworkState).mockReturnValue({ isConnected, isInternetReachable: isConnected });
}

function continueButton() {
  return screen.getByRole('button', { name: 'Continuar' });
}

async function searchFor(query: string) {
  await fireEvent.changeText(screen.getByLabelText('Procurar no catálogo'), query);
}

/** Opens the flow, chooses the first pressing and moves to the second step. */
async function reachConditionWithRecord() {
  await renderRouter(APP_DIR, { initialUrl: CATALOGUE });
  await searchFor('noites');
  await fireEvent.press(await screen.findByRole('button', { name: /1978/ }));
  await fireEvent.press(continueButton());
}

async function reachConditionWithEquipment() {
  await renderRouter(APP_DIR, { initialUrl: CATALOGUE });
  await fireEvent.press(screen.getByRole('radio', { name: 'Aparelho' }));
  await fireEvent.changeText(screen.getByLabelText('Nome do aparelho'), 'Gira-discos Aurora');
  await fireEvent.press(continueButton());
}

beforeEach(() => {
  jest.clearAllMocks();
  setOnline(true);
  jest.mocked(searchReleases).mockResolvedValue([firstPressing, reissue]);
  jest.mocked(saveDraft).mockResolvedValue({ id: 'draft-1' });
  jest.mocked(listItems).mockResolvedValue([]);
  jest.mocked(countPendingOffers).mockResolvedValue(0);
  jest.mocked(listSales).mockResolvedValue([]);
});

describe('new listing, step 1: what are you selling', () => {
  it('says which step of the flow this is', async () => {
    await renderRouter(APP_DIR, { initialUrl: CATALOGUE });

    expect(screen.getByRole('progressbar', { name: 'Passo 1 de 4' })).toBeOnTheScreen();
  });

  it('asks for a search before showing anything', async () => {
    await renderRouter(APP_DIR, { initialUrl: CATALOGUE });

    expect(
      screen.getByText('Escreve o título ou o artista para encontrares a edição certa.'),
    ).toBeOnTheScreen();
    expect(searchReleases).not.toHaveBeenCalled();
  });

  it('shows the editions found, with what tells them apart', async () => {
    await renderRouter(APP_DIR, { initialUrl: CATALOGUE });

    await searchFor('noites');

    expect(await screen.findByText('Os Marés · LP, Album · 1978 · Portugal')).toBeOnTheScreen();
    expect(screen.getByText('Onda Discos – OD 1042')).toBeOnTheScreen();
    expect(screen.getByText('Os Marés · LP, Reissue · 1994 · Europa')).toBeOnTheScreen();
    expect(searchReleases).toHaveBeenCalledWith('noites');
  });

  it('cannot continue until an edition is chosen, and marks the chosen one', async () => {
    await renderRouter(APP_DIR, { initialUrl: CATALOGUE });
    await searchFor('noites');
    const edition = await screen.findByRole('button', { name: /1994/ });

    expect(continueButton()).toBeDisabled();

    await fireEvent.press(edition);

    expect(continueButton()).toBeEnabled();
    expect(screen.getByRole('button', { name: /1994/ })).toBeSelected();
    expect(screen.getByText('Selecionado')).toBeOnTheScreen();
  });

  it('says so when the catalogue has nothing by that name', async () => {
    jest.mocked(searchReleases).mockResolvedValue([]);
    await renderRouter(APP_DIR, { initialUrl: CATALOGUE });

    await searchFor('zzzz');

    expect(await screen.findByText(/Não encontrámos nada com esse nome/)).toBeOnTheScreen();
  });

  it('explains a failed search and searches again on retry', async () => {
    jest.mocked(searchReleases).mockRejectedValueOnce(new Error('server error'));
    await renderRouter(APP_DIR, { initialUrl: CATALOGUE });

    await searchFor('noites');
    expect(await screen.findByText(/Não conseguimos procurar no catálogo/)).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));

    expect(await screen.findByText('Os Marés · LP, Album · 1978 · Portugal')).toBeOnTheScreen();
  });

  it('says the device is offline when a search fails without a connection', async () => {
    setOnline(false);
    jest.mocked(searchReleases).mockRejectedValue(new Error('network'));
    await renderRouter(APP_DIR, { initialUrl: CATALOGUE });

    await searchFor('noites');

    expect(await screen.findByText(/Estás sem ligação/)).toBeOnTheScreen();
  });

  it('asks equipment for its name instead of searching the catalogue', async () => {
    await renderRouter(APP_DIR, { initialUrl: CATALOGUE });

    await fireEvent.press(screen.getByRole('radio', { name: 'Aparelho' }));

    expect(screen.queryByLabelText('Procurar no catálogo')).not.toBeOnTheScreen();
    expect(continueButton()).toBeDisabled();

    await fireEvent.changeText(screen.getByLabelText('Nome do aparelho'), 'Gira-discos Aurora');

    expect(continueButton()).toBeEnabled();
  });

  it('moves to the second step', async () => {
    await reachConditionWithRecord();

    expect(screen).toHavePathname('/new-listing/condition');
    expect(screen.getByRole('progressbar', { name: 'Passo 2 de 4' })).toBeOnTheScreen();
  });
});

describe('new listing, leaving the flow', () => {
  it('closes without saving when nothing was chosen', async () => {
    await renderRouter(APP_DIR, { initialUrl: CATALOGUE });

    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen).toHavePathname('/');
    expect(saveDraft).not.toHaveBeenCalled();
  });

  it('saves what was entered as a draft, without a status, and closes', async () => {
    await renderRouter(APP_DIR, { initialUrl: CATALOGUE });
    await searchFor('noites');
    await fireEvent.press(await screen.findByRole('button', { name: /1978/ }));

    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));

    expect(saveDraft).toHaveBeenCalledTimes(1);
    const saved = jest.mocked(saveDraft).mock.calls[0][0];
    expect(saved.item).toMatchObject({
      type: 'record',
      title: 'Noites de Lisboa',
      discogs_release_id: 249504,
      format: 'LP, Album',
      release_year: 1978,
    });
    expect(saved.item).not.toHaveProperty('status');
    expect(screen).toHavePathname('/');
  });

  it('stays open and offers a choice when the draft cannot be saved', async () => {
    jest.mocked(saveDraft).mockRejectedValue(new Error('server error'));
    await renderRouter(APP_DIR, { initialUrl: CATALOGUE });
    await searchFor('noites');
    await fireEvent.press(await screen.findByRole('button', { name: /1978/ }));

    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));

    expect(alert).toHaveBeenCalledWith(
      'Não conseguimos guardar o rascunho',
      expect.any(String),
      expect.any(Array),
    );
    expect(screen).toHavePathname(CATALOGUE);

    await pressAlertButton('Sair sem guardar');

    expect(screen).toHavePathname('/');
  });

  it('saves on a second try after a failure', async () => {
    jest.mocked(saveDraft).mockRejectedValueOnce(new Error('server error'));
    await renderRouter(APP_DIR, { initialUrl: CATALOGUE });
    await searchFor('noites');
    await fireEvent.press(await screen.findByRole('button', { name: /1978/ }));
    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));

    await pressAlertButton('Tentar de novo');

    expect(saveDraft).toHaveBeenCalledTimes(2);
    expect(screen).toHavePathname('/');
  });
});

describe('new listing, step 2: condition and photos', () => {
  it('offers the eight grades for the record and for its sleeve', async () => {
    await reachConditionWithRecord();

    expect(screen.getByLabelText('Estado do disco')).toBeOnTheScreen();
    expect(screen.getByLabelText('Estado da capa')).toBeOnTheScreen();
    expect(screen.getAllByRole('radio', { name: 'P' })).toHaveLength(2);
  });

  it('cannot continue until the record is graded, and explains the chosen grade', async () => {
    await reachConditionWithRecord();

    expect(continueButton()).toBeDisabled();

    await fireEvent.press(screen.getAllByRole('radio', { name: 'VG+' })[0]);

    expect(screen.getByText('VG+ · marcas ligeiras, toca sem saltos.')).toBeOnTheScreen();
    expect(continueButton()).toBeEnabled();
  });

  it('grades equipment on its own scale, not on the record grades', async () => {
    await reachConditionWithEquipment();

    expect(screen.queryByLabelText('Estado do disco')).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('radio', { name: 'Para peças' }));

    expect(screen.getByText('Para peças · não funciona ou precisa de reparação.')).toBeOnTheScreen();
    expect(continueButton()).toBeEnabled();
  });

  it('adds the photos chosen from the library and counts them', async () => {
    jest.mocked(pickPhotos).mockResolvedValue({
      status: 'picked',
      photos: [{ uri: 'file:///front.jpg' }, { uri: 'file:///back.jpg' }],
    });
    await reachConditionWithRecord();

    expect(screen.getByText('Fotos · 0 de 8')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Adicionar foto' }));
    await pressAlertButton('Escolher da galeria');

    expect(pickPhotos).toHaveBeenCalledWith(8);
    expect(screen.getByText('Fotos · 2 de 8')).toBeOnTheScreen();
    expect(screen.getByLabelText('Foto 2 de 2')).toBeOnTheScreen();
  });

  it('says what to do when the camera is not allowed', async () => {
    jest.mocked(takePhoto).mockResolvedValue({ status: 'denied' });
    await reachConditionWithRecord();

    await fireEvent.press(screen.getByRole('button', { name: 'Adicionar foto' }));
    await pressAlertButton('Tirar foto');

    expect(screen.getByText(/Dá-lhe acesso nas Definições/)).toBeOnTheScreen();
  });

  it('says so when a photo cannot be added', async () => {
    jest.mocked(takePhoto).mockRejectedValue(new Error('camera unavailable'));
    await reachConditionWithRecord();

    await fireEvent.press(screen.getByRole('button', { name: 'Adicionar foto' }));
    await pressAlertButton('Tirar foto');

    expect(screen.getByText('Não conseguimos adicionar a foto. Tenta de novo.')).toBeOnTheScreen();
  });

  it('removes a photo only after the seller confirms', async () => {
    jest.mocked(pickPhotos).mockResolvedValue({ status: 'picked', photos: [{ uri: 'file:///front.jpg' }] });
    await reachConditionWithRecord();
    await fireEvent.press(screen.getByRole('button', { name: 'Adicionar foto' }));
    await pressAlertButton('Escolher da galeria');

    await fireEvent.press(screen.getByLabelText('Foto 1 de 1'));

    expect(screen.getByText('Fotos · 1 de 8')).toBeOnTheScreen();

    await pressAlertButton('Remover');

    expect(screen.getByText('Fotos · 0 de 8')).toBeOnTheScreen();
  });

  it('stops offering to add photos at eight', async () => {
    jest.mocked(pickPhotos).mockResolvedValue({
      status: 'picked',
      photos: Array.from({ length: 8 }, (_, index) => ({ uri: `file:///photo-${index}.jpg` })),
    });
    await reachConditionWithRecord();
    await fireEvent.press(screen.getByRole('button', { name: 'Adicionar foto' }));
    await pressAlertButton('Escolher da galeria');

    expect(screen.getByText('Fotos · 8 de 8')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Adicionar foto' })).not.toBeOnTheScreen();
  });

  it('keeps what was entered when going back a step', async () => {
    await reachConditionWithRecord();
    await fireEvent.changeText(screen.getByLabelText('Descrição'), 'Primeira edição.');

    await fireEvent.press(screen.getByRole('button', { name: '‹ Voltar' }));

    expect(screen).toHavePathname(CATALOGUE);
    expect(screen.getByText('Selecionado')).toBeOnTheScreen();

    await fireEvent.press(continueButton());

    expect(screen.getByLabelText('Descrição')).toHaveProp('value', 'Primeira edição.');
  });

  it('saves the grades, photos and description with the draft when the flow is left', async () => {
    jest.mocked(pickPhotos).mockResolvedValue({ status: 'picked', photos: [{ uri: 'file:///front.jpg' }] });
    await reachConditionWithRecord();
    await fireEvent.press(screen.getAllByRole('radio', { name: 'VG+' })[0]);
    await fireEvent.press(screen.getAllByRole('radio', { name: 'VG' })[1]);
    await fireEvent.press(screen.getByRole('button', { name: 'Adicionar foto' }));
    await pressAlertButton('Escolher da galeria');
    await fireEvent.changeText(screen.getByLabelText('Descrição'), 'Primeira edição.');

    await fireEvent.press(screen.getByRole('button', { name: '‹ Voltar' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));

    expect(jest.mocked(saveDraft).mock.calls[0][0]).toMatchObject({
      item: { media_condition: 'VG+', sleeve_condition: 'VG', description: 'Primeira edição.' },
      photos: [{ uri: 'file:///front.jpg' }],
    });
  });

  it('moves to the third step', async () => {
    await reachConditionWithRecord();
    await fireEvent.press(screen.getAllByRole('radio', { name: 'VG+' })[0]);

    await fireEvent.press(continueButton());

    expect(screen).toHavePathname('/new-listing/price');
  });
});
