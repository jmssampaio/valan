import { Image } from 'expo-image';

import appIcon from '../../assets/images/app-icon.svg';

import { Colors } from '@/constants/theme';

export type AppIconProps = {
  size: number;
};

/**
 * The app icon: the wave in cream on the orange tile. Inside the app it only appears as part of
 * the logo (design-spec.md, principle 8), never on its own.
 */
export function AppIcon({ size }: AppIconProps) {
  return (
    <Image
      testID="app-icon"
      source={appIcon}
      // The file reads its colours from these variables, so they stay theme tokens.
      svgVariables={{ '--tile': Colors.primary, '--wave': Colors.cream }}
      contentFit="contain"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size }}
    />
  );
}
