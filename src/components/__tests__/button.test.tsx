import { fireEvent, render, screen } from '@testing-library/react-native';

import { Button } from '@/components/button';

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
});
