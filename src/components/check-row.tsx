import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from './app-text';

import { BorderWidth, Colors, ControlHeight, Opacity, Radius, Size, Spacing } from '@/constants/theme';

export type CheckRowProps = {
  title: string;
  /** A detail under the title, or the reason the row cannot be ticked. */
  meta?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Shown but not tickable. The meta line must say why. */
  disabled?: boolean;
  trailing?: ReactNode;
  divider?: 'line' | 'none';
};

const CHECK_MARK = '✓';

/** A row that is one of several things to include, such as a marketplace to publish on. */
export function CheckRow({
  title,
  meta,
  checked,
  onChange,
  disabled = false,
  trailing,
  divider = 'line',
}: CheckRowProps) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={() => onChange(!checked)}
      style={({ pressed }) => [
        styles.row,
        divider === 'line' && styles.divided,
        pressed && styles.pressed,
      ]}>
      <View style={[styles.box, checked && styles.checked, disabled && styles.unavailable]}>
        {checked ? (
          // The row already says "checked"; the mark is for the eye.
          <AppText
            variant="tileLabel"
            color="onInk"
            accessibilityElementsHidden
            importantForAccessibility="no">
            {CHECK_MARK}
          </AppText>
        ) : null}
      </View>
      <View style={styles.text}>
        <AppText variant="rowTitle" color={disabled ? 'muted' : 'ink'}>
          {title}
        </AppText>
        {meta ? (
          <AppText variant="rowMeta" color="muted">
            {meta}
          </AppText>
        ) : null}
      </View>
      {trailing ? <View>{trailing}</View> : null}
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
  divided: {
    borderBottomWidth: BorderWidth.hairline,
    borderBottomColor: Colors.line,
  },
  pressed: {
    opacity: Opacity.pressed,
  },
  box: {
    alignItems: 'center',
    justifyContent: 'center',
    width: Size.checkbox,
    height: Size.checkbox,
    borderRadius: Radius.tag,
    borderWidth: BorderWidth.hairline,
    borderColor: Colors.ink,
  },
  checked: {
    backgroundColor: Colors.ink,
  },
  // The title in muted text already says the row is off; the box only steps back.
  unavailable: {
    borderColor: Colors.line,
  },
  text: {
    flex: 1,
  },
});
