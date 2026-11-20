import { assert, assertEquals, assertRejects } from '@std/assert';

import { type CipherContext, createTokenCipher, TokenCipherError } from './token-cipher.ts';

/** A key as the founder generates one: 32 random bytes in base64. */
function newKey(): string {
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
}

function bytesOf(base64Url: string): Uint8Array {
  const base64 = base64Url.replaceAll('-', '+').replaceAll('_', '/');
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
}

const ana: CipherContext = { userId: 'ana', marketplace: 'discogs', purpose: 'access_token' };
const TOKEN = 'a-marketplace-token-nobody-may-read';

const KEY = newKey();
const cipher = () => createTokenCipher({ keys: { v1: KEY }, current: 'v1' });

Deno.test('token cipher: gives back what it encrypted', async () => {
  const tokens = await cipher();

  const stored = await tokens.encrypt(TOKEN, ana);

  assertEquals(await tokens.decrypt(stored, ana), TOKEN);
});

Deno.test('token cipher: does not store the text it was given', async () => {
  const stored = await (await cipher()).encrypt(TOKEN, ana);

  assert(!stored.includes(TOKEN));
  // Nor the same text merely encoded.
  const encoded = btoa(TOKEN).replaceAll('=', '');
  assert(!stored.includes(encoded));
  assert(!stored.includes(encoded.replaceAll('+', '-').replaceAll('/', '_')));
});

Deno.test('token cipher: uses a fresh 12-byte IV for every encryption', async () => {
  const tokens = await cipher();

  const stored = await Promise.all(Array.from({ length: 50 }, () => tokens.encrypt(TOKEN, ana)));

  const ivs = stored.map((value) => value.split('.')[1]);
  assertEquals(new Set(ivs).size, 50);
  assertEquals(new Set(stored).size, 50);
  for (const iv of ivs) assertEquals(bytesOf(iv).length, 12);
});

Deno.test('token cipher: a value copied to another seller does not decrypt', async () => {
  const tokens = await cipher();
  const stored = await tokens.encrypt(TOKEN, ana);

  await assertRejects(() => tokens.decrypt(stored, { ...ana, userId: 'bob' }), TokenCipherError);
});

Deno.test('token cipher: a value copied to another marketplace does not decrypt', async () => {
  const tokens = await cipher();
  const stored = await tokens.encrypt(TOKEN, ana);

  await assertRejects(() => tokens.decrypt(stored, { ...ana, marketplace: 'ebay' }), TokenCipherError);
});

Deno.test('token cipher: a value copied to another column of the same row does not decrypt', async () => {
  const tokens = await cipher();
  const stored = await tokens.encrypt(TOKEN, ana);

  await assertRejects(() => tokens.decrypt(stored, { ...ana, purpose: 'token_secret' }), TokenCipherError);
});

Deno.test('token cipher: the parts of a row cannot be shuffled into another row', async () => {
  const tokens = await cipher();
  // "a" + "b:c" and "a:b" + "c" must not come to the same thing.
  const stored = await tokens.encrypt(TOKEN, { userId: 'a', marketplace: 'b:c', purpose: 'access_token' });

  await assertRejects(
    () => tokens.decrypt(stored, { userId: 'a:b', marketplace: 'c', purpose: 'access_token' }),
    TokenCipherError,
  );
});

Deno.test('token cipher: refuses a value that was altered', async () => {
  const tokens = await cipher();
  const [version, iv, body] = (await tokens.encrypt(TOKEN, ana)).split('.');
  const flipped = body.startsWith('A') ? `B${body.slice(1)}` : `A${body.slice(1)}`;

  await assertRejects(() => tokens.decrypt(`${version}.${iv}.${flipped}`, ana), TokenCipherError);
});

Deno.test('token cipher: refuses a value encrypted with another key', async () => {
  const stored = await (await cipher()).encrypt(TOKEN, ana);
  const other = await createTokenCipher({ keys: { v1: newKey() }, current: 'v1' });

  await assertRejects(() => other.decrypt(stored, ana), TokenCipherError);
});

