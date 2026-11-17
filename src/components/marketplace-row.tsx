import { StyleSheet, View } from 'react-native';

import { AppText } from './app-text';
import { Button } from './button';
import { ListRow } from './list-row';
import { Tag, type TagTone } from './tag';

import { Spacing } from '@/constants/theme';

export type MarketplaceRowProps = {
  /** The marketplace's own name. */
  name: string;
  tag?: { label: string; tone: TagTone };
  /** What is going on with the listing there, under the name. */
  meta?: string;
  /** When the marketplace refused the listing: why, and the way to try again. */
  refusal?: {
    reason: string;
    retry: { label: string; onPress: () => void; disabled?: boolean };
    /** Said under the button, such as why trying again is not possible right now. */
    note?: string;
  };
  /** The last row of a list has no divider. */
  isLast?: boolean;
};

/** One marketplace a listing goes to, with its state and, if it was refused, a way to try again. */
export function MarketplaceRow({ name, tag, meta, refusal, isLast = false }: MarketplaceRowProps) {
  return (
    <ListRow
      title={name}
      meta={refusal ? undefined : meta}
      trailing={tag ? <Tag label={tag.label} tone={tag.tone} /> : undefined}
      divider={isLast ? 'none' : 'line'}>
      {refusal ? (
        <View style={styles.problem}>
          <AppText variant="rowMeta" color="error" accessibilityRole="alert">
            {refusal.reason}
          </AppText>
          <View style={styles.actions}>
            <Button
              label={refusal.retry.label}
              variant="outline"
              size="small"
              disabled={refusal.retry.disabled}
              onPress={refusal.retry.onPress}
            />
          </View>
          {refusal.note ? (
            <AppText variant="rowMeta" color="muted" accessibilityRole="alert">
              {refusal.note}
            </AppText>
          ) : null}
        </View>
      ) : null}
    </ListRow>
  );
}

const styles = StyleSheet.create({
  problem: {
    flex: 1,
    gap: Spacing.x3,
  },
  actions: {
    flexDirection: 'row',
  },
});
