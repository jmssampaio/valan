import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from './app-text';
import { Button } from './button';
import { ScreenTitle } from './screen-title';

import { Spacing } from '@/constants/theme';

export type ScreenMessageProps = {
  title: string;
  /** What happened and what to do next. */
  body: string;
  action?: {
    label: string;
    onPress: () => void;
  };
  /** A drawn gesture above the title, such as the wave on an empty screen. */
  illustration?: ReactNode;
};

/** What a screen shows in place of its content: empty, failed to load, or offline. */
export function ScreenMessage({ title, body, action, illustration }: ScreenMessageProps) {
  return (
    <View style={illustration ? styles.belowIllustration : styles.plain}>
      {illustration}
      <View style={styles.text}>
        <ScreenTitle size="medium">{title}</ScreenTitle>
        <AppText color="muted">{body}</AppText>
      </View>
      {action ? <Button label={action.label} onPress={action.onPress} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  plain: {
    gap: Spacing.x6,
    paddingTop: Spacing.x8,
  },
  // The screen sets how far the drawing sits below its title.
  belowIllustration: {
    gap: Spacing.x6,
  },
  text: {
    gap: Spacing.x2,
    paddingTop: Spacing.x2,
  },
});
