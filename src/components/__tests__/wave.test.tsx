import { render, screen } from '@testing-library/react-native';

import { Wave } from '@/components/wave';

describe('Wave', () => {
  it('is a decoration that screen readers skip', async () => {
    await render(<Wave />);

    expect(screen.getByTestId('wave', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.queryByTestId('wave')).not.toBeOnTheScreen();
  });
});
