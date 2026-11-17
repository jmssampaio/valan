import { ActionSheetIOS, Alert, Platform } from 'react-native';

import { chooseOne } from '../choice-sheet';

const sheet = jest.spyOn(ActionSheetIOS, 'showActionSheetWithOptions').mockImplementation(() => {});
const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

const camera = jest.fn();
const library = jest.fn();
const question = {
  title: 'Adicionar foto',
  choices: [
    { label: 'Tirar foto', onChoose: camera },
    { label: 'Escolher da galeria', onChoose: library },
  ],
  cancelLabel: 'Cancelar',
};

const realPlatform = Platform.OS;

beforeEach(() => jest.clearAllMocks());
afterEach(() => {
  Platform.OS = realPlatform;
});

describe('chooseOne', () => {
  it('shows the choices in the iOS action sheet, with cancel last', () => {
    chooseOne(question);

    expect(sheet.mock.calls[0][0]).toEqual({
      title: 'Adicionar foto',
      options: ['Tirar foto', 'Escolher da galeria', 'Cancelar'],
      cancelButtonIndex: 2,
    });
    expect(alert).not.toHaveBeenCalled();
  });

  it('runs the choice that was picked, and only that one', () => {
    chooseOne(question);

    sheet.mock.calls[0][1](1);

    expect(library).toHaveBeenCalledTimes(1);
    expect(camera).not.toHaveBeenCalled();
  });

  it('does nothing when the seller cancels', () => {
    chooseOne(question);

    sheet.mock.calls[0][1](2);

    expect(camera).not.toHaveBeenCalled();
    expect(library).not.toHaveBeenCalled();
  });

  it('falls back to an alert where there is no action sheet', () => {
    Platform.OS = 'web';

    chooseOne(question);

    expect(sheet).not.toHaveBeenCalled();
    expect(alert.mock.calls[0][2]?.map(({ text }) => text)).toEqual([
      'Tirar foto',
      'Escolher da galeria',
      'Cancelar',
    ]);
  });
});
