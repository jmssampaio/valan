import { SymbolView, type SFSymbol, type SymbolWeight } from 'expo-symbols';
import { View } from 'react-native';

import { Colors, Size, type ThemeColor } from '@/constants/theme';

export type IconProps = {
  /** An SF Symbol. Only the iOS app draws it; the browser preview shows nothing in its place. */
  name: SFSymbol;
  size?: number;
  color?: ThemeColor;
  weight?: SymbolWeight;
  /**
   * Only for a symbol that stands for an action on its own, such as going back. Without it the
   * symbol decorates a label beside it and is hidden from screen readers.
   */
  accessibilityLabel?: string;
};

/**
 * A system symbol, for the tab bar and inline actions only (docs/standards/ux.md), and for the
 * state marks inside a platform chip.
 */
export function Icon({ name, size = Size.icon, color = 'ink', weight, accessibilityLabel }: IconProps) {
  const decorative = accessibilityLabel === undefined;

  return (
    <View
      testID="icon"
      accessible={!decorative}
      accessibilityRole={decorative ? undefined : 'image'}
      accessibilityLabel={accessibilityLabel}
      accessibilityElementsHidden={decorative}
      importantForAccessibility={decorative ? 'no-hide-descendants' : 'yes'}
      style={{ width: size, height: size }}>
      <SymbolView name={name} size={size} tintColor={Colors[color]} weight={weight} />
    </View>
  );
}
