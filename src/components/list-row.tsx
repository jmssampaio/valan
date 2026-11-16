import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from './app-text';

import { BorderWidth, Colors, ControlHeight, Opacity, Spacing } from '@/constants/theme';

type Divider = 'line' | 'ink' | 'none';

export type ListRowProps = {
  title: string;
  meta?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  /** Goes under the text because tags wrap and would squeeze the title beside it. */
  children?: ReactNode;
  /** The last row of a list has no divider; a row that closes a summary uses ink. */
  divider?: Divider;
  onPress?: () => void;
};

export function ListRow({
  title,
  meta,
  leading,
  trailing,
  children,
  divider = 'line',
  onPress,
}: ListRowProps) {
  const rowStyle = [styles.row, dividerStyles[divider]];

  const content = (
    <>
      {leading}
      <View style={styles.text}>
        <AppText variant="rowTitle">{title}</AppText>
        {meta ? (
          <AppText variant="rowMeta" color="muted">
            {meta}
          </AppText>
        ) : null}
        {children ? <View style={styles.below}>{children}</View> : null}
      </View>
      {/* Own box, so the row centres it whatever alignment the element asks for itself. */}
      {trailing ? <View>{trailing}</View> : null}
    </>
  );

  if (!onPress) {
    return <View style={rowStyle}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [rowStyle, pressed && styles.pressed]}>
      {content}
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
  below: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.x2,
    marginTop: Spacing.x2,
  },
});

const dividerStyles = StyleSheet.create({
  line: {
    borderBottomWidth: BorderWidth.hairline,
    borderBottomColor: Colors.line,
  },
  ink: {
    borderBottomWidth: BorderWidth.hairline,
    borderBottomColor: Colors.ink,
  },
  none: {},
});
