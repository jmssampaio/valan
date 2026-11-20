// Where a marketplace sends the seller's browser after they approve or refuse access.
//
// The only function without a session check (verify_jwt = false in config.toml): a browser
// coming from the marketplace carries no Valan session. It answers every request the same
// way, with a redirect to the app, and the rules in connect-callback.ts decide what the
// redirect says. Nothing of the request is ever copied into it.

import { createConnectionStore } from '../_shared/connections/store.ts';
import { adminClient, appConnectUrl, connectorFor, reporter, tokenCipher } from '../_shared/server.ts';
import { appReturnUrl, callbackRedirect } from './connect-callback.ts';

const report = reporter('connect-callback');

async function wayBack(request: Request): Promise<string> {
  const appUrl = appConnectUrl();
  try {
    return await callbackRedirect(
      {
        connector: connectorFor,
        store: createConnectionStore(adminClient()),
        cipher: tokenCipher,
        reportFailure: report,
      },
      request.url,
      appUrl,
    );
  } catch (error) {
    // A setting is missing, or the address could not be read: the seller still gets back to the app.
    report(error);
    return appReturnUrl(appUrl, { result: 'failed', marketplace: null });
  }
}

Deno.serve(async (request) => {
  if (request.method !== 'GET') return new Response(null, { status: 405 });

  return new Response(null, {
    status: 302,
    headers: {
      Location: await wayBack(request),
      // The address of this request carries a one-time code: nothing should keep or forward it.
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
    },
  });
});
