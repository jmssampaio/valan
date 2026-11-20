import { StyleSheet, View } from 'react-native';

import { AppText } from './app-text';
import { Card } from './card';
import { Tag } from './tag';

import { Spacing } from '@/constants/theme';

export type NoticeProps = {
  /** The consequence in two or three words, as a mark: "eBay only". */
  tag: string;
  title: string;
  /** Why it is so and what happens next. */
  body: string;
};

/** Tells the seller about a consequence of what they chose, where they chose it. */
export function Notice({ tag, title, body }: NoticeProps) {
  return (
    <Card padding="x4">
      <View style={styles.notice}>
        <View style={styles.heading}>
          <Tag label={tag} tone="filled" />
          <AppText variant="rowTitle" style={styles.title}>
            {title}
          </AppText>
        </View>
        <AppText variant="rowMeta" color="muted">
          {body}
        </AppText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  notice: {
    gap: Spacing.x2,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.x2,
  },
  title: {
    flex: 1,
  },
});
