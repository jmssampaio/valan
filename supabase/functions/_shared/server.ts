// How the connection functions reach Supabase and their settings. Everything here runs on
// the server only: the service-role key and the marketplace keys never leave it.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { publicCallbackUrl } from './connections/settings.ts';
import { createDiscogsConnector } from './connectors/discogs.ts';
import type { Connector, Marketplace } from './connectors/types.ts';
import { createTokenCipher, type TokenCipher } from './token-cipher.ts';

/** Discogs asks every application to name itself in its requests. */
const USER_AGENT = 'Valan/1.0';

function optionalEnv(name: string): string | null {
  return Deno.env.get(name) || null;
}

export function env(name: string): string {
  const value = optionalEnv(name);
  if (value === null) throw new Error(`The function is missing its ${name} setting.`);
  return value;
}

/** A service-role client that keeps nothing: every request starts from scratch. */
export function adminClient(): SupabaseClient {
  return createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function identify(admin: SupabaseClient, token: string): Promise<{ id: string } | null> {
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return null;
  return { id: data.user.id };
}

export function tokenFrom(request: Request): string | null {
  const header = request.headers.get('Authorization') ?? '';
  const [scheme, token] = header.split(' ');
  return scheme === 'Bearer' && token ? token : null;
}

/** The marketplace a request names in its JSON body: anything, or nothing. */
export async function marketplaceFrom(request: Request): Promise<unknown> {
  try {
    const body: unknown = await request.json();
    return typeof body === 'object' && body !== null ? (body as { marketplace?: unknown }).marketplace : undefined;
  } catch {
    // No body, or not JSON: the same as naming no marketplace.
    return undefined;
  }
}

/** The connector of a marketplace; null while this server has no keys for it. */
export function connectorFor(marketplace: Marketplace): Connector | null {
  if (marketplace === 'discogs') {
    const consumerKey = optionalEnv('DISCOGS_CONSUMER_KEY');
    const consumerSecret = optionalEnv('DISCOGS_CONSUMER_SECRET');
    if (consumerKey === null || consumerSecret === null) return null;
    return createDiscogsConnector({ consumerKey, consumerSecret, userAgent: USER_AGENT });
  }
  // eBay has no connector yet.
  return null;
}

/**
 * The cipher for stored credentials. CONNECTION_TOKENS_KEY is version 1. To rotate, add the
 * new key under a new setting and version here, make it current, and keep version 1 until
 * every stored value has been encrypted again.
 */
export function tokenCipher(): Promise<TokenCipher> {
  return createTokenCipher({ keys: { v1: env('CONNECTION_TOKENS_KEY') }, current: 'v1' });
}

/**
 * Where a marketplace sends the seller back: our own connect-callback, as the seller's
 * browser reaches it. Local development sets CONNECT_CALLBACK_URL; an address that is not
 * usable is refused (see settings.ts).
 */
export function connectCallbackUrl(): string {
  return publicCallbackUrl({ configured: optionalEnv('CONNECT_CALLBACK_URL'), supabaseUrl: env('SUPABASE_URL') });
}

/** Where the callback sends the seller back to the app. A setting of the server, never of the request. */
export function appConnectUrl(): string {
  return optionalEnv('APP_CONNECT_URL') ?? 'valan://connect';
}

/** Logs a failure for the people running the server: what kind and what it says, nothing else. */
export function reporter(functionName: string): (error: unknown) => void {
  return (error) => {
    console.error(`${functionName} failed:`, error instanceof Error ? `${error.name}: ${error.message}` : 'unknown error');
  };
}
