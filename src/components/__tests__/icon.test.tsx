import { render, screen } from '@testing-library/react-native';

import { Icon } from '@/components/icon';

describe('Icon', () => {
  it('is hidden from screen readers when it only decorates, as beside a label', async () => {
    await render(<Icon name="magnifyingglass" />);

    expect(screen.queryByRole('image')).not.toBeOnTheScreen();
    expect(screen.getByTestId('icon', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('is read by its name when it stands for an action on its own, such as going back', async () => {
    await render(<Icon name="chevron.left" accessibilityLabel="Voltar" />);

    expect(screen.getByRole('image', { name: 'Voltar' })).toBeOnTheScreen();
  });

  it('takes the size it is given', async () => {
    await render(<Icon name="plus" size={20} />);

    expect(screen.getByTestId('icon', { includeHiddenElements: true })).toHaveStyle({
      width: 20,
      height: 20,
    });
  });
});
