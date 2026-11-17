import { fireEvent, render, screen } from '@testing-library/react-native';

import { CheckRow } from '@/components/check-row';

describe('CheckRow', () => {
  it('says whether it is ticked', async () => {
    await render(<CheckRow title="Discogs" meta="Comissão estimada 2,52 €" checked onChange={jest.fn()} />);

    expect(screen.getByRole('checkbox', { name: /Discogs/ })).toBeChecked();
    expect(screen.getByText('Comissão estimada 2,52 €')).toBeOnTheScreen();
  });

  it('asks for the opposite when pressed', async () => {
    const onChange = jest.fn();
    await render(<CheckRow title="eBay" checked onChange={onChange} />);

    await fireEvent.press(screen.getByRole('checkbox', { name: /eBay/ }));

    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('cannot be ticked when disabled, and still shows the reason', async () => {
    const onChange = jest.fn();
    await render(
      <CheckRow
        title="Discogs"
        meta="Discogs só aceita discos que existam no seu catálogo."
        checked={false}
        disabled
        onChange={onChange}
      />,
    );

    const row = screen.getByRole('checkbox', { name: /Discogs/ });
    await fireEvent.press(row);

    expect(row).toBeDisabled();
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText('Discogs só aceita discos que existam no seu catálogo.')).toBeOnTheScreen();
  });
});
