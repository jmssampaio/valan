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
  process.env.LOCAL_MAILBOX_URL = status.MAILPIT_URL ?? status.INBUCKET_URL ?? '';
};
