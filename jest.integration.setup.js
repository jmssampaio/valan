const { execSync } = require('node:child_process');

const LOCAL_API = /^http:\/\/(127\.0\.0\.1|localhost):\d+$/;

/**
 * Points the tests at the local Supabase stack and nothing else. The keys are read from the
 * running stack each time and live only in this process: they are never written to a file,
 * and a URL that is not local stops the run before any test starts.
 */
module.exports = async () => {
  let output;
  try {
    output = execSync('npx supabase status -o env', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    throw new Error('The local Supabase stack is not running. Start it with: npx supabase start');
  }

  const status = Object.fromEntries(
    output
      .split('\n')
      .filter((line) => line.includes('='))
      .map((line) => {
        const separator = line.indexOf('=');
        return [line.slice(0, separator), line.slice(separator + 1).replace(/^"|"$/g, '')];
      }),
  );

  const { API_URL: url, SERVICE_ROLE_KEY: serviceRoleKey } = status;
  const publishableKey = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
  if (!url || !serviceRoleKey || !publishableKey) {
    throw new Error('The local Supabase stack is not fully up (auth and API). Run: npx supabase start');
  }
  if (!LOCAL_API.test(url)) {
    throw new Error(`Refusing to run integration tests against ${url}: only the local stack is allowed.`);
  }

  process.env.EXPO_PUBLIC_SUPABASE_URL = url;
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = publishableKey;
  process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY = serviceRoleKey;
  // Where the local stack keeps the emails it would have sent.
  const mailbox = status.MAILPIT_URL ?? status.INBUCKET_URL ?? '';
  process.env.LOCAL_MAILBOX_URL = mailbox;

  await waitForOurEmailTemplate({ url, publishableKey, mailbox });
  await waitForOurRecoveryTemplate({ url, publishableKey, serviceRoleKey, mailbox });
};

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Just after it starts, the local auth server sends its built-in emails; ours are served
 * only once it has loaded them. This signs throwaway addresses up until an email arrives
 * with our subject, so no test depends on how long ago the stack started.
 */
async function waitForOurEmailTemplate({ url, publishableKey, mailbox }) {
  if (!mailbox) return;

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const address = `warm-up-${Date.now()}-${attempt}@example.test`;
    await fetch(`${url}/auth/v1/signup`, {
      method: 'POST',
      headers: { apikey: publishableKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: address, password: 'uma frase longa para aquecer' }),
    });

    for (let look = 0; look < 20; look += 1) {
      const search = await fetch(`${mailbox}/api/v1/search?query=${encodeURIComponent(`to:${address}`)}`);
      const { messages } = await search.json();
      if (messages.length > 0) {
        if (messages[0].Subject.startsWith('Valan')) return;
        break;
      }
      await pause(250);
    }
    await pause(500);
  }
  throw new Error('The local auth server never sent the Valan confirmation email.');
}

/**
 * The same wait for the password emails: a confirmed throwaway account asks to reset its
 * password until the email that arrives is ours.
 */
async function waitForOurRecoveryTemplate({ url, publishableKey, serviceRoleKey, mailbox }) {
  if (!mailbox) return;

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const address = `warm-up-recovery-${Date.now()}-${attempt}@example.test`;
    await fetch(`${url}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: address, password: 'uma frase longa para aquecer', email_confirm: true }),
    });
    await fetch(`${url}/auth/v1/recover`, {
      method: 'POST',
      headers: { apikey: publishableKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: address }),
    });

    for (let look = 0; look < 20; look += 1) {
      const search = await fetch(`${mailbox}/api/v1/search?query=${encodeURIComponent(`to:${address}`)}`);
      const { messages } = await search.json();
      if (messages.length > 0) {
        if (messages[0].Subject.startsWith('Valan')) return;
        break;
      }
      await pause(250);
    }
    await pause(500);
  }
  throw new Error('The local auth server never sent the Valan password email.');
}
