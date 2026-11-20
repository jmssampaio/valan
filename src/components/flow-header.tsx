import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from './app-text';

import { Colors, ControlHeight, Opacity, Size, Spacing } from '@/constants/theme';

export type FlowHeaderProps = {
  /** The step on screen, counted from 1. */
  step: number;
  steps: number;
  /** Shown under the bar: "Passo 2 de 4 · Estado e fotos". */
  stepLabel: string;
  /** The spoken form, read once on the bar. */
  stepAccessibilityLabel: string;
  /** Leaves the flow on the first step and goes back on the others. */
  leading?: {
    label: string;
    /** For a label that carries a drawn mark, such as "‹ Back": the words alone. */
    accessibilityLabel?: string;
    onPress: () => void;
  };
};

/**
 * The top of every step in a multi-step flow: a way out or back, how far along it is, and the
 * name of the step (design-spec.md, StepHeader).
 */
export function FlowHeader({
  step,
  steps,
  stepLabel,
  stepAccessibilityLabel,
  leading,
}: FlowHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.nav}>
        {leading ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={leading.accessibilityLabel}
            onPress={leading.onPress}
            hitSlop={Spacing.x2}
            style={({ pressed }) => [styles.leading, pressed && styles.pressed]}>
            <AppText variant="navAction">{leading.label}</AppText>
          </Pressable>
        ) : null}
      </View>
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={stepAccessibilityLabel}
        accessibilityValue={{ min: 0, max: steps, now: step }}
        style={styles.progress}>
        {Array.from({ length: steps }, (_, index) => (
          <View
            key={index}
            testID="step-segment"
            style={[styles.segment, index < step && styles.done]}
          />
        ))}
      </View>
      {/* Read once, on the bar above. */}
      <AppText
        variant="label"
        color="muted"
        accessibilityElementsHidden
        importantForAccessibility="no">
        {stepLabel}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.x2,
    paddingBottom: Spacing.x4,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: ControlHeight.small,
  },
  leading: {
    justifyContent: 'center',
    minHeight: ControlHeight.small,
    minWidth: ControlHeight.small,
  },
  pressed: {
    opacity: Opacity.pressed,
  },
  progress: {
    flexDirection: 'row',
    gap: Spacing.x2,
  },
  segment: {
    flex: 1,
    height: Size.progress,
    backgroundColor: Colors.line,
  },
  done: {
    backgroundColor: Colors.primary,
  },
});
