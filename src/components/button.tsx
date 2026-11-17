import { Pressable, StyleSheet, type ViewStyle } from 'react-native';

import { AppText } from './app-text';

import {
  BorderWidth,
  Colors,
  ControlHeight,
  Opacity,
  Radius,
  Spacing,
  type ThemeColor,
} from '@/constants/theme';

type ButtonVariant = 'primary' | 'ink' | 'outline' | 'text' | 'danger';
type ButtonSize = 'large' | 'small';

export type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
};

const labelColor: Record<ButtonVariant, ThemeColor> = {
  primary: 'onAccent',
  ink: 'onInk',
  outline: 'ink',
  text: 'ink',
  // For an action that cannot be undone: it is written in the error colour, without a box.
  danger: 'error',
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'large',
  disabled = false,
}: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        sizeStyles[size],
        variantStyles[variant],
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}>
      <AppText
        variant={size === 'large' ? 'button' : 'buttonSmall'}
        color={labelColor[variant]}
        style={styles.label}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.control,
    // Room for a label that wraps onto two lines at large text sizes.
    paddingVertical: Spacing.x2,
    borderWidth: BorderWidth.hairline,
    borderColor: Colors.transparent,
  },
  label: {
    textAlign: 'center',
  },
  pressed: {
    opacity: Opacity.pressed,
  },
  disabled: {
    opacity: Opacity.disabled,
  },
});

const sizeStyles = StyleSheet.create<Record<ButtonSize, ViewStyle>>({
  large: {
    minHeight: ControlHeight.large,
    paddingHorizontal: Spacing.x5,
  },
  small: {
    minHeight: ControlHeight.small,
    paddingHorizontal: Spacing.x4,
  },
});

const variantStyles = StyleSheet.create<Record<ButtonVariant, ViewStyle>>({
  primary: {
    backgroundColor: Colors.accent,
  },
  ink: {
    backgroundColor: Colors.ink,
  },
  outline: {
    borderColor: Colors.ink,
  },
  text: {},
  danger: {},
});
