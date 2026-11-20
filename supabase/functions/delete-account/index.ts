// Deletes the account of the seller who calls it, with their photo files.
//
// Only the server can delete a user or reach every file in a folder, so this runs with the
// service-role key, which exists here and nowhere in the app. It acts only on the account
// the caller's own session token belongs to.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { deleteAccount, type AccountDeletion } from './delete-account.ts';

const PHOTO_BUCKET = 'item-photos';
const PAGE = 100;

const STATUS = {
  not_signed_in: 401,
  wrong_password: 403,
  failed: 500,
} as const;

function env(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`The function is missing its ${name} setting.`);
  return value;
}

/** A client that keeps nothing: every request starts from scratch. */
function client(key: string): SupabaseClient {
  return createClient(env('SUPABASE_URL'), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Removes every file under a seller's folder: {user id}/{item id}/{photo}.jpg. */
async function deletePhotoFiles(admin: SupabaseClient, userId: string): Promise<void> {
  const bucket = admin.storage.from(PHOTO_BUCKET);

  // Each pass deletes what it lists, so the next pass always starts from the beginning.
  for (;;) {
    const folders = await bucket.list(userId, { limit: PAGE });
    if (folders.error) throw folders.error;
    if (folders.data.length === 0) return;

    for (const folder of folders.data) {
      const prefix = `${userId}/${folder.name}`;
      for (;;) {
        const files = await bucket.list(prefix, { limit: PAGE });
        if (files.error) throw files.error;
        if (files.data.length === 0) break;

        const removed = await bucket.remove(files.data.map(({ name }) => `${prefix}/${name}`));
        if (removed.error) throw removed.error;
      }
    }
  }
}

function server(): AccountDeletion {
  const admin = client(env('SUPABASE_SERVICE_ROLE_KEY'));

  return {
    async identify(token) {
      const { data, error } = await admin.auth.getUser(token);
      if (error || !data.user?.email) return null;
      return { id: data.user.id, email: data.user.email };
    },

    async passwordIsRight(email, password) {
      // Checked the way signing in checks it, with the public key and a throwaway client.
      const { error } = await client(env('SUPABASE_ANON_KEY')).auth.signInWithPassword({ email, password });
      if (!error) return true;
      if (error.code === 'invalid_credentials') return false;
      throw error;
    },

    deletePhotoFiles: (userId) => deletePhotoFiles(admin, userId),

    async deleteUser(userId) {
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) throw error;
    },

    reportFailure(error) {
      console.error('delete-account failed:', error instanceof Error ? error.message : error);
    },
  };
}

function tokenFrom(request: Request): string | null {
  const header = request.headers.get('Authorization') ?? '';
  const [scheme, token] = header.split(' ');
  return scheme === 'Bearer' && token ? token : null;
}

async function passwordFrom(request: Request): Promise<string> {
  try {
    const body: unknown = await request.json();
    const password = typeof body === 'object' && body !== null ? (body as { password?: unknown }).password : undefined;
    return typeof password === 'string' ? password : '';
  } catch {
    // No body, or not JSON: the same as no password.
    return '';
  }
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return Response.json({ reason: 'failed' }, { status: 405 });

  const outcome = await deleteAccount(server(), {
    token: tokenFrom(request),
    password: await passwordFrom(request),
  });

  return outcome.ok
    ? Response.json({ ok: true })
    : Response.json({ reason: outcome.reason }, { status: STATUS[outcome.reason] });
});
