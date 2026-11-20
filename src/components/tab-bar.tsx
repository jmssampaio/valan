import type { SFSymbol } from 'expo-symbols';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from './app-text';
import { Icon } from './icon';

import {
  BorderWidth,
  Colors,
  ControlHeight,
  MaxFontScale,
  Opacity,
  Radius,
  Size,
  Spacing,
} from '@/constants/theme';

export type TabBadge = {
  count: number;
  /** What the count means, for screen readers: "3 offers to answer". */
  accessibilityLabel: string;
};

export type TabBarProps = BottomTabBarProps & {
  /** The symbol above each tab's label, by route name. */
  icons?: Partial<Record<string, SFSymbol>>;
  /** Counts to show on a tab's symbol, by route name. A count of zero shows nothing. */
  badges?: Partial<Record<string, TabBadge>>;
};

export function TabBar({
  state,
  descriptors,
  emitter,
  navigateToTab,
  insets,
  icons = {},
  badges = {},
}: TabBarProps) {
  return (
    // iOS has no trait for "tablist"; "tabbar" is what makes VoiceOver read "tab, 2 of 4".
    <View accessibilityRole="tabbar" style={[styles.bar, { paddingBottom: insets.bottom }]}>
      {state.routes.map((route, index) => {
        const selected = index === state.index;
        const label = descriptors[route.key].options.title ?? route.name;
        const icon = icons[route.name];
        const badge = badges[route.name];
        const visibleBadge = badge && badge.count > 0 ? badge : undefined;

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
            // Named by its label alone; the badge is read after it as the tab's value.
            accessibilityLabel={label}
            accessibilityValue={visibleBadge ? { text: visibleBadge.accessibilityLabel } : undefined}
            // The label stops growing at MaxFontScale, so large-text users get it on long press.
            accessibilityShowsLargeContentViewer
            accessibilityLargeContentTitle={label}
            onPress={selectTab}
            style={({ pressed }) => [styles.tab, pressed && styles.pressed]}>
            {icon ? (
              <Icon
                name={icon}
                color={selected ? 'ink' : 'muted'}
                weight={selected ? 'semibold' : 'regular'}
              />
            ) : null}
            <AppText
              variant={selected ? 'tabSelected' : 'tab'}
              color={selected ? 'ink' : 'muted'}
              numberOfLines={1}
              maxFontSizeMultiplier={MaxFontScale.tabLabel}>
              {label}
            </AppText>
            {visibleBadge ? (
              // On the symbol's top right corner; read as the tab's value, not as text.
              <View style={styles.badge}>
                <AppText
                  variant="tabBadge"
                  maxFontSizeMultiplier={MaxFontScale.tabLabel}
                  accessibilityElementsHidden
                  importantForAccessibility="no">
                  {visibleBadge.count}
                </AppText>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    paddingTop: Spacing.x1,
    paddingHorizontal: Spacing.x2,
    backgroundColor: Colors.surface,
    borderTopWidth: BorderWidth.hairline,
    borderTopColor: Colors.line,
  },
  tab: {
    // Each tab is as wide as its label plus an equal share of the spare room, so a long label
    // borrows width from the short ones instead of being cut at large text sizes.
    flexGrow: 1,
    flexBasis: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.x1,
    minHeight: ControlHeight.large,
    minWidth: ControlHeight.small,
    paddingHorizontal: Spacing.x1,
  },
  badge: {
    position: 'absolute',
    top: 0,
    // From the middle of the tab, over the symbol's top right corner.
    left: '50%',
    marginLeft: Spacing.x1,
    minWidth: Size.badge,
    minHeight: Size.badge,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.x1,
    borderRadius: Radius.pill,
    backgroundColor: Colors.badge,
  },
  pressed: {
    opacity: Opacity.pressed,
  },
});
