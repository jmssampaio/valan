import { fireEvent, render, screen } from '@testing-library/react-native';

import { PhotoGrid, type PhotoGridProps } from '@/components/photo-grid';

const photos = [{ uri: 'file:///front.jpg' }, { uri: 'file:///back.jpg' }];

function renderGrid(overrides: Partial<PhotoGridProps> = {}) {
  const props: PhotoGridProps = {
    photos,
    max: 8,
    columns: 4,
    onAdd: jest.fn(),
    onPressPhoto: jest.fn(),
    addLabel: 'Adicionar\nfoto',
    addAccessibilityLabel: 'Adicionar foto',
    photoAccessibilityLabel: (position) => `Foto ${position} de ${photos.length}`,
    photoAccessibilityHint: 'Toca para remover',
    ...overrides,
  };
  return { props, rendered: render(<PhotoGrid {...props} />) };
}

describe('PhotoGrid', () => {
  it('names each photo by its position', async () => {
    await renderGrid().rendered;

    expect(screen.getByLabelText('Foto 1 de 2')).toBeOnTheScreen();
    expect(screen.getByLabelText('Foto 2 de 2')).toBeOnTheScreen();
  });

  it('reports which photo is pressed', async () => {
    const { props, rendered } = renderGrid();
    await rendered;

    await fireEvent.press(screen.getByLabelText('Foto 2 de 2'));

    expect(props.onPressPhoto).toHaveBeenCalledWith('file:///back.jpg');
  });

  it('asks for another photo when the add tile is pressed', async () => {
    const { props, rendered } = renderGrid();
    await rendered;

    await fireEvent.press(screen.getByRole('button', { name: 'Adicionar foto' }));

    expect(props.onAdd).toHaveBeenCalledTimes(1);
  });

  it('has no add tile once it is full', async () => {
    await renderGrid({ max: 2 }).rendered;

    expect(screen.queryByRole('button', { name: 'Adicionar foto' })).not.toBeOnTheScreen();
  });

  it('cannot be asked for a second photo while one is being added', async () => {
    await renderGrid({ adding: true }).rendered;

    expect(screen.getByRole('button', { name: 'Adicionar foto' })).toBeDisabled();
  });
});
