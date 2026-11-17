import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from './app-text';
import { EvenGrid } from './even-grid';
import type { ChoiceOption } from './segmented-control';

import { BorderWidth, Colors, ControlHeight, Opacity, Radius, Spacing } from '@/constants/theme';

export type ChipGridProps<Value extends string> = {
  /** What is being chosen, for screen readers: "Record condition". */
  label: string;
  options: readonly ChoiceOption<Value>[];
  /** Null while nothing is chosen yet. */
  value: Value | null;
  onChange: (value: Value) => void;
  columns: number;
};

/** A choice among short codes or words, such as the condition grades, laid out in even rows. */
export function ChipGrid<Value extends string>({
  label,
  options,
  value,
  onChange,
  columns,
}: ChipGridProps<Value>) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label}>
      <EvenGrid columns={columns}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              onPress={() => onChange(option.value)}
              style={({ pressed }) => [
                styles.chip,
                selected && styles.selected,
                pressed && styles.pressed,
              ]}>
              <AppText variant="chip" color={selected ? 'onInk' : 'ink'} style={styles.label}>
                {option.label}
              </AppText>
            </Pressable>
          );
        })}
      </EvenGrid>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: ControlHeight.small,
    paddingVertical: Spacing.x2,
    paddingHorizontal: Spacing.x1,
    borderRadius: Radius.control,
    borderWidth: BorderWidth.hairline,
    borderColor: Colors.ink,
  },
  selected: {
    backgroundColor: Colors.ink,
  },
  pressed: {
    opacity: Opacity.pressed,
  },
  label: {
    textAlign: 'center',
  },
});
