import { fireEvent, render, screen } from '@testing-library/react-native';

import { SegmentedControl } from '@/components/segmented-control';
import { Colors } from '@/constants/theme';

const options = [
  { value: 'record', label: 'Disco' },
  { value: 'equipment', label: 'Aparelho' },
] as const;

describe('SegmentedControl', () => {
  it('reports the option that was pressed', async () => {
    const onChange = jest.fn();
    await render(<SegmentedControl options={options} value="record" onChange={onChange} />);

    await fireEvent.press(screen.getByRole('radio', { name: 'Aparelho' }));

    expect(onChange).toHaveBeenCalledWith('equipment');
  });

  it('marks only the current option as chosen', async () => {
    await render(<SegmentedControl options={options} value="record" onChange={jest.fn()} />);

    expect(screen.getByRole('radio', { name: 'Disco' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Aparelho' })).not.toBeChecked();
  });

  it('can start with nothing chosen', async () => {
    await render(<SegmentedControl options={options} value={null} onChange={jest.fn()} />);

    expect(screen.getByRole('radio', { name: 'Disco' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Aparelho' })).not.toBeChecked();
  });
});

describe('SegmentedControl in design v3', () => {
  it('shows the chosen option as a white tile on the grey track', async () => {
    await render(<SegmentedControl options={options} value="record" onChange={jest.fn()} />);

    expect(screen.getByTestId('segmented-track')).toHaveStyle({ backgroundColor: Colors.fill });
    expect(screen.getByRole('radio', { name: 'Disco' })).toHaveStyle({ backgroundColor: Colors.surface });
    expect(screen.getByRole('radio', { name: 'Aparelho' })).not.toHaveStyle({
      backgroundColor: Colors.surface,
    });
  });

  it('keeps every option at least 44 points tall', async () => {
    await render(<SegmentedControl options={options} value="record" onChange={jest.fn()} />);

    for (const name of ['Disco', 'Aparelho']) {
      expect(screen.getByRole('radio', { name })).toHaveStyle({ minHeight: 44 });
    }
  });
});
