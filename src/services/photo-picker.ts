import * as ImagePicker from 'expo-image-picker';

export type PickedPhoto = { uri: string };

export type PhotoPick =
  | { status: 'picked'; photos: PickedPhoto[] }
  | { status: 'cancelled' }
  /** The seller refused access; only the system settings can change that now. */
  | { status: 'denied' };

// Full quality would make uploads slow on mobile data; marketplaces shrink photos anyway.
const QUALITY = 0.8;

function toPick(result: ImagePicker.ImagePickerResult): PhotoPick {
  if (result.canceled) return { status: 'cancelled' };
  return { status: 'picked', photos: result.assets.map(({ uri }) => ({ uri })) };
}

/** Opens the system photo library. It runs outside the app, so it needs no permission. */
export async function pickPhotos(limit: number): Promise<PhotoPick> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: limit,
    quality: QUALITY,
  });
  return toPick(result);
}

export async function takePhoto(): Promise<PhotoPick> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) return { status: 'denied' };

  const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: QUALITY });
  return toPick(result);
}
