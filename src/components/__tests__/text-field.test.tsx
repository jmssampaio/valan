import { fireEvent, render, screen } from '@testing-library/react-native';

import { TextField } from '@/components/text-field';

describe('TextField', () => {
  it('is named by its label and shows it', async () => {
    await render(<TextField label="Nome do aparelho" value="" onChangeText={jest.fn()} />);

    expect(screen.getByLabelText('Nome do aparelho')).toBeOnTheScreen();
    expect(screen.getByText('Nome do aparelho', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('keeps its name for screen readers when the label is not shown', async () => {
    await render(
      <TextField label="Procurar no catálogo" labelHidden value="" onChangeText={jest.fn()} />,
    );

    expect(screen.getByLabelText('Procurar no catálogo')).toBeOnTheScreen();
    expect(
      screen.queryByText('Procurar no catálogo', { includeHiddenElements: true }),
    ).not.toBeOnTheScreen();
  });

  it('reports what is typed', async () => {
    const onChangeText = jest.fn();
    await render(<TextField label="Descrição" value="" onChangeText={onChangeText} multiline />);

    await fireEvent.changeText(screen.getByLabelText('Descrição'), 'Primeira edição.');

    expect(onChangeText).toHaveBeenCalledWith('Primeira edição.');
  });
});
