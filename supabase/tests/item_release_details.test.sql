-- Release details (format, year) belong to records; the equipment condition to equipment.
begin;
create extension if not exists pgtap with schema extensions;

select plan(13);

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

-- Alice is ...0a.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'alice@example.test');

select has_column('public', 'items', 'format', 'items has a format');
select has_column('public', 'items', 'release_year', 'items has a release year');
select has_column('public', 'items', 'equipment_condition', 'items has an equipment condition');

select tests.sign_in('00000000-0000-0000-0000-00000000000a');

-- What the app may write
select lives_ok(
  $$ insert into public.items (id, user_id, type, title, format, release_year)
     values ('10000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-00000000000a',
             'record', 'Noites de Lisboa', 'LP, Album', 1978) $$,
  'a user saves a record with its format and release year'
);
select lives_ok(
  $$ insert into public.items (id, user_id, type, title, equipment_condition)
     values ('10000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-00000000000a',
             'equipment', 'Gira-discos Aurora', 'good') $$,
  'a user saves equipment with its condition'
);
select lives_ok(
  $$ update public.items set format = 'LP, Reissue', release_year = 1994
     where id = '10000000-0000-0000-0000-0000000000f1' $$,
  'a user changes the format and release year of their record'
);
select lives_ok(
  $$ update public.items set equipment_condition = 'for_parts'
     where id = '10000000-0000-0000-0000-0000000000f2' $$,
  'a user changes the condition of their equipment'
);

-- Each detail belongs to one item type
select throws_ok(
  $$ insert into public.items (user_id, type, title, format)
     values ('00000000-0000-0000-0000-00000000000a', 'equipment', 'Amplifier', 'LP') $$,
  '23514', null,
  'equipment cannot carry a record format'
);
select throws_ok(
  $$ insert into public.items (user_id, type, title, release_year)
     values ('00000000-0000-0000-0000-00000000000a', 'equipment', 'Amplifier', 1978) $$,
  '23514', null,
  'equipment cannot carry a release year'
);
select throws_ok(
  $$ insert into public.items (user_id, type, title, equipment_condition)
     values ('00000000-0000-0000-0000-00000000000a', 'record', 'Verde Mar', 'good') $$,
  '23514', null,
  'a record cannot carry an equipment condition'
);

-- Values that make no sense
select throws_ok(
  $$ insert into public.items (user_id, type, title, format)
     values ('00000000-0000-0000-0000-00000000000a', 'record', 'Verde Mar', '   ') $$,
  '23514', null,
  'a format cannot be blank'
);
select throws_ok(
  $$ insert into public.items (user_id, type, title, release_year)
     values ('00000000-0000-0000-0000-00000000000a', 'record', 'Verde Mar', 978) $$,
  '23514', null,
  'a release year must be a plausible year'
);
select throws_ok(
  $$ insert into public.items (user_id, type, title, equipment_condition)
     values ('00000000-0000-0000-0000-00000000000a', 'equipment', 'Amplifier', 'VG+') $$,
  '22P02', null,
  'an equipment condition must be one the app knows'
);

select * from finish();
rollback;
