import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from './app-text';

import { Colors, ControlHeight, Opacity, Radius, Shadow, Spacing } from '@/constants/theme';

export type ChoiceOption<Value extends string> = {
  value: Value;
  label: string;
};

export type SegmentedControlProps<Value extends string> = {
  /** What is being chosen, for screen readers. */
  label?: string;
  options: readonly ChoiceOption<Value>[];
  /** Null while nothing is chosen yet. */
  value: Value | null;
  onChange: (value: Value) => void;
};

export function SegmentedControl<Value extends string>({
  label,
  options,
  value,
  onChange,
}: SegmentedControlProps<Value>) {
  return (
    <View
      testID="segmented-track"
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={styles.track}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.segment,
              selected && styles.selected,
              pressed && styles.pressed,
            ]}>
            <AppText
              variant={selected ? 'optionSelected' : 'option'}
              color={selected ? 'ink' : 'muted'}
              style={styles.label}>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  // The track's corner is the option's plus the gap around it, so the two curves stay parallel.
  track: {
    flexDirection: 'row',
    gap: Spacing.x1,
    padding: Spacing.x1,
    borderRadius: Radius.field,
    backgroundColor: Colors.fill,
  },
  // 44 points, not the 40 of the pictures: every touch target is at least 44 (docs/standards/ux.md).
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: ControlHeight.small,
    paddingVertical: Spacing.x2,
    paddingHorizontal: Spacing.x2,
    borderRadius: Radius.control,
  },
  label: {
    textAlign: 'center',
  },
  selected: {
    backgroundColor: Colors.surface,
    ...Shadow.selectedOption,
  },
  pressed: {
    opacity: Opacity.pressed,
  },
});
