import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from './app-text';

import {
  BorderWidth,
  Colors,
  ControlHeight,
  MaxFontScale,
  Opacity,
  Spacing,
} from '@/constants/theme';

export function TabBar({ state, descriptors, emitter, navigateToTab, insets }: BottomTabBarProps) {
  return (
    // iOS has no trait for "tablist"; "tabbar" is what makes VoiceOver read "tab, 2 of 4".
    <View accessibilityRole="tabbar" style={[styles.bar, { paddingBottom: insets.bottom }]}>
      {state.routes.map((route, index) => {
        const selected = index === state.index;
        const label = descriptors[route.key].options.title ?? route.name;

        const selectTab = () => {
          const event = emitter.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!selected && !event.defaultPrevented) {
            navigateToTab(route.key);
          }
        };

        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            // The label stops growing at MaxFontScale, so large-text users get it on long press.
            accessibilityShowsLargeContentViewer
            accessibilityLargeContentTitle={label}
            onPress={selectTab}
            style={({ pressed }) => [
              styles.tab,
              selected && styles.selected,
              pressed && styles.pressed,
            ]}>
            <AppText
              variant={selected ? 'tabSelected' : 'tab'}
              color={selected ? 'ink' : 'muted'}
              numberOfLines={1}
              maxFontSizeMultiplier={MaxFontScale.tabLabel}>
              {label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.x2,
    backgroundColor: Colors.paper,
    borderTopWidth: BorderWidth.hairline,
    borderTopColor: Colors.line,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: ControlHeight.row,
    // Sits on top of the bar's hairline, so the selected indicator replaces it.
    marginTop: -BorderWidth.hairline,
    borderTopWidth: BorderWidth.indicator,
    borderTopColor: Colors.transparent,
  },
  selected: {
    borderTopColor: Colors.accent,
  },
  pressed: {
    opacity: Opacity.pressed,
  },
});
