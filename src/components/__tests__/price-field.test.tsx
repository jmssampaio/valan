import { fireEvent, render, screen } from '@testing-library/react-native';

import { PriceField } from '@/components/price-field';

describe('PriceField', () => {
  it('is named for screen readers and shows its currency', async () => {
    await render(
      <PriceField label="Preço em EUR" value="28,00" onChangeText={jest.fn()} currency="EUR" placeholder="0,00" />,
    );

    expect(screen.getByLabelText('Preço em EUR')).toHaveProp('value', '28,00');
    expect(screen.getByText('EUR', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('reports what is typed', async () => {
    const onChangeText = jest.fn();
    await render(
      <PriceField label="Preço em EUR" value="" onChangeText={onChangeText} currency="EUR" placeholder="0,00" />,
    );

    await fireEvent.changeText(screen.getByLabelText('Preço em EUR'), '45');

    expect(onChangeText).toHaveBeenCalledWith('45');
  });
});
