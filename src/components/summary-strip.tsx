import { StyleSheet, View } from 'react-native';

import { AppText } from './app-text';

import { BorderWidth, Colors, Spacing } from '@/constants/theme';

export type SummaryTile = {
  value: string;
  label: string;
};

export type SummaryStripProps = {
  tiles: readonly SummaryTile[];
};

/** The row of figures that opens a screen. It is ruled like a ledger, not boxed like cards. */
export function SummaryStrip({ tiles }: SummaryStripProps) {
  return (
    <View style={styles.strip}>
      {tiles.map(({ value, label }, index) => (
        <View
          key={label}
          accessible
          accessibilityLabel={`${label}: ${value}`}
          style={[styles.tile, index > 0 && styles.following]}>
          {/* Shrinks to stay on one line, so a long amount never pushes the other tiles away. */}
          <AppText variant="summaryValue" numberOfLines={1} adjustsFontSizeToFit>
            {value}
          </AppText>
          <AppText variant="caption" color="muted">
            {label}
          </AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    borderTopWidth: BorderWidth.hairline,
    borderTopColor: Colors.ink,
    borderBottomWidth: BorderWidth.hairline,
    borderBottomColor: Colors.line,
  },
  tile: {
    flex: 1,
    gap: Spacing.x1,
    paddingVertical: Spacing.x3,
  },
  following: {
    paddingLeft: Spacing.x3,
    borderLeftWidth: BorderWidth.hairline,
    borderLeftColor: Colors.line,
  },
});
