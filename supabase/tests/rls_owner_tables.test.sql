-- Tables the app writes directly: profiles, items, item_photos, push_tokens.
begin;
create extension if not exists pgtap with schema extensions;

select plan(27);

-- Test helpers live only inside this transaction.
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

insert into public.items (id, user_id, type, title) values
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', 'record', 'Alice record'),
  ('10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b', 'record', 'Bob record');

insert into public.item_photos (id, user_id, item_id, storage_path, position) values
  ('20000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'alice/front.jpg', 0),
  ('20000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-00000000000b', 'bob/front.jpg', 0);

insert into public.push_tokens (id, user_id, token) values
  ('30000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', 'alice-device'),
  ('30000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b', 'bob-device');

select tests.sign_in('00000000-0000-0000-0000-00000000000a');

-- profiles
select results_eq(
  'select id from public.profiles',
  array['00000000-0000-0000-0000-00000000000a'::uuid],
  'a user reads only their own profile'
);
select lives_ok(
  $$ update public.profiles set language = 'pt-PT', currency = 'EUR' $$,
  'a user updates their own language and currency'
);
select throws_ok(
  $$ update public.profiles set id = '00000000-0000-0000-0000-00000000000c' $$,
  '42501', null,
  'a user cannot change profile columns other than language and currency'
);
select throws_ok(
  $$ insert into public.profiles (id) values ('00000000-0000-0000-0000-00000000000c') $$,
  '42501', null,
  'a user cannot insert a profile'
);
select throws_ok(
  $$ delete from public.profiles $$,
  '42501', null,
  'a user cannot delete a profile directly'
);
update public.profiles set language = 'es' where id = '00000000-0000-0000-0000-00000000000b';

-- items
select results_eq(
  'select id from public.items',
  array['10000000-0000-0000-0000-00000000000a'::uuid],
  'a user reads only their own items'
);
select lives_ok(
  $$ insert into public.items (user_id, type, title)
     values ('00000000-0000-0000-0000-00000000000a', 'equipment', 'Alice turntable') $$,
  'a user inserts their own item'
);
select throws_ok(
  $$ insert into public.items (user_id, type, title)
     values ('00000000-0000-0000-0000-00000000000b', 'record', 'Planted on Bob') $$,
  '42501', null,
  'a user cannot insert an item owned by another user'
);
select throws_ok(
  $$ update public.items set user_id = '00000000-0000-0000-0000-00000000000b'
     where id = '10000000-0000-0000-0000-00000000000a' $$,
  '42501', null,
  'a user cannot hand their item to another user'
);
update public.items set title = 'Hijacked' where id = '10000000-0000-0000-0000-00000000000b';
delete from public.items where id = '10000000-0000-0000-0000-00000000000b';

-- item_photos
select results_eq(
  'select id from public.item_photos',
  array['20000000-0000-0000-0000-00000000000a'::uuid],
  'a user reads only their own photos'
);
select throws_ok(
  $$ insert into public.item_photos (user_id, item_id, storage_path, position)
     values ('00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000b', 'alice/planted.jpg', 1) $$,
  '23503', null,
  'a user cannot attach a photo to another user''s item'
);
select throws_ok(
  $$ insert into public.item_photos (user_id, item_id, storage_path, position)
     values ('00000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-00000000000b', 'bob/planted.jpg', 1) $$,
  '42501', null,
  'a user cannot insert a photo owned by another user'
);
update public.item_photos set storage_path = 'hijacked.jpg' where id = '20000000-0000-0000-0000-00000000000b';
delete from public.item_photos where id = '20000000-0000-0000-0000-00000000000b';

-- push_tokens
select results_eq(
  'select id from public.push_tokens',
  array['30000000-0000-0000-0000-00000000000a'::uuid],
  'a user reads only their own push tokens'
);
select throws_ok(
  $$ insert into public.push_tokens (user_id, token)
     values ('00000000-0000-0000-0000-00000000000b', 'alice-device-as-bob') $$,
  '42501', null,
  'a user cannot register a push token for another user'
);
delete from public.push_tokens where id = '30000000-0000-0000-0000-00000000000b';

-- Writes against Bob's rows are silently filtered by RLS, so check his rows as the owner of the database.
reset role;

select is(
  (select language from public.profiles where id = '00000000-0000-0000-0000-00000000000b'),
  'en',
  'a user cannot update another user''s profile'
);
select is(
  (select title from public.items where id = '10000000-0000-0000-0000-00000000000b'),
  'Bob record',
  'a user cannot update or delete another user''s item'
);
select is(
  (select storage_path from public.item_photos where id = '20000000-0000-0000-0000-00000000000b'),
  'bob/front.jpg',
  'a user cannot update or delete another user''s photo'
);
select is(
  (select token from public.push_tokens where id = '30000000-0000-0000-0000-00000000000b'),
  'bob-device',
  'a user cannot delete another user''s push token'
);
select is(
  (select language from public.profiles where id = '00000000-0000-0000-0000-00000000000a'),
  'pt-PT',
  'the user''s own profile update was saved'
);

-- Data rules that hold for every caller, including the server.
select throws_ok(
  $$ insert into public.items (user_id, type, title, discogs_release_id)
     values ('00000000-0000-0000-0000-00000000000a', 'equipment', 'Amplifier', 249504) $$,
  '23514', null,
  'equipment cannot carry a Discogs release'
);
select throws_ok(
  $$ insert into public.items (user_id, type, title, price_minor)
     values ('00000000-0000-0000-0000-00000000000a', 'record', 'Negative', -1) $$,
  '23514', null,
  'an item price cannot be negative'
);
select throws_ok(
  $$ update public.profiles set language = 'fr' where id = '00000000-0000-0000-0000-00000000000a' $$,
  '23514', null,
  'a profile language must be one the app supports'
);
select throws_ok(
  $$ insert into public.push_tokens (user_id, token)
     values ('00000000-0000-0000-0000-00000000000a', 'alice-device') $$,
  '23505', null,
  'the same device token is stored once per user'
);

-- Signed out
select tests.sign_out();

select throws_ok('select * from public.profiles', '42501', null, 'a signed-out caller cannot read profiles');
select throws_ok('select * from public.items', '42501', null, 'a signed-out caller cannot read items');
select throws_ok('select * from public.item_photos', '42501', null, 'a signed-out caller cannot read photos');
select throws_ok('select * from public.push_tokens', '42501', null, 'a signed-out caller cannot read push tokens');

select * from finish();
rollback;
