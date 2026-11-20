import { assertEquals, assertThrows } from '@std/assert';

import { publicCallbackUrl } from './settings.ts';

const PROJECT = 'https://abcdefgh.supabase.co';

Deno.test('callback address: is the connect-callback function of this project', () => {
  assertEquals(
    publicCallbackUrl({ configured: null, supabaseUrl: PROJECT }),
    'https://abcdefgh.supabase.co/functions/v1/connect-callback',
  );
});

Deno.test('callback address: is the configured one when there is one', () => {
  assertEquals(
    publicCallbackUrl({ configured: 'https://api.valan.test/functions/v1/connect-callback', supabaseUrl: PROJECT }),
    'https://api.valan.test/functions/v1/connect-callback',
  );
});

Deno.test('callback address: may be plain http on this machine only, for local development', () => {
  for (const local of ['http://127.0.0.1:54321/functions/v1/connect-callback', 'http://localhost:54321/functions/v1/connect-callback']) {
    // Inside the local stack the project address is one only the containers know.
    assertEquals(publicCallbackUrl({ configured: local, supabaseUrl: 'http://kong:8000' }), local);
  }
});

Deno.test('callback address: refuses an address a browser cannot reach safely', () => {
  const unusable = [
    // The local stack without CONNECT_CALLBACK_URL: the marketplace would be given an address only the containers know.
    { configured: null, supabaseUrl: 'http://kong:8000' },
    // A local value copied into another environment by mistake would send the seller's code over plain http.
    { configured: 'http://valan.test/functions/v1/connect-callback', supabaseUrl: PROJECT },
    { configured: 'http://127.0.0.1.evil.test/functions/v1/connect-callback', supabaseUrl: PROJECT },
    { configured: 'valan://connect', supabaseUrl: PROJECT },
    { configured: 'javascript:alert(1)', supabaseUrl: PROJECT },
    { configured: 'not an address', supabaseUrl: PROJECT },
    { configured: 'https://user:password@valan.test/callback', supabaseUrl: PROJECT },
  ];

  for (const settings of unusable) {
    assertThrows(() => publicCallbackUrl(settings), Error, 'CONNECT_CALLBACK_URL');
  }
});
