import { fireEvent, render, screen } from '@testing-library/react-native';

import { Button } from '@/components/button';
import { Colors } from '@/constants/theme';

describe('Button', () => {
  it('runs its action when pressed', async () => {
    const onPress = jest.fn();
    await render(<Button label="Continuar" onPress={onPress} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Continuar' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not run its action while disabled', async () => {
    const onPress = jest.fn();
    await render(<Button label="Continuar" onPress={onPress} disabled />);

    await fireEvent.press(screen.getByRole('button', { name: 'Continuar' }));

    expect(onPress).not.toHaveBeenCalled();
  });

  it('is announced as disabled while disabled', async () => {
    await render(<Button label="Continuar" onPress={jest.fn()} disabled />);

    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled();
  });

  it('writes the label of a danger link in the danger colour, without a box', async () => {
    await render(<Button label="Remover anúncio" variant="dangerLink" onPress={jest.fn()} />);

    expect(screen.getByText('Remover anúncio')).toHaveStyle({ color: Colors.danger });
    expect(screen.getByRole('button', { name: 'Remover anúncio' })).not.toHaveStyle({
      backgroundColor: Colors.danger,
    });
  });

  it('can be named for what it acts on, so buttons with the same label can be told apart', async () => {
    await render(
      <Button label="Aceitar" accessibilityLabel="Aceitar a proposta de 24 €" onPress={jest.fn()} />,
    );

    expect(screen.getByRole('button', { name: 'Aceitar a proposta de 24 €' })).toBeOnTheScreen();
  });

  it.each([
    ['primary', Colors.primary, Colors.onPrimary],
    ['secondary', Colors.fill, Colors.ink],
    ['dark', Colors.ink, Colors.onInk],
  ] as const)('fills a %s button and writes its label to match', async (variant, background, label) => {
    await render(<Button label="Continuar" variant={variant} onPress={jest.fn()} />);

    expect(screen.getByRole('button', { name: 'Continuar' })).toHaveStyle({ backgroundColor: background });
    expect(screen.getByText('Continuar')).toHaveStyle({ color: label });
  });

  it('writes a link in the brand colour, without a box', async () => {
    await render(<Button label="Criar outro anúncio" variant="link" onPress={jest.fn()} />);

    expect(screen.getByText('Criar outro anúncio')).toHaveStyle({ color: Colors.primary });
  });

  it('is 52 points tall by default and 48 when compact', async () => {
    await render(
      <>
        <Button label="Publicar" onPress={jest.fn()} />
        <Button label="Ligar" size="compact" onPress={jest.fn()} />
      </>,
    );

    expect(screen.getByRole('button', { name: 'Publicar' })).toHaveStyle({ minHeight: 52 });
    expect(screen.getByRole('button', { name: 'Ligar' })).toHaveStyle({ minHeight: 48 });
  });

  it('shows that it is working, and ignores presses, while loading', async () => {
    const onPress = jest.fn();
    await render(<Button label="Publicar" onPress={onPress} loading />);

    await fireEvent.press(screen.getByRole('button', { name: 'Publicar' }));

    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByTestId('button-spinner', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('is announced as busy while loading', async () => {
    await render(<Button label="Publicar" onPress={jest.fn()} loading />);

    expect(screen.getByRole('button', { name: 'Publicar', busy: true })).toBeOnTheScreen();
  });

  it('shows its symbol before the label, and is still named by the label alone', async () => {
    await render(<Button label="Novo anúncio" icon="plus" onPress={jest.fn()} />);

    expect(screen.getByRole('button', { name: 'Novo anúncio' })).toBeOnTheScreen();
    expect(screen.getByTestId('icon', { includeHiddenElements: true })).toBeOnTheScreen();
  });
});
