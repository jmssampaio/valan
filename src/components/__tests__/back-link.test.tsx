import { fireEvent, render, screen } from '@testing-library/react-native';

import { BackLink } from '@/components/back-link';

describe('BackLink', () => {
  it('is read without its drawn mark and runs its action', async () => {
    const onPress = jest.fn();
    await render(<BackLink label="‹ Voltar" accessibilityLabel="Voltar" onPress={onPress} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