Deno.test('token cipher: marks every stored value with the version of its key', async () => {
  const stored = await (await cipher()).encrypt(TOKEN, ana);

  assertEquals(stored.split('.').length, 3);
  assertEquals(stored.split('.')[0], 'v1');
});

Deno.test('token cipher: after a rotation, reads old values and writes with the new key', async () => {
  const before = await (await cipher()).encrypt(TOKEN, ana);
  const newerKey = newKey();
  const rotated = await createTokenCipher({ keys: { v1: KEY, v2: newerKey }, current: 'v2' });

  assertEquals(await rotated.decrypt(before, ana), TOKEN);

  const after = await rotated.encrypt(TOKEN, ana);
  assertEquals(after.split('.')[0], 'v2');
  // The new value really is under the new key: the new key alone reads it, the old one cannot.
  const onlyNew = await createTokenCipher({ keys: { v2: newerKey }, current: 'v2' });
  assertEquals(await onlyNew.decrypt(after, ana), TOKEN);
  const onlyOld = await createTokenCipher({ keys: { v1: KEY }, current: 'v1' });
  await assertRejects(() => onlyOld.decrypt(after, ana), TokenCipherError);
});

Deno.test('token cipher: the version label of a value cannot be changed', async () => {
  // The same key under both labels: only the binding of the label can refuse the swap.
  const rotated = await createTokenCipher({ keys: { v1: KEY, v2: KEY }, current: 'v2' });
  const [, iv, body] = (await rotated.encrypt(TOKEN, ana)).split('.');

  await assertRejects(() => rotated.decrypt(`v1.${iv}.${body}`, ana), TokenCipherError);
});

Deno.test('token cipher: refuses a value it does not recognise', async () => {
  const tokens = await cipher();

  for (const stored of ['', 'not-a-stored-value', 'v9.AAAA.AAAA', 'v1..', 'v1.AAAA', 'v1.!!!.???']) {
    await assertRejects(() => tokens.decrypt(stored, ana), TokenCipherError);
  }
});

Deno.test('token cipher: needs a key of 32 bytes, and one for the current version', async () => {
  const short = btoa('too short');

  await assertRejects(() => createTokenCipher({ keys: { v1: short }, current: 'v1' }), TokenCipherError);
  await assertRejects(() => createTokenCipher({ keys: { v1: 'not base64 at all!' }, current: 'v1' }), TokenCipherError);
  await assertRejects(() => createTokenCipher({ keys: { v1: KEY }, current: 'v2' }), TokenCipherError);
  await assertRejects(() => createTokenCipher({ keys: { 'v.1': KEY }, current: 'v.1' }), TokenCipherError);
});

Deno.test('token cipher: never puts a key or a token in an error', async () => {
  const tokens = await cipher();
  const stored = await tokens.encrypt(TOKEN, ana);
  const short = btoa('a-key-that-is-far-too-short');

  const errors = [
    await assertRejects(() => tokens.decrypt(stored, { ...ana, userId: 'bob' }), TokenCipherError),
    await assertRejects(() => createTokenCipher({ keys: { v1: short }, current: 'v1' }), TokenCipherError),
  ];

  for (const error of errors) {
    const everythingItSays = `${error.message} ${error.stack} ${JSON.stringify(error)}`;
    assert(!everythingItSays.includes(TOKEN));
    assert(!everythingItSays.includes(KEY));
    assert(!everythingItSays.includes(short));
    assert(!everythingItSays.includes(stored));
  }
});

Deno.test('token cipher: refuses to encrypt or decrypt for a row it cannot name', async () => {
  const tokens = await cipher();
  const stored = await tokens.encrypt(TOKEN, ana);
  // What a caller with a missing id would pass, whatever the types say.
  const nameless = [
    { ...ana, userId: '' },
    { ...ana, marketplace: '' },
    { ...ana, userId: undefined },
    { ...ana, marketplace: null },
    { ...ana, purpose: undefined },
  ] as unknown as CipherContext[];

  for (const context of nameless) {
    await assertRejects(() => tokens.encrypt(TOKEN, context), TokenCipherError);
    await assertRejects(() => tokens.decrypt(stored, context), TokenCipherError);
  }
});
