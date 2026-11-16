-- Tables only Edge Functions write: platform_connections, listings, offers, sales.
-- The owner may read them (never the marketplace tokens); nobody writes them from the app.
begin;
create extension if not exists pgtap with schema extensions;

select plan(28);

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

-- Alice is ...0a, Bob is ...0b.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'alice@example.test'),
  ('00000000-0000-0000-0000-00000000000b', 'bob@example.test');

insert into public.platform_connections (id, user_id, marketplace, access_token_encrypted, refresh_token_encrypted) values
  ('40000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', 'ebay', 'alice-access', 'alice-refresh'),
  ('40000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b', 'ebay', 'bob-access', 'bob-refresh');

insert into public.items (id, user_id, type, title) values
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', 'record', 'Alice record'),
  ('10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b', 'record', 'Bob record');

insert into public.listings (id, user_id, item_id, marketplace, status) values
  ('50000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'ebay', 'published'),
  ('50000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-00000000000b', 'ebay', 'published');

insert into public.offers (id, user_id, listing_id, external_id, amount_minor, currency) values
  ('60000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', '50000000-0000-0000-0000-00000000000a', 'offer-a', 1800, 'EUR'),
  ('60000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b', '50000000-0000-0000-0000-00000000000b', 'offer-b', 1800, 'EUR');

insert into public.sales (id, user_id, listing_id, external_order_id, price_minor, currency, sold_at) values
  ('70000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', '50000000-0000-0000-0000-00000000000a', 'order-a', 2000, 'EUR', now()),
  ('70000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b', '50000000-0000-0000-0000-00000000000b', 'order-b', 2000, 'EUR', now());

-- Ownership must stay consistent down the chain, even for the server.
select throws_ok(
  $$ insert into public.listings (user_id, item_id, marketplace)
     values ('00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000b', 'discogs') $$,
  '23503', null,
  'a listing cannot belong to a different user than its item'
);
select throws_ok(
  $$ insert into public.offers (user_id, listing_id, external_id, amount_minor, currency)
     values ('00000000-0000-0000-0000-00000000000a', '50000000-0000-0000-0000-00000000000b', 'offer-x', 100, 'EUR') $$,
  '23503', null,
  'an offer cannot belong to a different user than its listing'
);
select throws_ok(
  $$ insert into public.sales (user_id, listing_id, external_order_id, price_minor, currency, sold_at)
     values ('00000000-0000-0000-0000-00000000000a', '50000000-0000-0000-0000-00000000000b', 'order-x', 100, 'EUR', now()) $$,
  '23503', null,
  'a sale cannot belong to a different user than its listing'
);

-- Polling a marketplace twice must not record the same thing twice.
select throws_ok(
  $$ insert into public.platform_connections (user_id, marketplace)
     values ('00000000-0000-0000-0000-00000000000a', 'ebay') $$,
  '23505', null,
  'a user has one connection per marketplace'
);
select throws_ok(
  $$ insert into public.listings (user_id, item_id, marketplace)
     values ('00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'ebay') $$,
  '23505', null,
  'an item has one listing per marketplace'
);
select throws_ok(
  $$ insert into public.offers (user_id, listing_id, external_id, amount_minor, currency)
     values ('00000000-0000-0000-0000-00000000000a', '50000000-0000-0000-0000-00000000000a', 'offer-a', 1800, 'EUR') $$,
  '23505', null,
  'the same marketplace offer is recorded once'
);
select throws_ok(
  $$ insert into public.sales (user_id, listing_id, external_order_id, price_minor, currency, sold_at)
     values ('00000000-0000-0000-0000-00000000000a', '50000000-0000-0000-0000-00000000000a', 'order-a', 2000, 'EUR', now()) $$,
  '23505', null,
  'the same marketplace order is recorded once'
);

select tests.sign_in('00000000-0000-0000-0000-00000000000a');

-- platform_connections
select results_eq(
  'select id, marketplace::text, status::text from public.platform_connections',
  $$ values ('40000000-0000-0000-0000-00000000000a'::uuid, 'ebay', 'connected') $$,
  'a user reads only their own connections'
);
select throws_ok(
  'select access_token_encrypted from public.platform_connections',
  '42501', null,
  'a user cannot read an access token, even their own'
);
select throws_ok(
  'select refresh_token_encrypted from public.platform_connections',
  '42501', null,
  'a user cannot read a refresh token, even their own'
);
select throws_ok(
  $$ insert into public.platform_connections (user_id, marketplace)
     values ('00000000-0000-0000-0000-00000000000a', 'discogs') $$,
  '42501', null,
  'a user cannot create a connection from the app'
);
select throws_ok(
  $$ update public.platform_connections set status = 'connected' $$,
  '42501', null,
  'a user cannot update a connection from the app'
);
select throws_ok(
  $$ delete from public.platform_connections $$,
  '42501', null,
  'a user cannot delete a connection from the app'
);

-- listings
select results_eq(
  'select id from public.listings',
  array['50000000-0000-0000-0000-00000000000a'::uuid],
  'a user reads only their own listings'
);
select throws_ok(
  $$ insert into public.listings (user_id, item_id, marketplace, status)
     values ('00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'discogs', 'published') $$,
  '42501', null,
  'a user cannot create a listing from the app'
);
select throws_ok(
  $$ update public.listings set status = 'published' $$,
  '42501', null,
  'a user cannot mark a listing as published from the app'
);
select throws_ok($$ delete from public.listings $$, '42501', null, 'a user cannot delete a listing from the app');

-- offers
select results_eq(
  'select id from public.offers',
  array['60000000-0000-0000-0000-00000000000a'::uuid],
  'a user reads only their own offers'
);
select throws_ok(
  $$ insert into public.offers (user_id, listing_id, external_id, amount_minor, currency)
     values ('00000000-0000-0000-0000-00000000000a', '50000000-0000-0000-0000-00000000000a', 'forged', 1, 'EUR') $$,
  '42501', null,
  'a user cannot create an offer from the app'
);
select throws_ok($$ update public.offers set status = 'accepted' $$, '42501', null, 'a user cannot accept an offer by writing to the table');
select throws_ok($$ delete from public.offers $$, '42501', null, 'a user cannot delete an offer from the app');

-- sales
select results_eq(
  'select id from public.sales',
  array['70000000-0000-0000-0000-00000000000a'::uuid],
  'a user reads only their own sales'
);
select throws_ok(
  $$ insert into public.sales (user_id, listing_id, external_order_id, price_minor, currency, sold_at)
     values ('00000000-0000-0000-0000-00000000000a', '50000000-0000-0000-0000-00000000000a', 'forged', 1, 'EUR', now()) $$,
  '42501', null,
  'a user cannot record a sale from the app'
);
select throws_ok($$ update public.sales set price_minor = 1 $$, '42501', null, 'a user cannot change a sale from the app');

-- Signed out
select tests.sign_out();

select throws_ok('select id from public.platform_connections', '42501', null, 'a signed-out caller cannot read connections');
select throws_ok('select * from public.listings', '42501', null, 'a signed-out caller cannot read listings');
select throws_ok('select * from public.offers', '42501', null, 'a signed-out caller cannot read offers');
select throws_ok('select * from public.sales', '42501', null, 'a signed-out caller cannot read sales');

select * from finish();
rollback;
