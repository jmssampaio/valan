import { render, screen } from '@testing-library/react-native';

import { SectionLabel } from '@/components/section-label';
import { Colors } from '@/constants/theme';

describe('SectionLabel', () => {
  it('is announced as a heading, so screen readers can jump between sections', async () => {
    await render(<SectionLabel>Plataformas ligadas</SectionLabel>);

    expect(screen.getByRole('header', { name: 'Plataformas ligadas' })).toBeOnTheScreen();
  });

  it('is written in the muted colour, below the content it names', async () => {
    await render(<SectionLabel>Plataformas ligadas</SectionLabel>);

    expect(screen.getByText('Plataformas ligadas')).toHaveStyle({ color: Colors.muted });
  });
});
