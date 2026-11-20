import { Image } from 'expo-image';

import waveMark from '../../assets/images/wave-mark.svg';

import { Colors, type ThemeColor } from '@/constants/theme';

// The drawing's box: the wave of the logo, cropped to the line and its round ends.
const DRAWING_HEIGHT_PER_WIDTH = 80 / 104;

export type WaveLineProps = {
  width: number;
  color?: ThemeColor;
};

/** The wave of the logo on its own: a drawing, not the logo, for empty and waiting screens. */
export function WaveLine({ width, color = 'primary' }: WaveLineProps) {
  return (
    <Image
      testID="wave-line"
      source={waveMark}
      // The file reads its stroke from this variable, so the colour stays a theme token.
      svgVariables={{ '--stroke': Colors[color] }}
      contentFit="contain"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width, height: width * DRAWING_HEIGHT_PER_WIDTH }}
    />
  );
}
