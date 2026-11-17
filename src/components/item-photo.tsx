import { Image, type ImageProps } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BorderWidth, Colors, Size } from '@/constants/theme';

export type ItemPhotoProps = {
  /** The item's first photo; null shows a plain square. */
  source: ImageProps['source'] | null;
};

const SQUARE = 1;

/** Fits the photo in the largest square without cutting it: the long side is the full size. */
function frameFor(ratio: number) {
  return ratio >= SQUARE
    ? { width: Size.detailPhoto, height: Size.detailPhoto / ratio }
    : { width: Size.detailPhoto * ratio, height: Size.detailPhoto };
}

/**
 * The seller's photo at its true proportions, for the screen of one item. Decorative: the
 * title beside it already says what the item is.
 */
export function ItemPhoto({ source }: ItemPhotoProps) {
  const [ratio, setRatio] = useState(SQUARE);

  return (
    <View
      testID="item-photo-frame"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.frame, frameFor(ratio)]}>
      {source ? (
        <Image
          testID="item-photo"
          source={source}
          contentFit="contain"
          style={styles.photo}
          onLoad={({ source: loaded }) => {
            // A photo that reports no size stays square rather than collapsing.
            if (loaded.width > 0 && loaded.height > 0) setRatio(loaded.width / loaded.height);
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    borderWidth: BorderWidth.hairline,
    borderColor: Colors.photoEdge,
  },
  photo: {
    flex: 1,
  },
});
