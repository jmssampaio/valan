// Starts connecting a marketplace account for the seller who calls it, and answers with the
// address where they approve the access. The rules are in connect-start.ts.

import { createConnectionStore } from '../_shared/connections/store.ts';
import {
  adminClient,
  connectCallbackUrl,
  connectorFor,
  identify,
  marketplaceFrom,
  reporter,
  tokenCipher,
  tokenFrom,
} from '../_shared/server.ts';
import { startConnection } from './connect-start.ts';

const STATUS = {
  not_signed_in: 401,
  unknown_marketplace: 400,
  unavailable: 503,
  failed: 500,
} as const;

Deno.serve(async (request) => {
  if (request.method !== 'POST') return Response.json({ reason: 'failed' }, { status: 405 });

  const admin = adminClient();
  const outcome = await startConnection(
    {
      identify: (token) => identify(admin, token),
      connector: connectorFor,
      store: createConnectionStore(admin),
      cipher: tokenCipher,
      callbackUrl: connectCallbackUrl,
      reportFailure: reporter('connect-start'),
    },
    { token: tokenFrom(request), marketplace: await marketplaceFrom(request) },
  );

  return outcome.ok
    ? Response.json({ authorizationUrl: outcome.authorizationUrl })
    : Response.json({ reason: outcome.reason }, { status: STATUS[outcome.reason] });
});
