-- The app may delete an item only while it is a draft, and may never set an item's status.
-- Publishing, selling and removing go through Edge Functions (service role).
begin;
create extension if not exists pgtap with schema extensions;

select plan(12);

create schema tests;
grant usage on schema tests to authenticated, anon, service_role;

create function tests.sign_in(user_id uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', user_id, 'role', 'authenticated')::text,
    true
  );
end $$;

create function tests.act_as_server() returns void language plpgsql as $$
begin
  perform set_config('role', 'service_role', true);
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
end $$;

-- Alice is ...0a.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'alice@example.test');

insert into public.items (id, user_id, type, title, status) values
  ('10000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-00000000000a', 'record', 'Draft to delete', 'draft'),
  ('10000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-00000000000a', 'record', 'Draft to keep', 'draft'),
  ('10000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000000a', 'record', 'Active', 'active'),
  ('10000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000000a', 'record', 'Sold', 'sold'),
  ('10000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000000a', 'record', 'Removed', 'removed');

select tests.sign_in('00000000-0000-0000-0000-00000000000a');

-- Deleting
delete from public.items where id = '10000000-0000-0000-0000-0000000000d1';
select is_empty(
  $$ select 1 from public.items where id = '10000000-0000-0000-0000-0000000000d1' $$,
  'a user deletes their own draft item'
);

delete from public.items where id = '10000000-0000-0000-0000-0000000000a1';
select isnt_empty(
  $$ select 1 from public.items where id = '10000000-0000-0000-0000-0000000000a1' $$,
  'a user cannot delete their own item once it is active'
);

delete from public.items where id = '10000000-0000-0000-0000-0000000000b1';
select isnt_empty(
  $$ select 1 from public.items where id = '10000000-0000-0000-0000-0000000000b1' $$,
  'a user cannot delete their own item once it is sold'
);

delete from public.items where id = '10000000-0000-0000-0000-0000000000c1';
select isnt_empty(
  $$ select 1 from public.items where id = '10000000-0000-0000-0000-0000000000c1' $$,
  'a user cannot delete their own item once it is removed'
);

-- Status
select throws_ok(
  $$ update public.items set status = 'active' where id = '10000000-0000-0000-0000-0000000000d2' $$,
  '42501', null,
  'a user cannot change the status of their own draft'
);
select throws_ok(
  $$ update public.items set status = 'draft' where id = '10000000-0000-0000-0000-0000000000a1' $$,
  '42501', null,
  'a user cannot turn a published item back into a draft to delete it'
);
select throws_ok(
  $$ insert into public.items (user_id, type, title, status)
     values ('00000000-0000-0000-0000-00000000000a', 'record', 'Born active', 'active') $$,
  '42501', null,
  'a user cannot insert an item with a status'
);

insert into public.items (id, user_id, type, title) values
  ('10000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-00000000000a', 'record', 'New item');
select is(
  (select status::text from public.items where id = '10000000-0000-0000-0000-0000000000e1'),
  'draft',
  'a new item starts as a draft'
);

select lives_ok(
  $$ update public.items
     set title = 'Draft, edited', artist = 'Os Marés', description = 'Sleeve has a small tear',
         price_minor = 2500, currency = 'EUR', accepts_offers = true,
         media_condition = 'VG+', sleeve_condition = 'VG', discogs_release_id = 249504
     where id = '10000000-0000-0000-0000-0000000000d2' $$,
  'a user can still edit the other fields of their item'
);

-- The server
select tests.act_as_server();

select lives_ok(
  $$ update public.items set status = 'active' where id = '10000000-0000-0000-0000-0000000000d2' $$,
  'the server can change an item''s status'
);
select is(
  (select status::text from public.items where id = '10000000-0000-0000-0000-0000000000d2'),
  'active',
  'the status the server set is saved'
);

delete from public.items where id = '10000000-0000-0000-0000-0000000000a1';
select is_empty(
  $$ select 1 from public.items where id = '10000000-0000-0000-0000-0000000000a1' $$,
  'the server can delete a published item'
);

select * from finish();
rollback;
