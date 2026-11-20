import { render, screen } from '@testing-library/react-native';

import { ScreenTitle } from '@/components/screen-title';

describe('ScreenTitle', () => {
  it('is announced as a heading', async () => {
    await render(<ScreenTitle>Anúncios</ScreenTitle>);

    expect(screen.getByRole('header', { name: 'Anúncios' })).toBeOnTheScreen();
  });

  it.each([
    ['large', 32],
    ['medium', 28],
    ['small', 22],
  ] as const)('comes in a %s size of %i points', async (size, fontSize) => {
    await render(<ScreenTitle size={size}>Anúncios</ScreenTitle>);

    expect(screen.getByRole('header', { name: 'Anúncios' })).toHaveStyle({ fontSize });
  });
});
