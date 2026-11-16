import { StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  const color = theme[themeColor ?? (type === 'linkPrimary' ? 'accent' : 'ink')];

  return <Text style={[{ color }, styles[type], style]} {...rest} />;
}

// Weights are chosen through the font file, not fontWeight: iOS would synthesize a fake bold.
const styles = StyleSheet.create({
  small: {
    fontFamily: Fonts.textMedium,
    fontSize: 14,
    lineHeight: 20,
  },
  smallBold: {
    fontFamily: Fonts.textBold,
    fontSize: 14,
    lineHeight: 20,
  },
  default: {
    fontFamily: Fonts.textMedium,
    fontSize: 16,
    lineHeight: 24,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 48,
    lineHeight: 52,
  },
  subtitle: {
    fontFamily: Fonts.display,
    fontSize: 32,
    lineHeight: 44,
  },
  link: {
    fontFamily: Fonts.textMedium,
    lineHeight: 30,
    fontSize: 14,
  },
  linkPrimary: {
    fontFamily: Fonts.textSemiBold,
    lineHeight: 30,
    fontSize: 14,
  },
  code: {
    fontFamily: Fonts.monoMedium,
    fontSize: 12,
  },
});
