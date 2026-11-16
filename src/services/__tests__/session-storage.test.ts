import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import { sessionStorage } from '../session-storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
// The polyfill needs a native module; the test runtime already has crypto.getRandomValues.
jest.mock('react-native-get-random-values', () => ({}));
jest.mock('expo-secure-store', () => {
  const keychain = new Map<string, string>();
  return {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'when-unlocked-this-device-only',
    getItemAsync: jest.fn(async (key: string) => keychain.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      keychain.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      keychain.delete(key);
    }),
  };
});

const storageKey = 'sb-valan-auth-token';
const session = JSON.stringify({ access_token: 'access-abc', refresh_token: 'refresh-xyz' });

afterEach(async () => {
  await sessionStorage.removeItem(storageKey);
  await AsyncStorage.clear();
});

describe('sessionStorage', () => {
  it('returns the session that was stored', async () => {
    await sessionStorage.setItem(storageKey, session);

    expect(await sessionStorage.getItem(storageKey)).toBe(session);
  });

  it('returns nothing when no session was stored', async () => {
    expect(await sessionStorage.getItem(storageKey)).toBeNull();
  });

  it('keeps the session unreadable outside the keychain', async () => {
    await sessionStorage.setItem(storageKey, session);

    const onDisk = await AsyncStorage.getItem(storageKey);
    expect(onDisk).not.toBeNull();
    expect(onDisk).not.toContain('access-abc');
    expect(onDisk).not.toContain('refresh-xyz');
  });

  it('keeps only a 256-bit key in the keychain, never the session', async () => {
    await sessionStorage.setItem(storageKey, session);

    const inKeychain = await SecureStore.getItemAsync(storageKey);
    expect(inKeychain).toMatch(/^[0-9a-f]{64}$/);
  });

  it('keeps the key on this device only', async () => {
    await sessionStorage.setItem(storageKey, session);

    expect(SecureStore.setItemAsync).toHaveBeenLastCalledWith(storageKey, expect.any(String), {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  });

  it('encrypts with a new key every time a session is saved', async () => {
    await sessionStorage.setItem(storageKey, session);
    const firstKey = await SecureStore.getItemAsync(storageKey);

    await sessionStorage.setItem(storageKey, session);

    expect(await SecureStore.getItemAsync(storageKey)).not.toBe(firstKey);
  });

  it('stores a session larger than the keychain limit of 2048 bytes', async () => {
    const largeSession = JSON.stringify({ access_token: 'a'.repeat(5000) });

    await sessionStorage.setItem(storageKey, largeSession);

    expect(await sessionStorage.getItem(storageKey)).toBe(largeSession);
  });

  it('forgets the session and its key when removed', async () => {
    await sessionStorage.setItem(storageKey, session);

    await sessionStorage.removeItem(storageKey);

    expect(await sessionStorage.getItem(storageKey)).toBeNull();
    expect(await AsyncStorage.getItem(storageKey)).toBeNull();
    expect(await SecureStore.getItemAsync(storageKey)).toBeNull();
  });

  it('returns nothing, instead of failing, when the key is gone', async () => {
    await sessionStorage.setItem(storageKey, session);
    await SecureStore.deleteItemAsync(storageKey);

    expect(await sessionStorage.getItem(storageKey)).toBeNull();
  });
});
