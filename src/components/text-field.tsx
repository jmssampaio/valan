import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { AppText } from './app-text';

import { BorderWidth, Colors, ControlHeight, Radius, Spacing, Type } from '@/constants/theme';

export type TextFieldProps = Omit<TextInputProps, 'style' | 'accessibilityLabel'> & {
  /** Names the field. Shown above it, and always read by screen readers. */
  label: string;
  /** For a field whose placeholder already says what it is, such as a search box. */
  labelHidden?: boolean;
};

export function TextField({ label, labelHidden = false, multiline = false, ...input }: TextFieldProps) {
  return (
    <View style={styles.field}>
      {labelHidden ? null : (
        // The input carries the label for screen readers, so this copy is for the eye only.
        <AppText
          variant="caption"
          color="muted"
          accessibilityElementsHidden
          importantForAccessibility="no">
          {label}
        </AppText>
      )}
      <TextInput
        accessibilityLabel={label}
        multiline={multiline}
        placeholderTextColor={Colors.muted}
        selectionColor={Colors.accent}
        style={[styles.input, multiline && styles.area]}
        {...input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.x2,
  },
  input: {
    ...Type.body,
    minHeight: ControlHeight.row,
    paddingVertical: Spacing.x3,
    paddingHorizontal: Spacing.x4,
    color: Colors.ink,
    backgroundColor: Colors.surface,
    borderRadius: Radius.control,
    borderWidth: BorderWidth.hairline,
    borderColor: Colors.ink,
  },
  area: {
    minHeight: ControlHeight.area,
    textAlignVertical: 'top',
  },
});
