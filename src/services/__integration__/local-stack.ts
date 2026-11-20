import { createClient } from '@supabase/supabase-js';

import { getSupabaseConfig } from '../config';

const LOCAL_API = /^http:\/\/(127\.0\.0\.1|localhost):\d+$/;

/**
 * An admin client for the LOCAL stack only, used to set the scene for a test (a confirmed
 * user, a row owned by someone else). The app itself never has this key.
 */
function localAdmin() {
  const { url } = getSupabaseConfig();
  const serviceRoleKey = process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY;
  if (!LOCAL_API.test(url) || !serviceRoleKey) {
    throw new Error('Integration tests may only run against the local Supabase stack.');
  }
  return createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

export const PASSWORD = 'uma frase longa para testes';

let counter = 0;

/** An address no other test, or earlier run, has used. */
export function uniqueEmail(): string {
  counter += 1;
  return `seller-${Date.now()}-${counter}-${Math.floor(Math.random() * 1e6)}@example.test`;
}

/** A user who has already confirmed their email. */
export async function createConfirmedUser(
  email = uniqueEmail(),
  language?: string,
): Promise<{ id: string; email: string }> {
  const { data, error } = await localAdmin().auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    // What sign-up stores, and what the emails read to pick their language.
    user_metadata: language ? { language } : undefined,
  });
  if (error) throw error;
  return { id: data.user.id, email };
}

/** A user who signed up and has not confirmed, with the code their email carries. */
export async function createUnconfirmedUser(email = uniqueEmail()): Promise<{ email: string; code: string }> {
  const { data, error } = await localAdmin().auth.admin.generateLink({
    type: 'signup',
    email,
    password: PASSWORD,
  });
  if (error) throw error;
  return { email, code: data.properties.email_otp };
}

type MailboxMessage = { Subject: string; Text: string; HTML: string };

/** The newest email the local stack "sent" to an address. Nothing leaves the machine. */
export async function latestEmailTo(address: string): Promise<MailboxMessage> {
  const mailbox = process.env.LOCAL_MAILBOX_URL;
  if (!mailbox || !LOCAL_API.test(mailbox)) {
    throw new Error('The local mailbox is not available.');
  }

  // The email is sent just after the sign-up request answers, and the mail service is slow
  // in the first seconds after the stack starts (as in CI), so this waits up to 15 seconds.
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const search = await fetch(`${mailbox}/api/v1/search?query=${encodeURIComponent(`to:${address}`)}`);
    const { messages } = (await search.json()) as { messages: { ID: string }[] };
    if (messages.length > 0) {
      const message = await fetch(`${mailbox}/api/v1/message/${messages[0].ID}`);
      return (await message.json()) as MailboxMessage;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`No email arrived for ${address}.`);
}

/**
 * A listing, written as the server would: the app itself may not create one, so a test
 * that needs an item with listings has to set them up this way.
 */
export async function createListingAsServer(listing: {
  itemId: string;
  userId: string;
  marketplace: 'discogs' | 'ebay';
  status: 'pending' | 'published' | 'error' | 'paused' | 'removed';
}): Promise<void> {
  const { error } = await localAdmin().from('listings').insert({
    item_id: listing.itemId,
    user_id: listing.userId,
    marketplace: listing.marketplace,
    status: listing.status,
  });
  if (error) throw error;
}

/** The names of the photo files stored for an item, as the server sees them, sorted. */
export async function listPhotoFilesAsServer(userId: string, itemId: string): Promise<string[]> {
  const { data, error } = await localAdmin().storage.from('item-photos').list(`${userId}/${itemId}`);
  if (error) throw error;
  return data.map(({ name }) => name).sort();
}

/** The code a recovery email would carry for this address, without sending one. */
export async function recoveryCodeFor(email: string): Promise<string> {
  const { data, error } = await localAdmin().auth.admin.generateLink({ type: 'recovery', email });
  if (error) throw error;
  return data.properties.email_otp;
}

/** Waits for an email to an address whose text has the given words: several may arrive. */
export async function emailTo(address: string, containing: string): Promise<MailboxMessage> {
  const mailbox = process.env.LOCAL_MAILBOX_URL;
  if (!mailbox || !LOCAL_API.test(mailbox)) {
    throw new Error('The local mailbox is not available.');
  }

  for (let attempt = 0; attempt < 60; attempt += 1) {
    const search = await fetch(`${mailbox}/api/v1/search?query=${encodeURIComponent(`to:${address}`)}`);
    const { messages } = (await search.json()) as { messages: { ID: string }[] };
    for (const { ID } of messages) {
      const message = (await (await fetch(`${mailbox}/api/v1/message/${ID}`)).json()) as MailboxMessage;
      if (message.Text.includes(containing)) return message;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`No email with "${containing}" arrived for ${address}.`);
}

/** Whether an account still exists, as the server sees it. */
export async function accountExistsAsServer(userId: string): Promise<boolean> {
  const { data, error } = await localAdmin().auth.admin.getUserById(userId);
  if (error) return false;
  return data.user !== null;
}

/** The client the Edge Functions use, for a test of the code they run on the real tables. */
export function serverClient() {
  return localAdmin();
}

type Marketplace = 'discogs' | 'ebay';

/** A connected marketplace account, written as the server would: the app may not create one. */
export async function createConnectionAsServer(connection: {
  userId: string;
  marketplace: Marketplace;
  accountName: string;
}): Promise<void> {
  const { error } = await localAdmin().from('platform_connections').insert({
    user_id: connection.userId,
    marketplace: connection.marketplace,
    access_token_encrypted: 'v1.iv.sealed-access-token',
    token_secret_encrypted: 'v1.iv.sealed-token-secret',
    external_username: connection.accountName,
  });
  if (error) throw error;
}

/** The marketplaces a seller is connected to, as the server sees them, sorted. */
export async function listConnectedMarketplacesAsServer(userId: string): Promise<string[]> {
  const { data, error } = await localAdmin().from('platform_connections').select('marketplace').eq('user_id', userId);
  if (error) throw error;
  return data.map(({ marketplace }) => marketplace as string).sort();
}

/** How many connection attempts a seller has pending, as the server sees them. */
export async function countHandshakesAsServer(userId: string): Promise<number> {
  const { count, error } = await localAdmin()
    .from('connection_handshakes')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  if (error) throw error;
  return count ?? 0;
}

/** Deletes an account as the server would, leaving any token it was given still signed. */
export async function deleteUserAsServer(userId: string): Promise<void> {
  const { error } = await localAdmin().auth.admin.deleteUser(userId);
  if (error) throw error;
}

/**
 * A token the local gateway lets through (this stack signed it) that belongs to no seller,
 * so a test can reach a function's own check of who is calling.
 */
export function signedTokenOfNobody(): string {
  const token = process.env.LOCAL_SUPABASE_ANON_JWT;
  if (!token) throw new Error('The local stack did not give its anonymous token.');
  return token;
}
