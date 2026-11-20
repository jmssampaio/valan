// Settings of the connection functions that are worth checking before they are used.

const LOOPBACK = new Set(['127.0.0.1', 'localhost']);

/**
 * Where a marketplace sends the seller's browser back: our own connect-callback function.
 * The address carries a one-time code, so it must be https, or plain http on this machine
 * for local development. Inside the local stack the project address is one only the
 * containers know, which is why CONNECT_CALLBACK_URL exists and why a bad one is refused
 * here instead of being handed to a marketplace.
 */
export function publicCallbackUrl(settings: { configured: string | null; supabaseUrl: string }): string {
  const address = settings.configured ?? `${settings.supabaseUrl}/functions/v1/connect-callback`;

  let url: URL | null;
  try {
    url = new URL(address);
  } catch {
    url = null;
  }
  const secure = url?.protocol === 'https:';
  const local = url?.protocol === 'http:' && LOOPBACK.has(url.hostname);
  if (url === null || !(secure || local) || url.username !== '' || url.password !== '') {
    throw new Error(
      'CONNECT_CALLBACK_URL must be the https address of connect-callback (http only on 127.0.0.1 or localhost).',
    );
  }
  return address;
}
