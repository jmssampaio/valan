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

  it('writes the label of a danger button in the error colour', async () => {
    await render(<Button label="Remover" variant="danger" onPress={jest.fn()} />);

    expect(screen.getByText('Remover')).toHaveStyle({ color: Colors.error });
  });

  it('can be named for what it acts on, so buttons with the same label can be told apart', async () => {
    await render(
      <Button label="Aceitar" accessibilityLabel="Aceitar a proposta de 24 €" onPress={jest.fn()} />,
    );

    expect(screen.getByRole('button', { name: 'Aceitar a proposta de 24 €' })).toBeOnTheScreen();
  });
});
