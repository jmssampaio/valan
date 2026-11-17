import { useNetworkState } from 'expo-network';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { ActionSheetIOS, Alert } from 'react-native';

import { searchReleases, type CatalogueRelease } from '@/services/catalogue';
import { listConnections, type ConnectionSummary } from '@/services/connections';
import { saveDraft } from '@/services/drafts';
import { listItems } from '@/services/listings';
import { supportedMarketplaces, type MarketplaceInfo } from '@/services/marketplaces';
import { countPendingOffers } from '@/services/offers';
import { pickPhotos, takePhoto } from '@/services/photo-picker';
import { publishItem, retryListing } from '@/services/publishing';
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
jest.mock('@/services/marketplaces');
jest.mock('@/services/offers');
jest.mock('@/services/sales');
jest.mock('@/services/connections');
jest.mock('@/services/publishing');

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
/** A third marketplace that lists both kinds of item, to prove the texts are not written for two. */
const reverb: MarketplaceInfo = {
  id: 'reverb',
  name: 'Reverb',
  capabilities: { itemTypes: ['record', 'equipment'], requiresCatalogueRelease: false, respondToOffers: true },
  feeRate: 0.13,
};

const alert = jest.spyOn(Alert, 'alert');

/** Presses a button of the system alert that is on screen. */
async function pressAlertButton(label: string) {
  const buttons = alert.mock.calls.at(-1)?.[2] ?? [];
  const button = buttons.find(({ text }) => text === label);
  if (!button) throw new Error(`The alert has no "${label}" button.`);
  await act(async () => button.onPress?.());
}

const actionSheet = jest.spyOn(ActionSheetIOS, 'showActionSheetWithOptions').mockImplementation(() => {});

