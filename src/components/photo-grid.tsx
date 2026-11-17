import { Image } from 'expo-image';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { AppText } from './app-text';
import { EvenGrid } from './even-grid';

import { BorderWidth, Colors, Opacity, Radius } from '@/constants/theme';

export type PhotoGridProps = {
  photos: readonly { uri: string }[];
  /** The add tile disappears once this many photos are in. */
  max: number;
  columns: number;
  onAdd: () => void;
  onPressPhoto: (uri: string) => void;
  /** True while a photo is being fetched from the camera or the library. */
  adding?: boolean;
  /** The words on the add tile; may break onto two lines. */
  addLabel: string;
  addAccessibilityLabel: string;
  /** What a screen reader says for the photo at a position, counted from 1. */
  photoAccessibilityLabel: (position: number) => string;
  /** What pressing a photo does: "Tap to remove". */
  photoAccessibilityHint: string;
};

/** The seller's photos as square tiles, followed by a tile that adds another. */
export function PhotoGrid({
  photos,
  max,
  columns,
  onAdd,
  onPressPhoto,
  adding = false,
  addLabel,
  addAccessibilityLabel,
  photoAccessibilityLabel,
  photoAccessibilityHint,
}: PhotoGridProps) {
  return (
    <EvenGrid columns={columns}>
      {photos.map(({ uri }, index) => (
        <Pressable
          key={uri}
          accessibilityRole="imagebutton"
          accessibilityLabel={photoAccessibilityLabel(index + 1)}
          accessibilityHint={photoAccessibilityHint}
          onPress={() => onPressPhoto(uri)}
          style={({ pressed }) => [styles.tile, styles.photo, pressed && styles.pressed]}>
          <Image source={{ uri }} contentFit="cover" style={styles.image} />
        </Pressable>
      ))}
      {photos.length < max ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={addAccessibilityLabel}
          accessibilityState={{ busy: adding, disabled: adding }}
          disabled={adding}
          onPress={onAdd}
          style={({ pressed }) => [styles.tile, styles.add, pressed && styles.pressed]}>
          {adding ? (
            <ActivityIndicator color={Colors.ink} />
          ) : (
            <AppText variant="tileLabel" style={styles.addLabel}>
              {addLabel}
            </AppText>
          )}
        </Pressable>
      ) : null}
    </EvenGrid>
  );
}

const styles = StyleSheet.create({
  tile: {
    aspectRatio: 1,
    overflow: 'hidden',
  },
  photo: {
    backgroundColor: Colors.surface,
    borderWidth: BorderWidth.hairline,
    borderColor: Colors.photoEdge,
  },
  image: {
    flex: 1,
  },
  add: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.control,
    borderWidth: BorderWidth.hairline,
    borderStyle: 'dashed',
    borderColor: Colors.ink,
  },
  addLabel: {
    textAlign: 'center',
  },
  pressed: {
    opacity: Opacity.pressed,
  },
});
