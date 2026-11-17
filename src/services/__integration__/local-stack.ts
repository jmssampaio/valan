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
export async function createConfirmedUser(email = uniqueEmail()): Promise<{ id: string; email: string }> {
  const { data, error } = await localAdmin().auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
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
