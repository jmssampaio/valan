import { fireEvent, render, screen } from '@testing-library/react-native';

import { ScreenMessage } from '@/components/screen-message';

describe('ScreenMessage', () => {
  it('shows a title and an explanation', async () => {
    await render(<ScreenMessage title="Estás sem ligação" body="Liga-te à internet." />);

    expect(screen.getByRole('header', { name: 'Estás sem ligação' })).toBeOnTheScreen();
    expect(screen.getByText('Liga-te à internet.')).toBeOnTheScreen();
  });

  it('runs its action when the button is pressed', async () => {
    const onPress = jest.fn();
    await render(
      <ScreenMessage
        title="Não conseguimos carregar os anúncios"
        body="Tenta de novo."
        action={{ label: 'Tentar de novo', onPress }}
      />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('has no button when there is nothing to do', async () => {
    await render(<ScreenMessage title="Estás sem ligação" body="Liga-te à internet." />);

    expect(screen.queryByRole('button')).not.toBeOnTheScreen();
  });
});