/** Chooses an option of the system action sheet that is on screen. */
async function chooseFromSheet(label: string) {
  const [sheet, choose] = actionSheet.mock.calls.at(-1) ?? [];
  const index = sheet?.options.indexOf(label) ?? -1;
  if (index === -1) throw new Error(`The action sheet has no "" option.`);
  await act(async () => choose?.(index));
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

function connection(marketplace: ConnectionSummary['marketplace']): ConnectionSummary {
  return { id: `connection-`, user_id: 'user-1', marketplace, status: 'connected' };
}

/** Goes through the first two steps with the first pressing, graded VG+. */
async function reachPriceWithRecord() {
  await reachConditionWithRecord();
  await fireEvent.press(screen.getAllByRole('radio', { name: 'VG+' })[0]);
  await fireEvent.press(continueButton());
  await screen.findByRole('checkbox', { name: /eBay/ });
}

/** Goes through the first two steps with something the catalogue does not have. */
async function reachPriceWithAnotherItem() {
  await reachConditionWithAnotherItem();
  await fireEvent.press(screen.getByRole('radio', { name: 'Bom' }));
  await fireEvent.press(continueButton());
  await screen.findByRole('checkbox', { name: /eBay/ });
}

async function typePrice(price: string) {
  await fireEvent.changeText(screen.getByLabelText('Preço em EUR'), price);
}

/** Prices the record at 28 euros and publishes it on both marketplaces. */
async function publishRecord() {
  await reachPriceWithRecord();
  await typePrice('28');
  await fireEvent.press(screen.getByRole('button', { name: 'Publicar em 2 plataformas' }));
}

afterEach(() => jest.useRealTimers());

beforeEach(() => {
  jest.clearAllMocks();
  setOnline(true);
  jest.mocked(supportedMarketplaces).mockReturnValue([discogs, ebay]);
  jest.mocked(searchReleases).mockResolvedValue([firstPressing, reissue]);
  jest.mocked(saveDraft).mockResolvedValue({ id: 'draft-1' });
  jest.mocked(listItems).mockResolvedValue([]);
  jest.mocked(countPendingOffers).mockResolvedValue(0);
  jest.mocked(listSales).mockResolvedValue([]);
  jest.mocked(listConnections).mockResolvedValue([connection('discogs'), connection('ebay')]);
  jest.mocked(publishItem).mockResolvedValue({
    itemId: 'item-9',
    listings: [
      { marketplace: 'discogs', status: 'published' },
      { marketplace: 'ebay', status: 'error', reason: 'missingShippingPolicy' },
    ],
  });
  jest.mocked(retryListing).mockResolvedValue({ marketplace: 'ebay', status: 'published' });
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
      screen.getByText('Se for um disco, escolhe a tua edição para publicar também em Discogs.'),
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
    expect(screen.queryByText('Este anúncio não é publicado em Discogs')).not.toBeOnTheScreen();
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

    expect(screen.getByText('Este anúncio não é publicado em Discogs')).toBeOnTheScreen();
    expect(screen.getByText(/Discogs só aceita discos que existam no seu catálogo/)).toBeOnTheScreen();
    expect(screen.getByLabelText('Publica em: eBay')).toBeOnTheScreen();
  });

  it('asks what kind of item it is only when going on without the catalogue', async () => {
    await renderRouter(APP_DIR, { initialUrl: CATALOGUE });
    await typeName('noites');
    await fireEvent.press(await screen.findByRole('button', { name: /Não é nenhuma destas/ }));

    expect(screen.getByRole('radio', { name: 'Disco, CD ou cassete' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Outro artigo' })).not.toBeChecked();
    expect(continueButton()).toBeDisabled();

    await fireEvent.press(screen.getByRole('radio', { name: 'Disco, CD ou cassete' }));

    expect(continueButton()).toBeEnabled();
  });

  it('lets the seller choose an edition after all', async () => {
    await renderRouter(APP_DIR, { initialUrl: CATALOGUE });
    await typeName('noites');
    await fireEvent.press(await screen.findByRole('button', { name: /Não é nenhuma destas/ }));

    await fireEvent.press(screen.getByRole('button', { name: /1978/ }));

    expect(screen.queryByText('Este anúncio não é publicado em Discogs')).not.toBeOnTheScreen();
    expect(screen.getByLabelText('Publica em: Discogs, eBay')).toBeOnTheScreen();
  });

  it('goes on with the typed name when the catalogue has no edition by that name', async () => {
    jest.mocked(searchReleases).mockResolvedValue([]);
    await renderRouter(APP_DIR, { initialUrl: CATALOGUE });

    await typeName('Gira-discos Aurora T-200');

    expect(await screen.findByText('Nenhuma edição encontrada com este nome.')).toBeOnTheScreen();
    expect(screen.getByText('Este anúncio não é publicado em Discogs')).toBeOnTheScreen();
    expect(screen.getByLabelText('Publica em: eBay')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('radio', { name: 'Outro artigo' }));

    expect(continueButton()).toBeEnabled();
  });

  it('says "only" the marketplace that is left when there is just one', async () => {
    jest.mocked(searchReleases).mockResolvedValue([]);
    await renderRouter(APP_DIR, { initialUrl: CATALOGUE });

    await typeName('Gira-discos Aurora T-200');

    expect(await screen.findByText('Só eBay')).toBeOnTheScreen();
  });

  describe('with a third marketplace that lists both kinds of item', () => {
    beforeEach(() => {
      jest.mocked(supportedMarketplaces).mockReturnValue([discogs, ebay, reverb]);
    });

    it('says which marketplace is left out and lists the ones that apply', async () => {
      jest.mocked(searchReleases).mockResolvedValue([]);
      await renderRouter(APP_DIR, { initialUrl: CATALOGUE });

      await typeName('Gira-discos Aurora T-200');

      expect(await screen.findByText('Sem Discogs')).toBeOnTheScreen();
      expect(screen.queryByText(/^Só /)).not.toBeOnTheScreen();
      expect(screen.getByText('Este anúncio não é publicado em Discogs')).toBeOnTheScreen();
      expect(
        screen.getByText(/O anúncio é publicado em eBay, Reverb com o nome que escreveste/),
      ).toBeOnTheScreen();
      expect(screen.getByLabelText('Publica em: eBay, Reverb')).toBeOnTheScreen();
    });

    it('lists all three for a record chosen from the catalogue, with no notice', async () => {
      await renderRouter(APP_DIR, { initialUrl: CATALOGUE });
      await typeName('noites');

      await fireEvent.press(await screen.findByRole('button', { name: /1978/ }));

      expect(screen.getByLabelText('Publica em: Discogs, eBay, Reverb')).toBeOnTheScreen();
      expect(screen.queryByText(/não é publicado em/)).not.toBeOnTheScreen();
    });
  });

  it('names the marketplace that needs the catalogue from its capabilities', async () => {
    jest.mocked(supportedMarketplaces).mockReturnValue([
      { ...discogs, id: 'vinylhub', name: 'VinylHub' },
      ebay,
    ]);
    jest.mocked(searchReleases).mockResolvedValue([]);
    await renderRouter(APP_DIR, { initialUrl: CATALOGUE });

    expect(
      screen.getByText('Se for um disco, escolhe a tua edição para publicar também em VinylHub.'),
    ).toBeOnTheScreen();

    await typeName('Gira-discos Aurora T-200');

    expect(await screen.findByText('Este anúncio não é publicado em VinylHub')).toBeOnTheScreen();
    expect(screen.queryByText(/Discogs só aceita/)).not.toBeOnTheScreen();
  });

  it('never blocks: a failed search still lets the seller continue without the catalogue', async () => {
    jest.mocked(searchReleases).mockRejectedValue(new Error('server error'));
    await renderRouter(APP_DIR, { initialUrl: CATALOGUE });

    await typeName('noites');

    expect(await screen.findByText('Não conseguimos procurar no catálogo Discogs.')).toBeOnTheScreen();
    expect(screen.getByText(/Sem a edição do catálogo, o anúncio só pode ir para eBay/)).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('radio', { name: 'Disco, CD ou cassete' }));

    expect(continueButton()).toBeEnabled();
  });

  it('searches again on retry, and offers the editions it then finds', async () => {
    jest.mocked(searchReleases).mockRejectedValueOnce(new Error('server error'));
    await renderRouter(APP_DIR, { initialUrl: CATALOGUE });
    await typeName('noites');
    await screen.findByText('Não conseguimos procurar no catálogo Discogs.');

    await fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));

    expect(await screen.findByText('Os Marés · LP, Album · 1978 · Portugal')).toBeOnTheScreen();
    expect(screen.queryByText('Este anúncio não é publicado em Discogs')).not.toBeOnTheScreen();
  });

  it('says the device is offline when a search fails without a connection, and still continues', async () => {
    setOnline(false);
    jest.mocked(searchReleases).mockRejectedValue(new Error('network'));
    await renderRouter(APP_DIR, { initialUrl: CATALOGUE });

    await typeName('noites');

    expect(await screen.findByText(/Estás sem ligação/)).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('radio', { name: 'Disco, CD ou cassete' }));

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
    await fireEvent.press(await screen.findByRole('radio', { name: 'Disco, CD ou cassete' }));
    await fireEvent.press(continueButton());

    // Nothing says whether it is vinyl, a CD or a cassette.
    expect(screen.getByLabelText('Estado do suporte')).toBeOnTheScreen();
    expect(screen.getByLabelText('Estado da capa')).toBeOnTheScreen();
  });

  it('names the condition after the carrier of the chosen edition', async () => {
    jest.mocked(searchReleases).mockResolvedValue([{ ...firstPressing, id: 249506, format: 'CD', year: 2003 }]);
    await renderRouter(APP_DIR, { initialUrl: CATALOGUE });
    await typeName('noites');
    await fireEvent.press(await screen.findByRole('button', { name: /2003/ }));
    await fireEvent.press(continueButton());

    expect(screen.getByLabelText('Estado do CD')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Estado do disco')).not.toBeOnTheScreen();
  });

  it('adds the photos chosen from the library and counts them', async () => {
    jest.mocked(pickPhotos).mockResolvedValue({
      status: 'picked',
      photos: [{ uri: 'file:///front.jpg' }, { uri: 'file:///back.jpg' }],
    });
    await reachConditionWithRecord();

    expect(screen.getByText('Fotos · 0 de 8')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Adicionar foto' }));
    await chooseFromSheet('Escolher da galeria');

    expect(pickPhotos).toHaveBeenCalledWith(8);
    expect(screen.getByText('Fotos · 2 de 8')).toBeOnTheScreen();
    expect(screen.getByLabelText('Foto 2 de 2')).toBeOnTheScreen();
  });

  it('offers the camera and the library in a system action sheet, with a way to cancel', async () => {
    await reachConditionWithRecord();

    await fireEvent.press(screen.getByRole('button', { name: 'Adicionar foto' }));

    const [sheet] = actionSheet.mock.calls.at(-1) ?? [];
    expect(sheet?.options).toEqual(['Tirar foto', 'Escolher da galeria', 'Cancelar']);
    expect(sheet?.cancelButtonIndex).toBe(2);

    await chooseFromSheet('Cancelar');

    expect(pickPhotos).not.toHaveBeenCalled();
    expect(takePhoto).not.toHaveBeenCalled();
  });

  it('says what to do when the camera is not allowed', async () => {
    jest.mocked(takePhoto).mockResolvedValue({ status: 'denied' });
    await reachConditionWithRecord();

    await fireEvent.press(screen.getByRole('button', { name: 'Adicionar foto' }));
    await chooseFromSheet('Tirar foto');

    expect(screen.getByText(/Dá-lhe acesso nas Definições/)).toBeOnTheScreen();
  });

  it('says so when a photo cannot be added', async () => {
    jest.mocked(takePhoto).mockRejectedValue(new Error('camera unavailable'));
    await reachConditionWithRecord();

    await fireEvent.press(screen.getByRole('button', { name: 'Adicionar foto' }));
    await chooseFromSheet('Tirar foto');

    expect(screen.getByText('Não conseguimos adicionar a foto. Tenta de novo.')).toBeOnTheScreen();
  });

  it('removes a photo only after the seller confirms', async () => {
    jest.mocked(pickPhotos).mockResolvedValue({ status: 'picked', photos: [{ uri: 'file:///front.jpg' }] });
    await reachConditionWithRecord();
    await fireEvent.press(screen.getByRole('button', { name: 'Adicionar foto' }));
    await chooseFromSheet('Escolher da galeria');

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
    await chooseFromSheet('Escolher da galeria');

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
    await chooseFromSheet('Escolher da galeria');
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

describe('new listing, step 3: price and marketplaces', () => {
  it('cannot publish until the price makes sense', async () => {
    await reachPriceWithRecord();
    const publishButton = () => screen.getByRole('button', { name: 'Publicar em 2 plataformas' });

    expect(publishButton()).toBeDisabled();

    await typePrice('abc');
    expect(publishButton()).toBeDisabled();

    await typePrice('28,00');
    expect(publishButton()).toBeEnabled();
  });

  it('says how to write a price when what was typed is not one', async () => {
    await reachPriceWithRecord();

    expect(screen.queryByText('Escreve um preço como 28 ou 28,50.')).not.toBeOnTheScreen();

    await typePrice('12,345');
    expect(screen.getByText('Escreve um preço como 28 ou 28,50.')).toBeOnTheScreen();

    await typePrice('12,34');
    expect(screen.queryByText('Escreve um preço como 28 ou 28,50.')).not.toBeOnTheScreen();
  });

  it('estimates what each marketplace keeps, and says it is an estimate', async () => {
    await reachPriceWithRecord();

    await typePrice('28');

    expect(screen.getByText('Comissão estimada 2,52 €')).toBeOnTheScreen();
    expect(screen.getByText('Comissão estimada 3,64 €')).toBeOnTheScreen();
    expect(screen.getByText(/As comissões são estimativas/)).toBeOnTheScreen();
  });

  it('publishes only on the marketplaces left ticked, and names the one that is left', async () => {
    await reachPriceWithRecord();
    await typePrice('28');

    await fireEvent.press(screen.getByRole('checkbox', { name: /eBay/ }));

    expect(screen.getByRole('checkbox', { name: /eBay/ })).not.toBeChecked();
    await fireEvent.press(screen.getByRole('button', { name: 'Publicar em Discogs' }));
    expect(jest.mocked(publishItem).mock.calls[0][0].marketplaces).toEqual(['discogs']);
  });

  it('cannot publish with every marketplace unticked', async () => {
    await reachPriceWithRecord();
    await typePrice('28');

    await fireEvent.press(screen.getByRole('checkbox', { name: /eBay/ }));
    await fireEvent.press(screen.getByRole('checkbox', { name: /Discogs/ }));

    expect(screen.getByRole('button', { name: 'Publicar' })).toBeDisabled();
  });

  it('shows a marketplace the listing cannot use, disabled and with the reason', async () => {
    await reachPriceWithAnotherItem();
    await typePrice('180');

    const discogsRow = screen.getByRole('checkbox', { name: /Discogs/ });
    expect(discogsRow).toBeDisabled();
    expect(discogsRow).not.toBeChecked();
    expect(screen.getByText('Discogs só aceita discos que existam no seu catálogo.')).toBeOnTheScreen();
    expect(screen.getByRole('checkbox', { name: /eBay/ })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Publicar em eBay' })).toBeEnabled();
  });

  it('shows a marketplace whose account is not connected, disabled and saying what to do', async () => {
    jest.mocked(listConnections).mockResolvedValue([connection('ebay')]);
    await reachPriceWithRecord();

    expect(screen.getByRole('checkbox', { name: /Discogs/ })).toBeDisabled();
    expect(screen.getByText('Liga a tua conta Discogs para publicares aqui.')).toBeOnTheScreen();
    expect(screen.getByText('Por ligar')).toBeOnTheScreen();
  });

  it('lists a third marketplace from its capabilities', async () => {
    jest.mocked(supportedMarketplaces).mockReturnValue([discogs, ebay, { ...reverb, feeRate: 0.05 }]);
    await reachPriceWithRecord();
    await typePrice('28');

    // Its account is not connected, so it is shown and cannot be ticked.
    expect(screen.getByRole('checkbox', { name: /Reverb/ })).toBeDisabled();
    expect(screen.getByText('Liga a tua conta Reverb para publicares aqui.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Publicar em 2 plataformas' })).toBeEnabled();
  });

  it('explains when the connected accounts cannot be loaded, and loads them on retry', async () => {
    jest.mocked(listConnections).mockRejectedValueOnce(new Error('server error'));
    await reachConditionWithRecord();
    await fireEvent.press(screen.getAllByRole('radio', { name: 'VG+' })[0]);
    await fireEvent.press(continueButton());

    expect(await screen.findByText(/Não conseguimos ver as tuas contas ligadas/)).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));

    expect(await screen.findByRole('checkbox', { name: /eBay/ })).toBeOnTheScreen();
  });

  it('cannot publish without a connection, and says why', async () => {
    await reachPriceWithRecord();
    await typePrice('28');

    setOnline(false);
    await fireEvent.press(screen.getByRole('checkbox', { name: /eBay/ }));

    expect(screen.getByText('Estás sem ligação. Liga-te à internet para publicares.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Publicar em Discogs' })).toBeDisabled();
  });

  it('sends the price in cents and whether offers are accepted', async () => {
    await reachPriceWithRecord();
    await typePrice('28,50');
    await fireEvent.press(screen.getByRole('switch', { name: /Aceitar propostas/ }));

    await fireEvent.press(screen.getByRole('button', { name: 'Publicar em 2 plataformas' }));

    const sent = jest.mocked(publishItem).mock.calls[0][0];
    expect(sent.item).toMatchObject({ price_minor: 2850, currency: 'EUR', accepts_offers: true });
    expect(sent.item).not.toHaveProperty('status');
    expect(sent.marketplaces).toEqual(['discogs', 'ebay']);
  });

  it('saves the price with the draft when the seller leaves instead of publishing', async () => {
    await reachPriceWithRecord();
    await typePrice('28');

    await fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));

    expect(jest.mocked(saveDraft).mock.calls[0][0].item).toMatchObject({ price_minor: 2800 });
    expect(publishItem).not.toHaveBeenCalled();
  });
});

