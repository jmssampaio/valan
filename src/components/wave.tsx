import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';

import waveLine from '../../assets/images/wave-line.svg';

import { Colors, Size } from '@/constants/theme';

/** The zigzag from the logo, drawn as a single line: Valan's gesture for an empty screen. */
export function Wave() {
  return (
    <Image
      testID="wave"
      source={waveLine}
      // The file reads its stroke from this variable, so the colour stays a theme token.
      svgVariables={{ '--stroke': Colors.line }}
      contentFit="contain"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.wave}
    />
  );
}

const styles = StyleSheet.create({
  wave: {
    alignSelf: 'stretch',
    height: Size.wave,
  },
});
