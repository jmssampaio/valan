-- A sale is a permanent record: it outlives the listing and the item it came from.
begin;
create extension if not exists pgtap with schema extensions;

select plan(9);

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

-- Alice is ...0a, Bob is ...0b.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'alice@example.test'),
  ('00000000-0000-0000-0000-00000000000b', 'bob@example.test');

insert into public.items (id, user_id, type, title, artist, status) values
  ('10000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000000a', 'record', 'Noites de Lisboa', 'Os Marés', 'sold'),
  ('10000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-00000000000a', 'record', 'Verde Mar', 'Quarteto Atlântico', 'sold'),
  ('10000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000000b', 'record', 'Bob record', null, 'sold');

insert into public.listings (id, user_id, item_id, marketplace, status) values
  ('50000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-0000000000a1', 'ebay', 'published'),
  ('50000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-0000000000a2', 'discogs', 'published'),
  ('50000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-0000000000b1', 'ebay', 'published');

insert into public.sales
  (id, user_id, listing_id, marketplace, item_title, item_artist, external_order_id, price_minor, fees_minor, currency, sold_at)
values
  ('70000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000000a', '50000000-0000-0000-0000-0000000000a1', 'ebay', 'Noites de Lisboa', 'Os Marés', 'order-1', 2000, 252, 'EUR', now()),
  ('70000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-00000000000a', '50000000-0000-0000-0000-0000000000a2', 'discogs', 'Verde Mar', 'Quarteto Atlântico', 'order-2', 1500, 120, 'EUR', now()),
  ('70000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000000b', '50000000-0000-0000-0000-0000000000b1', 'ebay', 'Bob record', null, 'order-1', 900, 90, 'EUR', now());

delete from public.listings where id = '50000000-0000-0000-0000-0000000000a1';
select is(
  (select listing_id is null from public.sales where id = '70000000-0000-0000-0000-0000000000a1'),
  true,
  'a sale survives the deletion of its listing'
);

delete from public.items where id = '10000000-0000-0000-0000-0000000000a2';
select is(
  (select listing_id is null from public.sales where id = '70000000-0000-0000-0000-0000000000a2'),
  true,
  'a sale survives the deletion of its item'
);

select results_eq(
  $$ select item_title, item_artist, marketplace::text, price_minor, fees_minor, currency
     from public.sales where id = '70000000-0000-0000-0000-0000000000a2' $$,
  $$ values ('Verde Mar', 'Quarteto Atlântico', 'discogs', 1500, 120, 'EUR') $$,
  'a surviving sale keeps its title, artist, marketplace, price and fees'
);

select throws_ok(
  $$ insert into public.sales
       (user_id, marketplace, item_title, external_order_id, price_minor, currency, sold_at)
     values ('00000000-0000-0000-0000-00000000000a', 'ebay', 'Noites de Lisboa', 'order-1', 2000, 'EUR', now()) $$,
  '23505', null,
  'the same marketplace order is recorded once per user, even after its listing is gone'
);
select lives_ok(
  $$ insert into public.sales
       (id, user_id, marketplace, item_title, external_order_id, price_minor, currency, sold_at)
     values ('70000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-00000000000a', 'discogs', 'Noites de Lisboa', 'order-1', 2000, 'EUR', now()) $$,
  'the same order id on another marketplace is a different sale'
);

select tests.sign_in('00000000-0000-0000-0000-00000000000a');

select results_eq(
  'select id from public.sales order by id',
  array[
    '70000000-0000-0000-0000-0000000000a1'::uuid,
    '70000000-0000-0000-0000-0000000000a2'::uuid,
    '70000000-0000-0000-0000-0000000000a3'::uuid
  ],
  'the owner still reads sales whose listing is gone, and only their own'
);
select throws_ok(
  $$ delete from public.sales $$,
  '42501', null,
  'a user cannot delete a sale from the app'
);

reset role;

delete from auth.users where id = '00000000-0000-0000-0000-00000000000a';
select is_empty(
  $$ select 1 from public.sales where user_id = '00000000-0000-0000-0000-00000000000a' $$,
  'deleting the account deletes its sales, with or without a listing'
);
select isnt_empty(
  $$ select 1 from public.sales where user_id = '00000000-0000-0000-0000-00000000000b' $$,
  'deleting an account leaves other users'' sales untouched'
);

select * from finish();
rollback;
