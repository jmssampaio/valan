import { render, screen } from '@testing-library/react-native';

import { Notice } from '@/components/notice';

describe('Notice', () => {
  it('shows the consequence, its title and the reason', async () => {
    await render(
      <Notice
        tag="Só eBay"
        title="Este anúncio não vai para o Discogs"
        body="O Discogs só aceita discos que existam no seu catálogo."
      />,
    );

    expect(screen.getByText('Só eBay')).toBeOnTheScreen();
    expect(screen.getByText('Este anúncio não vai para o Discogs')).toBeOnTheScreen();
    expect(screen.getByText('O Discogs só aceita discos que existam no seu catálogo.')).toBeOnTheScreen();
  });
});
