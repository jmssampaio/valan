import { render, screen } from '@testing-library/react-native';

import { WaveLine } from '@/components/wave-line';

describe('WaveLine', () => {
  it('is a drawing only, hidden from screen readers', async () => {
    await render(<WaveLine width={60} />);

    expect(screen.queryByRole('image')).not.toBeOnTheScreen();
    expect(screen.getByTestId('wave-line', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('keeps the proportions of the drawing: its height follows its width', async () => {
    await render(<WaveLine width={104} />);

    expect(screen.getByTestId('wave-line', { includeHiddenElements: true })).toHaveStyle({
      width: 104,
      height: 80,
    });
  });
});
