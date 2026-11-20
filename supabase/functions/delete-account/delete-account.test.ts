import { assertEquals } from '@std/assert';

import { deleteAccount, type AccountDeletion } from './delete-account.ts';

type Calls = string[];

/** A server that knows one seller, Ana, and records what it was asked to do. */
function server(overrides: Partial<AccountDeletion> = {}): AccountDeletion & { calls: Calls } {
  const calls: Calls = [];
  return {
    calls,
    identify: (token) =>
      Promise.resolve(token === 'ana-token' ? { id: 'ana', email: 'ana@example.test' } : null),
    passwordIsRight: (email, password) =>
      Promise.resolve(email === 'ana@example.test' && password === 'a frase certa'),
    deletePhotoFiles: (userId) => {
      calls.push(`photos:${userId}`);
      return Promise.resolve();
    },
    deleteUser: (userId) => {
      calls.push(`user:${userId}`);
      return Promise.resolve();
    },
    ...overrides,
  };
}

const request = { token: 'ana-token', password: 'a frase certa' };

Deno.test('deletes the photos, then the account, of the seller who asked', async () => {
  const ana = server();

  assertEquals(await deleteAccount(ana, request), { ok: true });
  assertEquals(ana.calls, ['photos:ana', 'user:ana']);
});

Deno.test('refuses a caller who is not signed in', async () => {
  const ana = server();

  assertEquals(await deleteAccount(ana, { ...request, token: null }), { ok: false, reason: 'not_signed_in' });
  assertEquals(await deleteAccount(ana, { ...request, token: 'forged' }), { ok: false, reason: 'not_signed_in' });
  assertEquals(ana.calls, []);
});

Deno.test('refuses without the current password, and deletes nothing', async () => {
  const ana = server();

  assertEquals(await deleteAccount(ana, { ...request, password: 'errada' }), {
    ok: false,
    reason: 'wrong_password',
  });
  assertEquals(await deleteAccount(ana, { ...request, password: '' }), { ok: false, reason: 'wrong_password' });
  assertEquals(ana.calls, []);
});

Deno.test('deletes only the seller the token belongs to, whoever the request names', async () => {
  const ana = server();
  // A request body can say anything; the account to delete comes from the token alone.
  const forged = { ...request, userId: 'bob', user_id: 'bob', id: 'bob' };

  await deleteAccount(ana, forged);

  assertEquals(ana.calls, ['photos:ana', 'user:ana']);
});

Deno.test('keeps the account when its photos cannot be deleted, so nothing is orphaned', async () => {
  const ana = server({ deletePhotoFiles: () => Promise.reject(new Error('storage is down')) });

  assertEquals(await deleteAccount(ana, request), { ok: false, reason: 'failed' });
  assertEquals(ana.calls, []);
});

Deno.test('says it failed when the account itself cannot be deleted', async () => {
  const ana = server({ deleteUser: () => Promise.reject(new Error('auth is down')) });

  assertEquals(await deleteAccount(ana, request), { ok: false, reason: 'failed' });
  // The photos are gone; asking again finishes the job.
  assertEquals(ana.calls, ['photos:ana']);
});

Deno.test('says it failed, and deletes nothing, when the password cannot be checked', async () => {
  const ana = server({ passwordIsRight: () => Promise.reject(new Error('auth is down')) });

  assertEquals(await deleteAccount(ana, request), { ok: false, reason: 'failed' });
  assertEquals(ana.calls, []);
});
