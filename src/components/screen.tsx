import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenTitle, type ScreenTitleProps } from './screen-title';

import { Colors, Spacing } from '@/constants/theme';

export type ScreenProps = {
  title: string;
  titleSize?: ScreenTitleProps['size'];
  /** The screen's main action, shown on the same line as the title. */
  titleAction?: ReactNode;
  /** Space between the title and the content. Screens that open with a summary sit closer. */
  titleGap?: keyof typeof Spacing;
  children?: ReactNode;
};

export function Screen({ title, titleSize, titleAction, titleGap = 'x6', children }: ScreenProps) {
  return (
    // The bottom edge belongs to whatever sits there: the tab bar or a footer.
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <View style={[styles.content, { gap: Spacing[titleGap] }]}>
        <View style={styles.header}>
          <View style={styles.title}>
            <ScreenTitle size={titleSize}>{title}</ScreenTitle>
          </View>
          {titleAction}
        </View>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.paper,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.x5,
    paddingTop: Spacing.x2,
  },
  // On a narrow screen or at a large text size the action drops below the title,
  // so the title is never squeezed into breaking in the middle of a word.
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.x3,
  },
  title: {
    flexShrink: 1,
  },
});
