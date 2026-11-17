import { fireEvent, render, screen } from '@testing-library/react-native';

import { MarketplaceRow } from '@/components/marketplace-row';

describe('MarketplaceRow', () => {
  it('shows the marketplace with its second line and its tag', async () => {
    await render(
      <MarketplaceRow
        name="Discogs"
        meta="14 visitas · 1 proposta"
        tag={{ label: 'Publicado', tone: 'success' }}
      />,
    );

    expect(screen.getByText('Discogs')).toBeOnTheScreen();
    expect(screen.getByText('14 visitas · 1 proposta')).toBeOnTheScreen();
    expect(screen.getByText('Publicado')).toBeOnTheScreen();
    expect(screen.queryByRole('button')).not.toBeOnTheScreen();
  });

  it('says why the marketplace refused the listing, and offers to try again', async () => {
    const onPress = jest.fn();
    await render(
      <MarketplaceRow
        name="eBay"
        tag={{ label: 'Erro', tone: 'error' }}
        refusal={{ reason: 'Falta a política de envio.', retry: { label: 'Tentar de novo', onPress } }}
      />,
    );

    expect(screen.getByText('Falta a política de envio.')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not offer to try again while it cannot', async () => {
    const onPress = jest.fn();
    await render(
      <MarketplaceRow
        name="eBay"
        refusal={{
          reason: 'Falta a política de envio.',
          retry: { label: 'Tentar de novo', onPress, disabled: true },
        }}
      />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));

    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeDisabled();
    expect(onPress).not.toHaveBeenCalled();
  });

  it('adds a note under the retry button when there is one', async () => {
    await render(
      <MarketplaceRow
        name="eBay"
        refusal={{
          reason: 'Falta a política de envio.',
          retry: { label: 'Tentar de novo', onPress: jest.fn(), disabled: true },
          note: 'Sem ligação.',
        }}
      />,
    );

    expect(screen.getByText('Sem ligação.')).toBeOnTheScreen();
  });
});
