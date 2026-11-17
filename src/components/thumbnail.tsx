import { Image, type ImageProps } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { BorderWidth, Colors, Size } from '@/constants/theme';

export type ThumbnailProps = {
  /** The item's first photo; null shows a plain placeholder. */
  source: ImageProps['source'] | null;
};

// Decorative: the row's title already says what the item is.
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
    backgroundColor: Colors.surface,
    borderWidth: BorderWidth.hairline,
    borderColor: Colors.photoEdge,
  },
  photo: {
    flex: 1,
  },
});
