import { StyleSheet, View } from 'react-native';

import { AppText } from './app-text';
import { Button } from './button';
import { ScreenTitle } from './screen-title';
import { WaveLine } from './wave-line';

import { Colors, Radius, Size, Spacing } from '@/constants/theme';

export type ScreenMessageProps = {
  title: string;
  /** What happened and what to do next. */
  body: string;
  action?: {
    label: string;
    onPress: () => void;
  };
};

/**
 * What a screen shows in place of its content: empty, failed to load, or offline. One layout for
 * all three (design-spec.md, EmptyState and ErrorState): the wave on its tile, then the words.
 */
export function ScreenMessage({ title, body, action }: ScreenMessageProps) {
  return (
    <View style={styles.message}>
      <View
        testID="message-wave"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.tile}>
        <WaveLine width={Size.waveOnTile} />
      </View>
      <View style={styles.text}>
        <ScreenTitle size="small" align="center">
          {title}
        </ScreenTitle>
        <AppText variant="bodySmall" color="muted" style={styles.body}>
          {body}
        </AppText>
      </View>
      {action ? (
        // Full width, like every main action, though the words above are centred.
        <View style={styles.action}>
          <Button label={action.label} onPress={action.onPress} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  message: {
    alignItems: 'center',
    gap: Spacing.x4,
    paddingTop: Spacing.x8,
    paddingHorizontal: Spacing.x3,
  },
  tile: {
    width: Size.waveTile,
    height: Size.waveTile,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.waveTile,
    backgroundColor: Colors.primaryTint,
  },
  text: {
    gap: Spacing.x2,
  },
  body: {
    textAlign: 'center',
  },
  action: {
    alignSelf: 'stretch',
  },
});
