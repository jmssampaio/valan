import { fireEvent, render, screen } from '@testing-library/react-native';

import { SwitchRow } from '@/components/switch-row';

describe('SwitchRow', () => {
  it('says whether it is on', async () => {
    await render(
      <SwitchRow title="Aceitar propostas" meta="Os compradores podem propor outro preço" value onValueChange={jest.fn()} />,
    );

    expect(screen.getByRole('switch', { name: /Aceitar propostas/ })).toBeChecked();
    expect(screen.getByText('Os compradores podem propor outro preço')).toBeOnTheScreen();
  });

  it('asks for the opposite when the row is pressed anywhere', async () => {
    const onValueChange = jest.fn();
    await render(<SwitchRow title="Aceitar propostas" value={false} onValueChange={onValueChange} />);

    await fireEvent.press(screen.getByRole('switch', { name: /Aceitar propostas/ }));

    expect(onValueChange).toHaveBeenCalledWith(true);
  });
});
