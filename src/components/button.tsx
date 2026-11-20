import type { SFSymbol } from 'expo-symbols';
import { ActivityIndicator, Pressable, StyleSheet, type ViewStyle } from 'react-native';

import { AppText } from './app-text';
import { Icon } from './icon';

import {
  Colors,
  ControlHeight,
  Opacity,
  Radius,
  Size,
  Spacing,
  type TextVariant,
  type ThemeColor,
} from '@/constants/theme';

type ButtonVariant = 'primary' | 'secondary' | 'dark' | 'link' | 'dangerLink';
type ButtonSize = 'default' | 'compact';

export type ButtonProps = {
  label: string;
  /** What a screen reader says when the label alone does not tell which one this is. */
  accessibilityLabel?: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** An inline symbol before the label, such as "+" or "open on the marketplace". */
  icon?: SFSymbol;
  disabled?: boolean;
  /** The request is on its way: shows that it is working and takes no second press. */
  loading?: boolean;
};

const labelColor: Record<ButtonVariant, ThemeColor> = {
  primary: 'onPrimary',
  secondary: 'ink',
  dark: 'onInk',
  link: 'primary',
  // For an action that cannot be undone: written in the danger colour, without a box.
  dangerLink: 'danger',
};

const isLink = (variant: ButtonVariant) => variant === 'link' || variant === 'dangerLink';

function labelVariant(variant: ButtonVariant, size: ButtonSize): TextVariant {
  return size === 'default' && !isLink(variant) ? 'button' : 'buttonCompact';
}

export function Button({
  label,
  accessibilityLabel,
  onPress,
  variant = 'primary',
  size = 'default',
  icon,
  disabled = false,
  loading = false,
}: ButtonProps) {
  const color = labelColor[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled, busy: loading }}
      // While loading, a second press would send the same request again.
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        isLink(variant) ? styles.link : sizeStyles[size],
        variantStyles[variant],
        pressed && (variant === 'primary' ? styles.primaryPressed : styles.pressed),
        disabled && styles.disabled,
      ]}>
      {loading ? (
        <ActivityIndicator
          testID="button-spinner"
          color={Colors[color]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      ) : icon ? (
        <Icon name={icon} size={Size.inlineIcon} color={color} />
      ) : null}
      <AppText variant={labelVariant(variant, size)} color={color} style={styles.label}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.x2,
    borderRadius: Radius.field,
    // Room for a label that wraps onto two lines at large text sizes.
    paddingVertical: Spacing.x2,
  },
  link: {
    minHeight: ControlHeight.small,
    paddingHorizontal: Spacing.x2,
  },
  label: {
    flexShrink: 1,
    textAlign: 'center',
  },
  pressed: {
    opacity: Opacity.pressed,
  },
  primaryPressed: {
    backgroundColor: Colors.primaryPressed,
  },
  disabled: {
    opacity: Opacity.disabled,
  },
});

const sizeStyles = StyleSheet.create<Record<ButtonSize, ViewStyle>>({
  default: {
    minHeight: ControlHeight.large,
    paddingHorizontal: Spacing.x5,
  },
  compact: {
    minHeight: ControlHeight.compact,
    paddingHorizontal: Spacing.x4,
  },
});

const variantStyles = StyleSheet.create<Record<ButtonVariant, ViewStyle>>({
  primary: {
    backgroundColor: Colors.primary,
  },
  secondary: {
    backgroundColor: Colors.fill,
  },
  dark: {
    backgroundColor: Colors.ink,
  },
  link: {},
  dangerLink: {},
});
