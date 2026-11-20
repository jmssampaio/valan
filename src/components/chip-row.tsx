import { StyleSheet, View } from 'react-native';

import { PlatformChip, type ChipState } from './platform-chip';

import { Spacing } from '@/constants/theme';

export type ChipRowItem = {
  key: string;
  name: string;
  state: ChipState;
};

export type ChipRowProps = {
  items: readonly ChipRowItem[];
  testID?: string;
};

/** The chips of one item, side by side, wrapping onto a new line when they run out of room. */
export function ChipRow({ items, testID }: ChipRowProps) {
  return (
    <View testID={testID} style={styles.row}>
      {items.map((item) => (
        <PlatformChip key={item.key} name={item.name} state={item.state} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.x2,
  },
});
