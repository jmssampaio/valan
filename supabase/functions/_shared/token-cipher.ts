// Encrypts the marketplace credentials before they are stored, and decrypts them for the
// Edge Function that is about to call the marketplace. The key is a secret of the server
// (CONNECTION_TOKENS_KEY); the database only ever holds what this file produces.
//
// AES-256-GCM, through the Web Crypto that Deno ships with. A stored value reads
//   <key version>.<IV>.<ciphertext and tag>
// with the last two in URL-safe base64.

const IV_BYTES = 12;
const KEY_BYTES = 32;
const VERSION_LABEL = /^[A-Za-z0-9]+$/;

/** Which secret a value is, and whose. A value decrypts only where it was encrypted for. */
export interface CipherContext {
  readonly userId: string;
  readonly marketplace: string;
  /** The column, so one secret of a row cannot stand in for another. */
  readonly purpose: 'access_token' | 'refresh_token' | 'token_secret' | 'handshake';
}

export interface TokenCipher {
  encrypt(plaintext: string, context: CipherContext): Promise<string>;
  decrypt(stored: string, context: CipherContext): Promise<string>;
}

/** The only error this file throws. It never says what the key or the secret was. */
export class TokenCipherError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TokenCipherError';
  }
}

export interface TokenCipherOptions {
  /**
   * Every key still needed, by version, each 32 random bytes in base64. To rotate: add a new
   * version here, make it `current`, and keep the old one until every row is re-encrypted.
   */
  readonly keys: Readonly<Record<string, string>>;
  /** The version new values are encrypted with. */
  readonly current: string;
}

function fromBase64(text: string): Uint8Array<ArrayBuffer> | null {
  try {
    const padded = text.replaceAll('-', '+').replaceAll('_', '/');
    return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

function toBase64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

/**
 * What the ciphertext is bound to. Written as a JSON list, so no choice of ids can make two
 * different rows read the same; the key version is in it too, so the label cannot be changed.
 */
function boundTo(version: string, context: CipherContext): Uint8Array<ArrayBuffer> {
  // A missing id would bind every such value to the same "nobody", whatever the types promise.
  for (const part of [context.userId, context.marketplace, context.purpose]) {
    if (typeof part !== 'string' || part === '') {
      throw new TokenCipherError('A stored value must be bound to a seller, a marketplace and a purpose.');
    }
  }
  return new TextEncoder().encode(
    JSON.stringify([version, context.userId, context.marketplace, context.purpose]),
  );
}

async function importKey(version: string, base64: string): Promise<CryptoKey> {
  if (!VERSION_LABEL.test(version)) {
    throw new TokenCipherError('A key version may only have letters and digits.');
  }
  const bytes = fromBase64(base64);
  if (bytes === null || bytes.length !== KEY_BYTES) {
    throw new TokenCipherError(`The encryption key ${version} must be 32 bytes in base64.`);
  }
  return await crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function createTokenCipher(options: TokenCipherOptions): Promise<TokenCipher> {
  const keys = new Map<string, CryptoKey>();
  for (const [version, base64] of Object.entries(options.keys)) {
    keys.set(version, await importKey(version, base64));
  }
  const currentKey = keys.get(options.current);
  if (currentKey === undefined) {
    throw new TokenCipherError('There is no encryption key for the current version.');
  }

  return {
    async encrypt(plaintext, context) {
      // Never reused: with this cipher, two values under one IV give the key's secrets away.
      const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
      const sealed = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv, additionalData: boundTo(options.current, context) },
        currentKey,
        new TextEncoder().encode(plaintext),
      );
      return `${options.current}.${toBase64Url(iv)}.${toBase64Url(new Uint8Array(sealed))}`;
    },

    async decrypt(stored, context) {
      const refused = new TokenCipherError('The stored value could not be decrypted.');

      const parts = stored.split('.');
      if (parts.length !== 3) throw refused;
      const [version, ivText, sealedText] = parts;
      const key = keys.get(version);
      const iv = fromBase64(ivText);
      const sealed = fromBase64(sealedText);
      if (key === undefined || iv === null || sealed === null || iv.length !== IV_BYTES) throw refused;

      try {
        const plain = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv, additionalData: boundTo(version, context) },
          key,
          sealed,
        );
        return new TextDecoder().decode(plain);
      } catch {
        // Wrong key, wrong row or an altered value: the cipher does not say which, nor do we.
        throw refused;
      }
    },
  };
}
