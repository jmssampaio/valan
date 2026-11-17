import { ActionSheetIOS, Alert, Platform } from 'react-native';

export type Choice = {
  label: string;
  onChoose: () => void;
};

/**
 * Asks the seller to pick one of a few actions. On iOS this is the system action sheet,
 * which is what the platform uses for "where from?" questions. Elsewhere (the browser
 * preview) it falls back to an alert, which is all React Native offers there.
 */
export function chooseOne({
  title,
  choices,
  cancelLabel,
}: {
  title: string;
  choices: readonly Choice[];
  cancelLabel: string;
}): void {
  if (Platform.OS !== 'ios') {
    Alert.alert(title, undefined, [
      ...choices.map(({ label, onChoose }) => ({ text: label, onPress: onChoose })),
      { text: cancelLabel, style: 'cancel' as const },
    ]);
    return;
  }

  ActionSheetIOS.showActionSheetWithOptions(
    {
      title,
      options: [...choices.map(({ label }) => label), cancelLabel],
      cancelButtonIndex: choices.length,
    },
    // The index past the choices is Cancel: nothing to do.
    (index) => choices[index]?.onChoose(),
  );
}
