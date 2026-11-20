import { StyleSheet, View } from 'react-native';

import { Card } from './card';

import { Colors, Radius, Size, Spacing } from '@/constants/theme';

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
            <View style={styles.thumbnail} />
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
  thumbnail: {
    width: Size.thumbnail,
    height: Size.thumbnail,
    borderRadius: Radius.control,
    backgroundColor: Colors.fill,
  },
  lines: {
    flex: 1,
    gap: Spacing.x2,
  },
  line: {
    height: Spacing.x3,
    backgroundColor: Colors.fill,
  },
  long: {
    width: '70%',
  },
  short: {
    width: '40%',
  },
});
