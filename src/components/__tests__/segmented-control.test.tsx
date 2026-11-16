import { fireEvent, render, screen } from '@testing-library/react-native';

import { SegmentedControl } from '@/components/segmented-control';

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
});
