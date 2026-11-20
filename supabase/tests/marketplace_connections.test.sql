-- Connecting a marketplace account: the attempts in progress (connection_handshakes), which
-- only Edge Functions may touch, and the two columns a connection gained.
begin;
create extension if not exists pgtap with schema extensions;

select plan(23);

create schema tests;
grant usage on schema tests to authenticated, anon;

create function tests.sign_in(user_id uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', user_id, 'role', 'authenticated')::text,
    true
  );
end $$;

create function tests.sign_out() returns void language plpgsql as $$
begin
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
end $$;

create function tests.as_owner() returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
end $$;

-- Alice is ...0a, Bob is ...0b.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'alice-connections@example.test'),
  ('00000000-0000-0000-0000-00000000000b', 'bob-connections@example.test');

-- The server (Edge Functions, with the service role) -----------------------------------------

set local role service_role;

select lives_ok(
  $$ insert into public.connection_handshakes (user_id, marketplace, state_hash, handshake_encrypted, expires_at) values
       ('00000000-0000-0000-0000-00000000000a', 'discogs', repeat('a', 64), 'v1.iv.alice-sealed', now() + interval '10 minutes'),
       ('00000000-0000-0000-0000-00000000000b', 'discogs', repeat('b', 64), 'v1.iv.bob-sealed', now() + interval '10 minutes') $$,
  'the server keeps a connection attempt'
);
select lives_ok(
  $$ insert into public.platform_connections
       (user_id, marketplace, access_token_encrypted, token_secret_encrypted, external_username) values
       ('00000000-0000-0000-0000-00000000000a', 'discogs', 'v1.iv.alice-access', 'v1.iv.alice-secret', 'alice-records'),
       ('00000000-0000-0000-0000-00000000000b', 'discogs', 'v1.iv.bob-access', 'v1.iv.bob-secret', 'bob-records') $$,
  'the server stores a connection with its token secret and the account name'
);
select results_eq(
  $$ select handshake_encrypted from public.connection_handshakes where state_hash = repeat('a', 64) $$,
  array['v1.iv.alice-sealed'],
  'the server finds an attempt by the hash of its state'
);
select throws_ok(
  $$ insert into public.connection_handshakes (user_id, marketplace, state_hash, handshake_encrypted, expires_at)
     values ('00000000-0000-0000-0000-00000000000a', 'discogs', repeat('c', 64), 'v1.iv.sealed', now()) $$,
  '23505', null,
  'a seller has one attempt per marketplace at a time'
);
select throws_ok(
  $$ insert into public.connection_handshakes (user_id, marketplace, state_hash, handshake_encrypted, expires_at)
     values ('00000000-0000-0000-0000-00000000000a', 'ebay', repeat('a', 64), 'v1.iv.sealed', now()) $$,
  '23505', null,
  'two attempts cannot share a state'
);
select throws_ok(
  $$ insert into public.connection_handshakes (user_id, marketplace, state_hash, handshake_encrypted, expires_at)
     values ('00000000-0000-0000-0000-00000000000a', 'ebay', 'the-state-itself', 'v1.iv.sealed', now()) $$,
  '23514', null,
  'what is stored for a state must be a SHA-256 hash, not the state'
);
select throws_ok(
  $$ update public.platform_connections set external_username = '' $$,
  '23514', null,
  'an account name is never empty'
);
select lives_ok(
  $$ delete from public.connection_handshakes where expires_at < now() $$,
  'the server clears attempts that expired'
);

-- A signed-in seller -----------------------------------------------------------------------

reset role;
select tests.sign_in('00000000-0000-0000-0000-00000000000a');

select throws_ok(
  'select id from public.connection_handshakes',
  '42501', null,
  'a user cannot read connection attempts, even their own'
);
select throws_ok(
  'select handshake_encrypted from public.connection_handshakes',
  '42501', null,
  'a user cannot read what an attempt keeps, even their own'
);
select throws_ok(
  $$ insert into public.connection_handshakes (user_id, marketplace, state_hash, handshake_encrypted, expires_at)
     values ('00000000-0000-0000-0000-00000000000a', 'ebay', repeat('d', 64), 'forged', now() + interval '10 minutes') $$,
  '42501', null,
  'a user cannot plant a connection attempt'
);
select throws_ok(
  $$ update public.connection_handshakes set user_id = '00000000-0000-0000-0000-00000000000a' $$,
  '42501', null,
  'a user cannot take over a connection attempt'
);
select throws_ok(
  'delete from public.connection_handshakes',
  '42501', null,
  'a user cannot delete connection attempts'
);
select results_eq(
  'select marketplace::text, status::text, external_username from public.platform_connections',
  $$ values ('discogs', 'connected', 'alice-records') $$,
  'a user reads the account name of their own connection, and of no other'
);
select throws_ok(
  'select token_secret_encrypted from public.platform_connections',
  '42501', null,
  'a user cannot read a token secret, even their own'
);
select throws_ok(
  $$ update public.platform_connections set external_username = 'someone-else' $$,
  '42501', null,
  'a user cannot change the account name from the app'
);

-- Signed out -------------------------------------------------------------------------------

select tests.sign_out();

select throws_ok(
  'select id from public.connection_handshakes',
  '42501', null,
  'a signed-out caller cannot read connection attempts'
);
select throws_ok(
  $$ insert into public.connection_handshakes (user_id, marketplace, state_hash, handshake_encrypted, expires_at)
     values ('00000000-0000-0000-0000-00000000000a', 'ebay', repeat('e', 64), 'forged', now()) $$,
  '42501', null,
  'a signed-out caller cannot plant a connection attempt'
);

-- What the app's roles hold, whatever the policies say ------------------------------------------

select tests.as_owner();

select is_empty(
  $$ select grantee::text, privilege_type::text
     from information_schema.role_table_grants
     where table_schema = 'public' and table_name = 'connection_handshakes'
       and grantee in ('anon', 'authenticated') $$,
  'the app has no privilege on connection attempts'
);
select is_empty(
  $$ select grantee::text, column_name::text
     from information_schema.column_privileges
     where table_schema = 'public' and table_name = 'connection_handshakes'
       and grantee in ('anon', 'authenticated') $$,
  'the app has no privilege on any column of connection attempts'
);
select is_empty(
  $$ select column_name::text
     from information_schema.column_privileges
     where table_schema = 'public' and table_name = 'platform_connections'
       and grantee in ('anon', 'authenticated')
       and column_name like '%encrypted%' $$,
  'the app has no privilege on any encrypted column of a connection'
);
select is_empty(
  $$ select p.polname::text
     from pg_policy p
     where p.polrelid = 'public.connection_handshakes'::regclass and p.polpermissive $$,
  'no policy lets anybody into connection attempts'
);

-- An account that is deleted leaves no attempt behind.
delete from auth.users where id = '00000000-0000-0000-0000-00000000000b';
select is_empty(
  $$ select id from public.connection_handshakes where user_id = '00000000-0000-0000-0000-00000000000b' $$,
  'deleting an account deletes its connection attempts'
);

select * from finish();
rollback;
