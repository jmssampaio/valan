import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from './app-text';

import { Colors, ControlHeight, Opacity, Size, Spacing } from '@/constants/theme';

export type FlowHeaderProps = {
  /** The step on screen, counted from 1. */
  step: number;
  steps: number;
  /** The short form shown beside the bar: "1/4". */
  stepLabel: string;
  /** The spoken form: "Step 1 of 4". */
  stepAccessibilityLabel: string;
  /** Leaves the flow on the first step and goes back on the others. */
  leading?: {
    label: string;
    onPress: () => void;
  };
};

/** The top of every step in a multi-step flow: a way out or back, and how far along it is. */
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
            onPress={leading.onPress}
            hitSlop={Spacing.x2}
            style={({ pressed }) => [styles.leading, pressed && styles.pressed]}>
            <AppText variant="navAction">{leading.label}</AppText>
          </Pressable>
        ) : (
          <View />
        )}
        {/* Read once, on the bar below. */}
        <AppText
          variant="step"
          color="muted"
          accessibilityElementsHidden
          importantForAccessibility="no">
          {stepLabel}
        </AppText>
      </View>
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={stepAccessibilityLabel}
        accessibilityValue={{ min: 0, max: steps, now: step }}
        style={styles.progress}>
        {Array.from({ length: steps }, (_, index) => (
          <View key={index} style={[styles.segment, index < step && styles.done]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingBottom: Spacing.x5,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    gap: Spacing.x1,
    marginTop: Spacing.x1,
  },
  segment: {
    flex: 1,
    height: Size.progress,
    backgroundColor: Colors.line,
  },
  done: {
    backgroundColor: Colors.ink,
  },
});
