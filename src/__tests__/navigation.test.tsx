import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

// The device language is a system boundary: fix it so titles are predictable.
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'pt', languageTag: 'pt-PT' }],
}));

const APP_DIR = 'src/app';

describe('navigation', () => {
  it('opens on the listings tab', async () => {
    await renderRouter(APP_DIR);

    expect(screen).toHavePathname('/');
    expect(screen.getByRole('header', { name: 'Anúncios' })).toBeOnTheScreen();
  });

  it('shows the four tabs in the device language', async () => {
    await renderRouter(APP_DIR);

    for (const label of ['Anúncios', 'Propostas', 'Vendas', 'Conta']) {
      expect(screen.getByRole('tab', { name: label })).toBeOnTheScreen();
    }
  });

  it('marks only the current tab as selected', async () => {
    await renderRouter(APP_DIR);

    expect(screen.getByRole('tab', { name: 'Anúncios' })).toBeSelected();
    expect(screen.getByRole('tab', { name: 'Vendas' })).not.toBeSelected();
  });

  it('switches screen when another tab is pressed', async () => {
    await renderRouter(APP_DIR);

    await fireEvent.press(screen.getByRole('tab', { name: 'Vendas' }));

    expect(screen).toHavePathname('/sales');
    expect(screen.getByRole('header', { name: 'Vendas' })).toBeOnTheScreen();
    expect(screen.getByRole('tab', { name: 'Vendas' })).toBeSelected();
  });

  it.each([
    ['/offers', 'Propostas'],
    ['/account', 'Conta'],
    ['/welcome', 'Publica uma vez.\nVende em todo o lado.'],
    ['/connect', 'Liga as tuas contas'],
    ['/new-listing/catalogue', 'O que vais vender?'],
    ['/new-listing/condition', 'Estado e fotos'],
    ['/new-listing/price', 'Preço e plataformas'],
    ['/listing/abc123', 'Anúncio'],
    ['/subscription', 'Vende em todo o lado, a partir de um só sítio'],
  ])('%s shows its title', async (initialUrl, title) => {
    await renderRouter(APP_DIR, { initialUrl });

    expect(screen.getByRole('header', { name: title })).toBeOnTheScreen();
  });

  it('shows the component gallery during development', async () => {
    await renderRouter(APP_DIR, { initialUrl: '/dev/components' });

    expect(screen.getByRole('header', { name: 'Componentes' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Continuar com Apple' })).toBeOnTheScreen();
  });

  it('lets the gallery controls be operated', async () => {
    await renderRouter(APP_DIR, { initialUrl: '/dev/components' });

    await fireEvent.press(screen.getByRole('radio', { name: 'Aparelho' }));
    await fireEvent.press(screen.getByRole('tab', { name: 'Vendidos' }));

    expect(screen.getByRole('radio', { name: 'Aparelho' })).toBeChecked();
    expect(screen.getByRole('tab', { name: 'Vendidos' })).toBeSelected();
  });

  it('offers a way back to listings from a page that does not exist', async () => {
    await renderRouter(APP_DIR, { initialUrl: '/no-such-page' });

    expect(screen.getByRole('header', { name: 'Esta página não existe' })).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Ir para Anúncios' }));

    expect(screen).toHavePathname('/');
  });
});
