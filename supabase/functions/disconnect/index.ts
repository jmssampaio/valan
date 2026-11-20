// Disconnects a marketplace account of the seller who calls it. The rules are in disconnect.ts.

import { createConnectionStore } from '../_shared/connections/store.ts';
import { adminClient, identify, marketplaceFrom, reporter, tokenFrom } from '../_shared/server.ts';
import { disconnect } from './disconnect.ts';

const STATUS = {
  not_signed_in: 401,
  unknown_marketplace: 400,
  failed: 500,
} as const;

Deno.serve(async (request) => {
  if (request.method !== 'POST') return Response.json({ reason: 'failed' }, { status: 405 });

  const admin = adminClient();
  const outcome = await disconnect(
    {
      identify: (token) => identify(admin, token),
      store: createConnectionStore(admin),
      reportFailure: reporter('disconnect'),
    },
    { token: tokenFrom(request), marketplace: await marketplaceFrom(request) },
  );

  return outcome.ok
    ? Response.json({ ok: true })
    : Response.json({ reason: outcome.reason }, { status: STATUS[outcome.reason] });
});
