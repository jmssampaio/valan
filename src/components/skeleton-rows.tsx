import { StyleSheet, View } from 'react-native';

import { Card } from './card';
import { Thumbnail } from './thumbnail';

import { Colors, Size, Spacing } from '@/constants/theme';

const ROWS = 3;

export type SkeletonRowsProps = {
  /** What is loading, read once: "A carregar os anúncios". */
  accessibilityLabel: string;
};

/** Three rows shaped like the ones to come, without text, while a list loads (design-spec.md, §5). */
export function SkeletonRows({ accessibilityLabel }: SkeletonRowsProps) {
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={accessibilityLabel}>
      <Card>
        {Array.from({ length: ROWS }, (_, index) => (
          <View key={index} testID="skeleton-row" style={styles.row}>
            <Thumbnail source={null} />
            <View style={styles.lines}>
              <View style={[styles.line, styles.long]} />
              <View style={[styles.line, styles.short]} />
            </View>
          </View>
        ))}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.x3,
    padding: Spacing.x3,
  },
  lines: {
    flex: 1,
    gap: Spacing.x2,
  },
  line: {
    height: Size.skeletonLine,
    backgroundColor: Colors.fill,
  },
  // Two lines of text to come, the second shorter, as in a row's title and detail.
  long: {
    width: '70%',
  },
  short: {
    width: '40%',
  },
});
