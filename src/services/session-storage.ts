import 'react-native-get-random-values';

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as aesjs from 'aes-js';
import * as SecureStore from 'expo-secure-store';

// A Supabase session is larger than the 2048 bytes the keychain accepts per value.
// So the session is stored AES-256 encrypted on disk and only its key goes in the
// keychain. This follows Supabase's Expo guide; change it with care.

const keyOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

// The counter always starts at 1, which is only safe because every save uses a new key.
const initialCounter = 1;

async function encryptWithNewKey(storageKey: string, value: string): Promise<string> {
  const encryptionKey = crypto.getRandomValues(new Uint8Array(256 / 8));
  const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(initialCounter));
  const encrypted = cipher.encrypt(aesjs.utils.utf8.toBytes(value));

  await SecureStore.setItemAsync(storageKey, aesjs.utils.hex.fromBytes(encryptionKey), keyOptions);

  return aesjs.utils.hex.fromBytes(encrypted);
}

async function decrypt(storageKey: string, encryptedHex: string): Promise<string | null> {
  const encryptionKeyHex = await SecureStore.getItemAsync(storageKey, keyOptions);
  if (!encryptionKeyHex) {
    return null;
  }

  const cipher = new aesjs.ModeOfOperation.ctr(
    aesjs.utils.hex.toBytes(encryptionKeyHex),
    new aesjs.Counter(initialCounter),
  );
  return aesjs.utils.utf8.fromBytes(cipher.decrypt(aesjs.utils.hex.toBytes(encryptedHex)));
}

/** The storage the Supabase client keeps its session in. */
export const sessionStorage = {
  async getItem(storageKey: string): Promise<string | null> {
    const encryptedHex = await AsyncStorage.getItem(storageKey);
    if (!encryptedHex) {
      return null;
    }
    return decrypt(storageKey, encryptedHex);
  },

  async setItem(storageKey: string, value: string): Promise<void> {
    await AsyncStorage.setItem(storageKey, await encryptWithNewKey(storageKey, value));
  },

  async removeItem(storageKey: string): Promise<void> {
    await AsyncStorage.removeItem(storageKey);
    await SecureStore.deleteItemAsync(storageKey, keyOptions);
  },
};
