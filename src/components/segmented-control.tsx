import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from './app-text';

import { BorderWidth, Colors, ControlHeight, Opacity, Radius, Spacing } from '@/constants/theme';

export type ChoiceOption<Value extends string> = {
  value: Value;
  label: string;
};

export type SegmentedControlProps<Value extends string> = {
  options: readonly ChoiceOption<Value>[];
  value: Value;
  onChange: (value: Value) => void;
};

export function SegmentedControl<Value extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<Value>) {
  return (
    <View accessibilityRole="radiogroup" style={styles.group}>
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.segment,
              index > 0 && styles.divided,
              selected && styles.selected,
              pressed && styles.pressed,
            ]}>
            <AppText
              variant={selected ? 'optionSelected' : 'option'}
              color={selected ? 'onInk' : 'ink'}
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
  group: {
    flexDirection: 'row',
    borderWidth: BorderWidth.hairline,
    borderColor: Colors.ink,
    borderRadius: Radius.control,
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: ControlHeight.small,
    paddingVertical: Spacing.x2,
    paddingHorizontal: Spacing.x2,
  },
  label: {
    textAlign: 'center',
  },
  divided: {
    borderLeftWidth: BorderWidth.hairline,
    borderLeftColor: Colors.ink,
  },
  selected: {
    backgroundColor: Colors.ink,
  },
  pressed: {
    opacity: Opacity.pressed,
  },
});
