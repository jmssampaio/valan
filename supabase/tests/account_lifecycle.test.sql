begin;
create extension if not exists pgtap with schema extensions;

select plan(3);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'alice@example.test'),
  ('00000000-0000-0000-0000-00000000000b', 'bob@example.test');

select results_eq(
  $$ select language, currency from public.profiles where id = '00000000-0000-0000-0000-00000000000a' $$,
  $$ values ('en', 'EUR') $$,
  'signing up creates a profile with the fallback language and currency'
);

insert into public.platform_connections (user_id, marketplace)
select id, 'ebay' from auth.users;

insert into public.items (id, user_id, type, title) values
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', 'record', 'Alice record'),
  ('10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b', 'record', 'Bob record');

insert into public.item_photos (user_id, item_id, storage_path, position)
select user_id, id, 'front.jpg', 0 from public.items;

insert into public.listings (id, user_id, item_id, marketplace) values
  ('50000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'ebay'),
  ('50000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-00000000000b', 'ebay');

insert into public.offers (user_id, listing_id, external_id, amount_minor, currency)
select user_id, id, 'offer', 1800, 'EUR' from public.listings;

insert into public.sales (user_id, listing_id, marketplace, item_title, external_order_id, price_minor, currency, sold_at)
select user_id, id, marketplace, 'Record', 'order', 2000, 'EUR', now() from public.listings;

insert into public.push_tokens (user_id, token)
select id, 'device' from auth.users;

delete from auth.users where id = '00000000-0000-0000-0000-00000000000a';

create function pg_temp.rows_owned_by(owner uuid) returns bigint language sql as $$
  select
    (select count(*) from public.profiles where id = owner)
    + (select count(*) from public.platform_connections where user_id = owner)
    + (select count(*) from public.items where user_id = owner)
    + (select count(*) from public.item_photos where user_id = owner)
    + (select count(*) from public.listings where user_id = owner)
    + (select count(*) from public.offers where user_id = owner)
    + (select count(*) from public.sales where user_id = owner)
    + (select count(*) from public.push_tokens where user_id = owner)
$$;

select is(
  pg_temp.rows_owned_by('00000000-0000-0000-0000-00000000000a'),
  0::bigint,
  'deleting an account deletes its rows in every table'
);
select is(
  pg_temp.rows_owned_by('00000000-0000-0000-0000-00000000000b'),
  8::bigint,
  'deleting an account leaves other users'' rows untouched'
);

select * from finish();
rollback;
