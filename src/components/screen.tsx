import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
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
  /** Sits above the title, such as the step header of a flow. */
  header?: ReactNode;
  /** Stays at the bottom, above the keyboard: the action that moves a flow forward. */
  footer?: ReactNode;
  /** Lets the content scroll, for forms taller than the screen. */
  scroll?: boolean;
  children?: ReactNode;
};

export function Screen({
  title,
  titleSize,
  titleAction,
  titleGap = 'x6',
  header,
  footer,
  scroll = false,
  children,
}: ScreenProps) {
  const titleRow = (
    <View style={styles.header}>
      <View style={styles.title}>
        <ScreenTitle size={titleSize}>{title}</ScreenTitle>
      </View>
      {titleAction}
    </View>
  );
  const gap = { gap: Spacing[titleGap] };

  const content = (
    <>
      {header ? (
        // One block, so the gap below the title does not also open between header and title.
        <View>
          {header}
          {titleRow}
        </View>
      ) : (
        titleRow
      )}
      {children}
    </>
  );

  const body = scroll ? (
    <ScrollView
      style={styles.fill}
      contentContainerStyle={[styles.scrollContent, gap]}
      // A tap on a button or a row must act at once, not just close the keyboard.
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}>
      {content}
    </ScrollView>
  ) : (
    <View style={[styles.content, gap]}>{content}</View>
  );

  return (
    // The bottom edge belongs to whatever sits there: the tab bar or a footer.
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      {footer || scroll ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.fill}>
          {body}
          {footer ? (
            // At least the usual padding; more where the home indicator needs it.
            <SafeAreaView edges={{ bottom: 'maximum' }} style={styles.footer}>
              {footer}
            </SafeAreaView>
          ) : null}
        </KeyboardAvoidingView>
      ) : (
        body
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.paper,
  },
  fill: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.x5,
    paddingTop: Spacing.x2,
  },
  scrollContent: {
    paddingHorizontal: Spacing.x5,
    paddingTop: Spacing.x2,
    paddingBottom: Spacing.x6,
  },
  footer: {
    gap: Spacing.x2,
    paddingHorizontal: Spacing.x5,
    paddingTop: Spacing.x3,
    paddingBottom: Spacing.x3,
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
