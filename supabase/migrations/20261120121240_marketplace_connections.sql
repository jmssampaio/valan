-- Connecting a marketplace account.
--
-- A connection is made in two steps: the seller is sent to the marketplace to approve
-- access, and the marketplace sends them back to the connect-callback Edge Function. What
-- has to be remembered in between is kept in connection_handshakes, which only Edge
-- Functions (service role) may touch: the app cannot read, write or even see it.

-- Connections --------------------------------------------------------------------------------

alter table public.platform_connections
  -- OAuth 1.0a (Discogs) signs every request with a secret that comes with the token.
  -- Ciphertext only, like the other two; encrypted and decrypted inside Edge Functions.
  add column token_secret_encrypted text,
  -- The seller's name on the marketplace, so the app can say which account is connected.
  add column external_username text
    constraint external_username_is_a_name check (char_length(external_username) between 1 and 200);

-- The name is the seller's to read; the token secret, like the tokens, is not.
grant select (external_username) on public.platform_connections to authenticated;

-- Connection attempts -------------------------------------------------------------------------

create table public.connection_handshakes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  marketplace public.marketplace not null,
  -- The state goes to the marketplace and comes back with the seller. Whoever holds it can
  -- finish the attempt, so only its SHA-256 hash is stored.
  state_hash text not null unique
    constraint state_hash_is_a_sha256 check (state_hash ~ '^[0-9a-f]{64}$'),
  -- What the connector asked to keep (for Discogs, the request token and its secret).
  -- It is a credential: ciphertext only, encrypted and decrypted inside Edge Functions.
  handshake_encrypted text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  -- Starting again replaces the attempt that was pending.
  unique (user_id, marketplace)
);

-- Expired attempts are cleared by this column.
create index connection_handshakes_expires_at on public.connection_handshakes (expires_at);

revoke all on public.connection_handshakes from anon, authenticated;
grant select, insert, update, delete on public.connection_handshakes to service_role;

alter table public.connection_handshakes enable row level security;

-- Said out loud, on top of the missing privileges: a restrictive policy that is never true
-- keeps the app out even if a permissive policy or a grant is added by mistake later.
create policy "The app never touches connection attempts" on public.connection_handshakes
  as restrictive for all to anon, authenticated
  using (false) with check (false);
