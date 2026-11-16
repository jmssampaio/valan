import { fireEvent, render, screen } from '@testing-library/react-native';

import { ListRow } from '@/components/list-row';

describe('ListRow', () => {
  it('shows its title and detail', async () => {
    await render(<ListRow title="Noites de Lisboa" meta="Os Marés · LP · VG+" />);

    expect(screen.getByText('Noites de Lisboa')).toBeOnTheScreen();
    expect(screen.getByText('Os Marés · LP · VG+')).toBeOnTheScreen();
  });

  it('runs its action when pressed', async () => {
    const onPress = jest.fn();
    await render(<ListRow title="Noites de Lisboa" onPress={onPress} />);

    await fireEvent.press(screen.getByRole('button', { name: /Noites de Lisboa/ }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is not a button when it has no action', async () => {
    await render(<ListRow title="Noites de Lisboa" />);

    expect(screen.queryByRole('button')).not.toBeOnTheScreen();
  });
});
