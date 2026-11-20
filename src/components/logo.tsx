import { StyleSheet, View } from 'react-native';

import { AppIcon } from './app-icon';
import { AppText } from './app-text';

import { Size, Spacing } from '@/constants/theme';

// The brand is written the same in every language, like a marketplace's name.
const BRAND_NAME = 'Valan';
const WORDMARK = 'VALAN';

/**
 * The logo has one form only: the app icon and the wordmark, at one size on every screen
 * (docs/standards/ux.md). It takes no props, so no screen can draw another version of it.
 */
export function Logo() {
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={BRAND_NAME} style={styles.logo}>
      <AppIcon size={Size.logo} />
      {/* Part of the drawing: it keeps its size with the icon whatever the system text size. */}
      <AppText variant="wordmark" allowFontScaling={false}>
        {WORDMARK}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  logo: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.x3,
  },
});
