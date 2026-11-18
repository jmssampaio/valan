import 'react-native-get-random-values';

const HEX = 16;

/** A new UUID (version 4). */
function newId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(HEX));
  // The version and variant bits that make it a version 4 UUID.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(HEX).padStart(2, '0'));
  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10).join(''),
  ].join('-');
}

/**
 * A new item id, made on the device when a draft starts. Saving and publishing are keyed by
 * it, so sending the same draft twice can never create a second item.
 */
export function newItemId(): string {
  return newId();
}

/**
 * A new photo id, made on the device when a photo is picked. It names the photo's files and
 * its row, so saving the same draft twice never stores a photo twice.
 */
export function newPhotoId(): string {
  return newId();
}