describe('new listing, step 4: result', () => {
  it('says it is publishing until the marketplaces answer', async () => {
    let answer: (result: Awaited<ReturnType<typeof publishItem>>) => void = () => {};
    jest.mocked(publishItem).mockReturnValue(new Promise((resolve) => (answer = resolve)));
    await publishRecord();

    expect(screen.getByRole('header', { name: 'A publicar o anúncio' })).toBeOnTheScreen();

    await act(async () => answer({ itemId: 'item-9', listings: [{ marketplace: 'discogs', status: 'published' }] }));

    expect(screen.getByRole('header', { name: 'Publicado em Discogs' })).toBeOnTheScreen();
  });

  it('lets the seller leave while it is publishing, without saving a second copy as a draft', async () => {
    jest.mocked(publishItem).mockReturnValue(new Promise(() => {}));
    await publishRecord();

    await fireEvent.press(screen.getByRole('button', { name: 'Fechar' }));

    expect(screen).toHavePathname('/');
    expect(saveDraft).not.toHaveBeenCalled();
  });

  it('says the seller can leave when publishing takes more than 30 seconds', async () => {
    jest.useFakeTimers();
    jest.mocked(publishItem).mockReturnValue(new Promise(() => {}));
    await publishRecord();
    const notice = 'Ainda a publicar. Podes sair; o estado aparece em Anúncios.';

    await act(async () => jest.advanceTimersByTime(29_000));
    expect(screen.queryByText(notice)).not.toBeOnTheScreen();

    await act(async () => jest.advanceTimersByTime(1_000));
    expect(screen.getByText(notice)).toBeOnTheScreen();
  });

  it('shows what was published and the outcome on each marketplace', async () => {
    await publishRecord();

    expect(
      await screen.findByRole('header', { name: 'Publicado em 1 de 2 plataformas' }),
    ).toBeOnTheScreen();
    expect(screen.getByText('Noites de Lisboa')).toBeOnTheScreen();
    expect(screen.getByText('Os Marés · LP · VG+')).toBeOnTheScreen();
    expect(screen.getByText('28 €')).toBeOnTheScreen();
    expect(screen.getByText('Publicado há instantes')).toBeOnTheScreen();
    expect(screen.getByText(/Falta definir a política de envio na tua conta eBay. Define-a em eBay/)).toBeOnTheScreen();
    expect(screen.getByText('Erro')).toBeOnTheScreen();
  });

  it('tries the marketplace that failed again, and counts it once it is published', async () => {
    await publishRecord();
    await screen.findByRole('header', { name: 'Publicado em 1 de 2 plataformas' });

    await fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));

    expect(retryListing).toHaveBeenCalledWith('item-9', 'ebay');
    expect(
      await screen.findByRole('header', { name: 'Publicado em 2 de 2 plataformas' }),
    ).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Tentar de novo' })).not.toBeOnTheScreen();
  });

  it('keeps the marketplace in error, and retryable, when trying again fails', async () => {
    jest.mocked(retryListing).mockRejectedValue(new Error('network'));
    await publishRecord();
    await screen.findByRole('header', { name: 'Publicado em 1 de 2 plataformas' });

    await fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));

    expect(await screen.findByText('Não conseguimos chegar a eBay. Tenta de novo.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeEnabled();
  });

  it('cannot try a marketplace again without a connection, and says why', async () => {
    // The connection drops while the listing is being published.
    let answer: (result: Awaited<ReturnType<typeof publishItem>>) => void = () => {};
    jest.mocked(publishItem).mockReturnValue(new Promise((resolve) => (answer = resolve)));
    await publishRecord();
    setOnline(false);
    await act(async () =>
      answer({
        itemId: 'item-9',
        listings: [{ marketplace: 'ebay', status: 'error', reason: 'missingShippingPolicy' }],
      }),
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));

    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeDisabled();
    expect(
      screen.getByText('Estás sem ligação. Liga-te à internet para tentares de novo.'),
    ).toBeOnTheScreen();
    expect(retryListing).not.toHaveBeenCalled();
  });

  it('saves the draft under the same item id after a publish attempt that failed', async () => {
    jest.mocked(publishItem).mockRejectedValue(new Error('timeout'));
    await publishRecord();
    await screen.findByRole('header', { name: 'Não conseguimos publicar o anúncio' });

    for (const step of ['Voltar', 'Voltar', 'Voltar', 'Cancelar']) {
      await fireEvent.press(screen.getByRole('button', { name: step }));
    }

    const publishedId = jest.mocked(publishItem).mock.calls[0][0].item.id;
    expect(publishedId).toEqual(expect.any(String));
    expect(jest.mocked(saveDraft).mock.calls[0][0].item.id).toBe(publishedId);
  });

  it('gives the next listing its own item id', async () => {
    await publishRecord();
    await screen.findByRole('header', { name: 'Publicado em 1 de 2 plataformas' });
    await fireEvent.press(screen.getByRole('button', { name: 'Criar outro' }));
    jest.mocked(searchReleases).mockResolvedValue([]);

    await typeName('Colunas Marfim');
    await fireEvent.press(await screen.findByRole('radio', { name: 'Outro artigo' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));

    const firstId = jest.mocked(publishItem).mock.calls[0][0].item.id;
    expect(jest.mocked(saveDraft).mock.calls[0][0].item.id).not.toBe(firstId);
  });

  it('says nothing was published when the request fails, and publishes on retry', async () => {
    jest.mocked(publishItem).mockRejectedValueOnce(new Error('server error'));
    await publishRecord();

    expect(
      await screen.findByRole('header', { name: 'Não conseguimos publicar o anúncio' }),
    ).toBeOnTheScreen();
    expect(screen.getByText(/Nada foi publicado/)).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));

    expect(
      await screen.findByRole('header', { name: 'Publicado em 1 de 2 plataformas' }),
    ).toBeOnTheScreen();
    expect(jest.mocked(publishItem).mock.calls[1][0].marketplaces).toEqual(['discogs', 'ebay']);
  });

  it('goes back to the price when the request failed, with what was entered', async () => {
    jest.mocked(publishItem).mockRejectedValue(new Error('server error'));
    await publishRecord();
    await screen.findByRole('header', { name: 'Não conseguimos publicar o anúncio' });

    await fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));

    expect(screen).toHavePathname('/new-listing/price');
    expect(screen.getByLabelText('Preço em EUR')).toHaveProp('value', '28');
  });

  it('opens the published listing, without saving it again as a draft', async () => {
    await publishRecord();
    await screen.findByRole('header', { name: 'Publicado em 1 de 2 plataformas' });

    await fireEvent.press(screen.getByRole('button', { name: 'Ver anúncio' }));

    expect(screen).toHavePathname('/listing/item-9');
    expect(saveDraft).not.toHaveBeenCalled();
  });

  it('starts an empty listing from "create another"', async () => {
    await publishRecord();
    await screen.findByRole('header', { name: 'Publicado em 1 de 2 plataformas' });

    await fireEvent.press(screen.getByRole('button', { name: 'Criar outro' }));

    expect(screen).toHavePathname(CATALOGUE);
    expect(screen.getByLabelText('Nome do que vais vender')).toHaveProp('value', '');
    expect(continueButton()).toBeDisabled();
    expect(saveDraft).not.toHaveBeenCalled();
  });

  it('goes to the first step when opened with nothing published', async () => {
    await renderRouter(APP_DIR, { initialUrl: '/new-listing/result' });

    expect(screen).toHavePathname(CATALOGUE);
  });
});
