import { render, screen } from '@testing-library/react-native';

import { AppIcon } from '@/components/app-icon';
import { Logo } from '@/components/logo';

describe('Logo', () => {
  it('is read as one image named Valan', async () => {
    await render(<Logo />);

    expect(screen.getByRole('image', { name: 'Valan' })).toBeOnTheScreen();
  });

  it('shows the app icon and the wordmark beside it', async () => {
    await render(<Logo />);

    expect(screen.getByTestId('app-icon', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.getByText('VALAN', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('draws the app icon at 40 points, the one size the logo has', async () => {
    await render(<Logo />);

    expect(screen.getByTestId('app-icon', { includeHiddenElements: true })).toHaveStyle({
      width: 40,
      height: 40,
    });
  });

  it('keeps its size whatever the system text size, like the drawing beside it', async () => {
    await render(<Logo />);

    expect(screen.getByText('VALAN', { includeHiddenElements: true }).props.allowFontScaling).toBe(false);
  });
});

describe('AppIcon', () => {
  it('is drawn at the size it is given, and hidden from screen readers', async () => {
    await render(<AppIcon size={64} />);

    expect(screen.queryByRole('image')).not.toBeOnTheScreen();
    expect(screen.getByTestId('app-icon', { includeHiddenElements: true })).toHaveStyle({
      width: 64,
      height: 64,
    });
  });
});
