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

async function typeName(name: string) {
  await fireEvent.changeText(screen.getByLabelText('Nome do que vais vender'), name);
}

/** Opens the flow, chooses the first pressing and moves to the second step. */
async function reachConditionWithRecord() {
  await renderRouter(APP_DIR, { initialUrl: CATALOGUE });
  await typeName('noites');
  await fireEvent.press(await screen.findByRole('button', { name: /1978/ }));
  await fireEvent.press(continueButton());
}

/** Opens the flow with something the catalogue does not have and says it is not a record. */
async function reachConditionWithAnotherItem() {
  jest.mocked(searchReleases).mockResolvedValue([]);
  await renderRouter(APP_DIR, { initialUrl: CATALOGUE });
  await typeName('Gira-discos Aurora T-200');
  await fireEvent.press(await screen.findByRole('radio', { name: 'Outro artigo' }));
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

  it('asks only for a name, with no kind of item to choose up front', async () => {
    await renderRouter(APP_DIR, { initialUrl: CATALOGUE });

    expect(screen.getByLabelText('Nome do que vais vender')).toBeOnTheScreen();
    expect(screen.queryByRole('radio')).not.toBeOnTheScreen();
    expect(continueButton()).toBeDisabled();
    expect(searchReleases).not.toHaveBeenCalled();
  });

  it('does not search for a single letter', async () => {
    await renderRouter(APP_DIR, { initialUrl: CATALOGUE });

    await typeName('n');

    expect(
      screen.getByText('Se for um disco, escolhe a tua edição para publicar também no Discogs.'),
    ).toBeOnTheScreen();
    expect(searchReleases).not.toHaveBeenCalled();
  });

  it('suggests the catalogue editions that match the name, with what tells them apart', async () => {
    await renderRouter(APP_DIR, { initialUrl: CATALOGUE });

    await typeName('noites');

    expect(await screen.findByText('Os Marés · LP, Album · 1978 · Portugal')).toBeOnTheScreen();
    expect(screen.getByText('Onda Discos – OD 1042')).toBeOnTheScreen();
    expect(screen.getByText('Os Marés · LP, Reissue · 1994 · Europa')).toBeOnTheScreen();
    expect(searchReleases).toHaveBeenCalledWith('noites');
  });

  it('waits for the seller to choose an edition or say it is none of them', async () => {
    await renderRouter(APP_DIR, { initialUrl: CATALOGUE });
    await typeName('noites');
    await screen.findByRole('button', { name: /1994/ });

    expect(continueButton()).toBeDisabled();
    expect(screen.queryByText('Publica em')).not.toBeOnTheScreen();
  });

  it('links the listing to the chosen edition, which can go to Discogs and eBay', async () => {
    await renderRouter(APP_DIR, { initialUrl: CATALOGUE });
    await typeName('noites');

    await fireEvent.press(await screen.findByRole('button', { name: /1994/ }));

    expect(screen.getByRole('button', { name: /1994/ })).toBeSelected();
    expect(screen.getByLabelText('Publica em: Discogs, eBay')).toBeOnTheScreen();
    expect(screen.queryByText('Este anúncio não vai para o Discogs')).not.toBeOnTheScreen();
    expect(screen.queryByRole('radio')).not.toBeOnTheScreen();
    expect(continueButton()).toBeEnabled();
  });

  it('keeps the chosen edition in view when the name changes and it is no longer found', async () => {
    await renderRouter(APP_DIR, { initialUrl: CATALOGUE });
    await typeName('noites');
    await fireEvent.press(await screen.findByRole('button', { name: /1978/ }));
    jest.mocked(searchReleases).mockResolvedValue([reissue]);

    await typeName('reissue');

    expect(await screen.findByRole('button', { name: /1994/ })).not.toBeSelected();
    expect(screen.getByRole('button', { name: /1978/ })).toBeSelected();
    expect(continueButton()).toBeEnabled();
  });

  it('goes on without the catalogue when it is none of the editions, and says what that means', async () => {
    await renderRouter(APP_DIR, { initialUrl: CATALOGUE });
    await typeName('noites');

    await fireEvent.press(await screen.findByRole('button', { name: /Não é nenhuma destas/ }));

    expect(screen.getByText('Este anúncio não vai para o Discogs')).toBeOnTheScreen();
    expect(screen.getByText(/O Discogs só aceita discos que existam no seu catálogo/)).toBeOnTheScreen();
    expect(screen.getByLabelText('Publica em: eBay')).toBeOnTheScreen();
  });

  it('asks what kind of item it is only when going on without the catalogue', async () => {
    await renderRouter(APP_DIR, { initialUrl: CATALOGUE });
    await typeName('noites');
    await fireEvent.press(await screen.findByRole('button', { name: /Não é nenhuma destas/ }));

    expect(screen.getByRole('radio', { name: 'Disco' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Outro artigo' })).not.toBeChecked();
    expect(continueButton()).toBeDisabled();

    await fireEvent.press(screen.getByRole('radio', { name: 'Disco' }));

    expect(continueButton()).toBeEnabled();
  });

  it('lets the seller choose an edition after all', async () => {
    await renderRouter(APP_DIR, { initialUrl: CATALOGUE });
    await typeName('noites');
    await fireEvent.press(await screen.findByRole('button', { name: /Não é nenhuma destas/ }));

    await fireEvent.press(screen.getByRole('button', { name: /1978/ }));

    expect(screen.queryByText('Este anúncio não vai para o Discogs')).not.toBeOnTheScreen();
    expect(screen.getByLabelText('Publica em: Discogs, eBay')).toBeOnTheScreen();
  });

  it('goes on with the typed name when the catalogue has no edition by that name', async () => {
    jest.mocked(searchReleases).mockResolvedValue([]);
    await renderRouter(APP_DIR, { initialUrl: CATALOGUE });

    await typeName('Gira-discos Aurora T-200');

    expect(await screen.findByText('Nenhuma edição encontrada com este nome.')).toBeOnTheScreen();
    expect(screen.getByText('Este anúncio não vai para o Discogs')).toBeOnTheScreen();
    expect(screen.getByLabelText('Publica em: eBay')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('radio', { name: 'Outro artigo' }));

    expect(continueButton()).toBeEnabled();
  });

  it('never blocks: a failed search still lets the seller continue without the catalogue', async () => {
    jest.mocked(searchReleases).mockRejectedValue(new Error('server error'));
    await renderRouter(APP_DIR, { initialUrl: CATALOGUE });

    await typeName('noites');

    expect(await screen.findByText('Não conseguimos procurar no catálogo Discogs.')).toBeOnTheScreen();
    expect(screen.getByText(/Sem a edição do catálogo, o anúncio só pode ir para o eBay/)).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('radio', { name: 'Disco' }));

    expect(continueButton()).toBeEnabled();
  });

  it('searches again on retry, and offers the editions it then finds', async () => {
    jest.mocked(searchReleases).mockRejectedValueOnce(new Error('server error'));
    await renderRouter(APP_DIR, { initialUrl: CATALOGUE });
    await typeName('noites');
    await screen.findByText('Não conseguimos procurar no catálogo Discogs.');

    await fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));

    expect(await screen.findByText('Os Marés · LP, Album · 1978 · Portugal')).toBeOnTheScreen();
    expect(screen.queryByText('Este anúncio não vai para o Discogs')).not.toBeOnTheScreen();
  });

  it('says the device is offline when a search fails without a connection, and still continues', async () => {
    setOnline(false);
    jest.mocked(searchReleases).mockRejectedValue(new Error('network'));
    await renderRouter(APP_DIR, { initialUrl: CATALOGUE });

    await typeName('noites');

    expect(await screen.findByText(/Estás sem ligação/)).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('radio', { name: 'Disco' }));

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
    await typeName('noites');
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

  it('saves an item that is not in the catalogue under the name the seller typed', async () => {
    jest.mocked(searchReleases).mockResolvedValue([]);
    await renderRouter(APP_DIR, { initialUrl: CATALOGUE });
    await typeName('Gira-discos Aurora T-200');
    await fireEvent.press(await screen.findByRole('radio', { name: 'Outro artigo' }));

    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));

    expect(jest.mocked(saveDraft).mock.calls[0][0].item).toMatchObject({
      type: 'equipment',
      title: 'Gira-discos Aurora T-200',
      discogs_release_id: null,
    });
  });

  it('stays open and offers a choice when the draft cannot be saved', async () => {
    jest.mocked(saveDraft).mockRejectedValue(new Error('server error'));
    await renderRouter(APP_DIR, { initialUrl: CATALOGUE });
    await typeName('noites');
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

  it('lets the seller stay and keep editing when the draft cannot be saved', async () => {
    jest.mocked(saveDraft).mockRejectedValue(new Error('server error'));
    await renderRouter(APP_DIR, { initialUrl: CATALOGUE });
    await typeName('noites');
    await fireEvent.press(await screen.findByRole('button', { name: /1978/ }));
    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));

    await pressAlertButton('Continuar a editar');

    expect(screen).toHavePathname(CATALOGUE);
    expect(screen.getByRole('button', { name: /1978/ })).toBeSelected();
  });

  it('saves on a second try after a failure', async () => {
    jest.mocked(saveDraft).mockRejectedValueOnce(new Error('server error'));
    await renderRouter(APP_DIR, { initialUrl: CATALOGUE });
    await typeName('noites');
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

  it('grades another kind of item on its own scale, not on the record grades', async () => {
    await reachConditionWithAnotherItem();

    expect(screen.queryByLabelText('Estado do disco')).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('radio', { name: 'Para peças' }));

    expect(screen.getByText('Para peças · não funciona ou precisa de reparação.')).toBeOnTheScreen();
    expect(continueButton()).toBeEnabled();
  });

  it('grades a record that is not in the catalogue like any other record', async () => {
    jest.mocked(searchReleases).mockResolvedValue([]);
    await renderRouter(APP_DIR, { initialUrl: CATALOGUE });
    await typeName('Noites de Lisboa (promo)');
    await fireEvent.press(await screen.findByRole('radio', { name: 'Disco' }));
    await fireEvent.press(continueButton());

    expect(screen.getByLabelText('Estado do disco')).toBeOnTheScreen();
    expect(screen.getByLabelText('Estado da capa')).toBeOnTheScreen();
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

    await fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));

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

    await fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));
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
