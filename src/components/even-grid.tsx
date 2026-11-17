import { Children, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';

export type EvenGridProps = {
  columns: number;
  children: ReactNode;
};

/**
 * Rows of equal-width cells that stretch to the full width. A short last row is padded with
 * empty cells, so its cells stay as wide as the ones above instead of stretching.
 */
export function EvenGrid({ columns, children }: EvenGridProps) {
  const cells = Children.toArray(children);
  const rowCount = Math.ceil(cells.length / columns);
  const rows = Array.from({ length: rowCount }, (_, row) =>
    Array.from({ length: columns }, (_, column) => cells[row * columns + column] ?? null),
  );

  return (
    <View style={styles.grid}>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((cell, column) => (
            <View key={column} style={styles.cell}>
              {cell}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: Spacing.x2,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.x2,
  },
  cell: {
    flex: 1,
  },
});
