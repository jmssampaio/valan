import { fireEvent, render, screen } from '@testing-library/react-native';

import { ChipGrid } from '@/components/chip-grid';

const grades = [
  { value: 'M', label: 'M' },
  { value: 'NM', label: 'NM' },
  { value: 'VG+', label: 'VG+' },
] as const;

describe('ChipGrid', () => {
  it('offers every option, with none chosen at first', async () => {
    await render(
      <ChipGrid label="Estado do disco" options={grades} value={null} onChange={jest.fn()} columns={4} />,
    );

    for (const { label } of grades) {
      expect(screen.getByRole('radio', { name: label })).not.toBeChecked();
    }
  });

  it('marks only the chosen option', async () => {
    await render(
      <ChipGrid label="Estado do disco" options={grades} value="NM" onChange={jest.fn()} columns={4} />,
    );

    expect(screen.getByRole('radio', { name: 'NM' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'M' })).not.toBeChecked();
  });

  it('reports the option that is pressed', async () => {
    const onChange = jest.fn();
    await render(
      <ChipGrid label="Estado do disco" options={grades} value={null} onChange={onChange} columns={4} />,
    );

    await fireEvent.press(screen.getByRole('radio', { name: 'VG+' }));

    expect(onChange).toHaveBeenCalledWith('VG+');
  });
});
