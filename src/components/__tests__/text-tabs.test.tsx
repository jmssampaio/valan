import { fireEvent, render, screen } from '@testing-library/react-native';

import { TextTabs } from '@/components/text-tabs';

const options = [
  { value: 'active', label: 'Ativos' },
  { value: 'drafts', label: 'Rascunhos' },
  { value: 'sold', label: 'Vendidos' },
] as const;

describe('TextTabs', () => {
  it('reports the tab that was pressed', async () => {
    const onChange = jest.fn();
    await render(<TextTabs options={options} value="active" onChange={onChange} />);

    await fireEvent.press(screen.getByRole('tab', { name: 'Rascunhos' }));

    expect(onChange).toHaveBeenCalledWith('drafts');
  });

  it('marks only the current tab as selected', async () => {
    await render(<TextTabs options={options} value="active" onChange={jest.fn()} />);

    expect(screen.getByRole('tab', { name: 'Ativos' })).toBeSelected();
    expect(screen.getByRole('tab', { name: 'Vendidos' })).not.toBeSelected();
  });
});
