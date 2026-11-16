import { render, screen } from '@testing-library/react-native';

import { Tag } from '@/components/tag';

describe('Tag', () => {
  it('shows its label', async () => {
    await render(<Tag label="Discogs" />);

    expect(screen.getByText('Discogs')).toBeOnTheScreen();
  });
});
