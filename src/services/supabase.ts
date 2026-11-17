import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database';

import { getSupabaseConfig } from './config';
import { sessionStorage } from './session-storage';

let client: SupabaseClient<Database> | undefined;

/**
 * The app's single Supabase client. Only files in src/services/ may use it;
 * screens and components call the services instead.
 */
export function getSupabase(): SupabaseClient<Database> {
  if (client === undefined) {
    const { url, publishableKey } = getSupabaseConfig();
    client = createClient<Database>(url, publishableKey, {
      auth: {
        storage: sessionStorage,
        persistSession: true,
        autoRefreshToken: true,
        // Only browsers receive a session in the URL; the app uses deep links.
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}

/**
 * The id of the seller who is signed in. Services that read or write a seller's rows ask
 * for it first, so a call made with nobody signed in fails here, plainly, and not as an
 * empty answer from the database.
 */
export async function requireUserId(): Promise<string> {
  const { data } = await getSupabase().auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) throw new Error('Nobody is signed in.');
  return userId;
}
