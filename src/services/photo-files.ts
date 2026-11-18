import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/** The two versions stored for every photo, as bytes ready to upload. */
export type PreparedPhoto = {
  /** For the screen of one item, and for the marketplaces. */
  full: ArrayBuffer;
  /** For rows and thumbnails, so a list never downloads full-size photos. */
  small: ArrayBuffer;
};

const FULL_LONG_SIDE = 1600;
const SMALL_LONG_SIDE = 320;
const QUALITY = 0.8;

function toBytes(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

/** Scales the photo so its longest side is `longSide`, never enlarging a smaller one. */
async function render(uri: string, width: number, height: number, longSide: number): Promise<ArrayBuffer> {
  const scale = Math.min(1, longSide / Math.max(width, height));
  const context = ImageManipulator.manipulate(uri);
  context.resize({ width: Math.round(width * scale), height: Math.round(height * scale) });

  const image = await context.renderAsync();
  // Drawn again from its pixels and saved as a new JPEG, the file carries none of what the
  // camera wrote into the original: no location, no device details.
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: QUALITY, base64: true });
  if (!saved.base64) throw new Error('The photo could not be prepared.');
  return toBytes(saved.base64);
}

/**
 * Turns a picked photo into what is stored: a JPEG of at most 1600 px and a small one of at
 * most 320 px. Both are re-encoded, so neither carries the original's metadata.
 */
export async function preparePhoto(uri: string): Promise<PreparedPhoto> {
  const original = await ImageManipulator.manipulate(uri).renderAsync();
  const { width, height } = original;

  return {
    full: await render(uri, width, height, FULL_LONG_SIDE),
    small: await render(uri, width, height, SMALL_LONG_SIDE),
  };
}
