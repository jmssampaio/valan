import { Image, type ImageProps } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { Colors, Radius, Size } from '@/constants/theme';

export type ThumbnailProps = {
  /** The item's first photo; null shows a plain tile in its place. */
  source: ImageProps['source'] | null;
};

// Decorative: the row's title already says what the item is. The spec draws a photo symbol on
// an empty tile; it stays plain, as no decorative icons are drawn (docs/standards/ux.md).
export function Thumbnail({ source }: ThumbnailProps) {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.frame}>
      {source ? (
        <Image testID="thumbnail-photo" source={source} contentFit="cover" style={styles.photo} />
      ) : (
        <View testID="thumbnail-placeholder" style={styles.photo} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: Size.thumbnail,
    height: Size.thumbnail,
    overflow: 'hidden',
    borderRadius: Radius.control,
    backgroundColor: Colors.fill,
  },
  photo: {
    flex: 1,
  },
});
