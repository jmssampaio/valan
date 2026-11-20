import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';

import waveHero from '../../assets/images/wave-hero.svg';

import { Colors, Size, Spacing } from '@/constants/theme';

/**
 * The entry screen's wave: the zigzag of the logo as one line in the brand colour, running off
 * both edges of the page. Empty and failed screens draw the wave on its tile (ScreenMessage).
 */
export function Wave() {
  return (
    <Image
      testID="wave"
      source={waveHero}
      // The file reads its stroke from this variable, so the colour stays a theme token.
      svgVariables={{ '--stroke': Colors.primary }}
      contentFit="fill"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.wave}
    />
  );
}

const styles = StyleSheet.create({
  // Cancels the screen's side margins, so the line reaches the edges.
  wave: {
    alignSelf: 'stretch',
    height: Size.heroWave,
    marginHorizontal: -Spacing.x5,
  },
});
