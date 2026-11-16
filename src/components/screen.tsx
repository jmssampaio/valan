import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenTitle, type ScreenTitleProps } from './screen-title';

import { Colors, Spacing } from '@/constants/theme';

export type ScreenProps = {
  title: string;
  titleSize?: ScreenTitleProps['size'];
  children?: ReactNode;
};

export function Screen({ title, titleSize, children }: ScreenProps) {
  return (
    // The bottom edge belongs to whatever sits there: the tab bar or a footer.
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <View style={styles.content}>
        <ScreenTitle size={titleSize}>{title}</ScreenTitle>
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
    gap: Spacing.x6,
    paddingHorizontal: Spacing.x5,
    paddingTop: Spacing.x2,
  },
});
