import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { AppText } from './app-text';

import { Colors, ControlHeight, Opacity, Spacing } from '@/constants/theme';

export type SwitchRowProps = {
  title: string;
  meta?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
};

/**
 * A setting that is on or off. The whole row is the control, so the target is the row's
 * height and not the switch's; the native switch only shows the state.
 */
export function SwitchRow({ title, meta, value, onValueChange }: SwitchRowProps) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={() => onValueChange(!value)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.text}>
        <AppText variant="rowTitle">{title}</AppText>
        {meta ? (
          <AppText variant="rowMeta" color="muted">
            {meta}
          </AppText>
        ) : null}
      </View>
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants">
        <Switch value={value} trackColor={{ true: Colors.primary, false: Colors.line }} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.x4,
    minHeight: ControlHeight.row,
    paddingVertical: Spacing.x4,
  },
  pressed: {
    opacity: Opacity.pressed,
  },
  text: {
    flex: 1,
  },
});
