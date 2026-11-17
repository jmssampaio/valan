import { render, screen } from '@testing-library/react-native';

import { SummaryStrip } from '@/components/summary-strip';

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
});
