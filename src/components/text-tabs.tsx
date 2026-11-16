import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from './app-text';
import type { ChoiceOption } from './segmented-control';

import { BorderWidth, Colors, ControlHeight, Opacity, Spacing } from '@/constants/theme';

export type TextTabsProps<Value extends string> = {
  options: readonly ChoiceOption<Value>[];
  value: Value;
  onChange: (value: Value) => void;
};

export function TextTabs<Value extends string>({ options, value, onChange }: TextTabsProps<Value>) {
  return (
    // iOS has no trait for "tablist"; "tabbar" is what makes VoiceOver read "tab, 2 of 3".
    <View accessibilityRole="tabbar">
      {/* Scrolls sideways so the labels can grow with the system text size without being cut off. */}
      <ScrollView
        horizontal
        alwaysBounceHorizontal={false}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => onChange(option.value)}
              style={({ pressed }) => [
                styles.tab,
                selected && styles.selected,
                pressed && styles.pressed,
              ]}>
              <AppText
                variant={selected ? 'optionSelected' : 'option'}
                color={selected ? 'ink' : 'muted'}
                numberOfLines={1}>
                {option.label}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    // Fills the width even with few tabs, so the hairline always spans the screen.
    flexGrow: 1,
    gap: Spacing.x5,
    borderBottomWidth: BorderWidth.hairline,
    borderBottomColor: Colors.line,
  },
  tab: {
    justifyContent: 'center',
    minHeight: ControlHeight.small,
    minWidth: ControlHeight.small,
    // Sits on top of the list's hairline, so the selected underline replaces it.
    marginBottom: -BorderWidth.hairline,
    borderBottomWidth: BorderWidth.indicator,
    borderBottomColor: Colors.transparent,
  },
  selected: {
    borderBottomColor: Colors.ink,
  },
  pressed: {
    opacity: Opacity.pressed,
  },
});
