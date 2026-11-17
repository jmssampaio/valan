import { render, screen } from '@testing-library/react-native';

import { SummaryStrip } from '@/components/summary-strip';
import { Type } from '@/constants/theme';

const tiles = [
  { value: '12', label: 'Ativos' },
  { value: '3', label: 'Propostas' },
  { value: '412 €', label: 'Vendido em nov.' },
];

describe('SummaryStrip', () => {
  it('shows every value with its label', async () => {
    await render(<SummaryStrip tiles={tiles} />);

    for (const { value, label } of tiles) {
      expect(screen.getByText(value)).toBeOnTheScreen();
      expect(screen.getByText(label)).toBeOnTheScreen();
    }
  });

  it('reads each tile as one phrase, label first', async () => {
    await render(<SummaryStrip tiles={tiles} />);

    expect(screen.getByLabelText('Vendido em nov.: 412 €')).toBeOnTheScreen();
  });

  it('never shrinks a long value below 12 points', async () => {
    await render(<SummaryStrip tiles={tiles} />);

    const { minimumFontScale } = screen.getByText('412 €').props;
    expect(minimumFontScale * Type.summaryValue.fontSize).toBeGreaterThanOrEqual(12);
  });
});
