import { render, screen } from '@testing-library/react-native';

import { SkeletonRows } from '@/components/skeleton-rows';

describe('SkeletonRows', () => {
  it('is announced once, with what is loading, not row by row', async () => {
    await render(<SkeletonRows accessibilityLabel="A carregar os anúncios" />);

    expect(screen.getAllByLabelText('A carregar os anúncios')).toHaveLength(1);
    expect(screen.getByRole('progressbar', { name: 'A carregar os anúncios' })).toBeOnTheScreen();
  });

  it('draws three rows shaped like the rows to come, without any text', async () => {
    await render(<SkeletonRows accessibilityLabel="A carregar os anúncios" />);

    expect(screen.getAllByTestId('skeleton-row', { includeHiddenElements: true })).toHaveLength(3);
    expect(screen.queryByText(/./, { includeHiddenElements: true })).not.toBeOnTheScreen();
  });
});
