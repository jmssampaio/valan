import { StyleSheet, View, type ViewStyle } from 'react-native';

import { AppText } from './app-text';

import { BorderWidth, Colors, Radius, Spacing, type ThemeColor } from '@/constants/theme';

export type TagTone = 'neutral' | 'success' | 'error' | 'waiting' | 'filled';

export type TagProps = {
  label: string;
  tone?: TagTone;
};

const labelColor: Record<TagTone, ThemeColor> = {
  neutral: 'ink',
  success: 'primary',
  error: 'danger',
  waiting: 'muted',
  filled: 'onInk',
};

export function Tag({ label, tone = 'neutral' }: TagProps) {
  return (
    <View style={[styles.base, toneStyles[tone]]}>
      <AppText variant="seal" color={labelColor[tone]} numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.x1,
    paddingHorizontal: Spacing.x2,
    borderRadius: Radius.seal,
    // The same edge width as a platform chip, so the two seals in use look alike.
    borderWidth: BorderWidth.control,
    borderColor: Colors.line,
  },
});

const toneStyles = StyleSheet.create<Record<TagTone, ViewStyle>>({
  neutral: {},
  success: {
    borderColor: Colors.primary,
  },
  error: {
    borderColor: Colors.danger,
  },
  waiting: {
    borderStyle: 'dashed',
  },
  filled: {
    backgroundColor: Colors.ink,
    borderColor: Colors.ink,
  },
});
