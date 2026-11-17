import { Pressable, StyleSheet } from 'react-native';

import { AppText } from './app-text';

import { ControlHeight, Opacity, Spacing } from '@/constants/theme';

export type BackLinkProps = {
  /** As shown, with its drawn mark: "‹ Voltar". */
  label: string;
  /** The words alone, for screen readers. */
  accessibilityLabel?: string;
  onPress: () => void;
};

/** The way back at the top of a screen that is not a step of a flow. */
export function BackLink({ label, accessibilityLabel, onPress }: BackLinkProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      hitSlop={Spacing.x2}
      style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
      <AppText variant="navAction">{label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: {
    alignSelf: 'flex-start',
    justifyContent: 'center',
    minHeight: ControlHeight.small,
    minWidth: ControlHeight.small,
    marginBottom: Spacing.x2,
  },
  pressed: {
    opacity: Opacity.pressed,
  },
});
