import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';

import waveHero from '../../assets/images/wave-hero.svg';
import waveLine from '../../assets/images/wave-line.svg';

import { Colors, Size, Spacing } from '@/constants/theme';

export type WaveProps = {
  /**
   * 'quiet' is the pale line of an empty screen. 'hero' is the entry screen's: in the accent
   * colour, taller, and running off both edges of the page.
   */
  variant?: 'quiet' | 'hero';
};

/** The zigzag from the logo, drawn as a single line: Valan's own gesture. */
export function Wave({ variant = 'quiet' }: WaveProps) {
  const isHero = variant === 'hero';

  return (
    <Image
      testID="wave"
      // Same drawing, two files: each carries its own colour as a fallback for where the
      // variable below is not applied (the browser preview).
      source={isHero ? waveHero : waveLine}
      // The file reads its stroke from this variable, so the colour stays a theme token.
      svgVariables={{ '--stroke': isHero ? Colors.accent : Colors.line }}
      contentFit={isHero ? 'fill' : 'contain'}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.wave, isHero && styles.hero]}
    />
  );
}

const styles = StyleSheet.create({
  wave: {
    alignSelf: 'stretch',
    height: Size.wave,
  },
  // Cancels the screen's side margins, so the line reaches the edges.
  hero: {
    height: Size.heroWave,
    marginHorizontal: -Spacing.x5,
  },
});
