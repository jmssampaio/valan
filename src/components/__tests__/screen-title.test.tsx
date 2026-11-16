import { render, screen } from '@testing-library/react-native';

import { ScreenTitle } from '@/components/screen-title';

describe('ScreenTitle', () => {
  it('is announced as a heading', async () => {
    await render(<ScreenTitle>Anúncios</ScreenTitle>);

    expect(screen.getByRole('header', { name: 'Anúncios' })).toBeOnTheScreen();
  });
});
