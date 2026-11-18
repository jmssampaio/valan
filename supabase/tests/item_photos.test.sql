-- Photo storage: a private bucket for re-encoded JPEGs, and at most eight photos per item.
begin;
create extension if not exists pgtap with schema extensions;

select plan(12);

-- Alice is ...0a.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'alice@example.test');

insert into public.items (id, user_id, type, title) values
  ('10000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000000a', 'record', 'Alice record');

-- The bucket
select is(
  (select public from storage.buckets where id = 'item-photos'),
  false,
  'the photo bucket is private'
);
select is(
  (select file_size_limit from storage.buckets where id = 'item-photos'),
  5242880::bigint,
  'a photo file may be at most 5 MB'
);
select is(
  (select allowed_mime_types from storage.buckets where id = 'item-photos'),
  array['image/jpeg'],
  'only JPEG files are accepted'
);

-- Who may touch the files
select is(
  (select count(*)::int from pg_policies
   where schemaname = 'storage' and tablename = 'objects' and policyname like '%item photo%'),
  3,
  'the photo files have policies to read, add and delete'
);
select is_empty(
  $$ select policyname::text from pg_policies
     where schemaname = 'storage' and tablename = 'objects' and policyname like '%item photo%'
       and not ('authenticated' = any (roles)) $$,
  'the photo policies are for signed-in users only'
);
select is_empty(
  $$ select policyname::text from pg_policies
     where schemaname = 'storage' and tablename = 'objects' and policyname like '%item photo%'
       and cmd = 'UPDATE' $$,
  'a stored photo cannot be overwritten'
);

-- At most eight photos, each in its own place
select lives_ok(
  $$ insert into public.item_photos (user_id, item_id, storage_path, position)
     select '00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-0000000000a1',
            'a/photo-' || place || '.jpg', place
     from generate_series(0, 7) as place $$,
  'an item takes eight photos'
);
select throws_ok(
  $$ insert into public.item_photos (user_id, item_id, storage_path, position)
     values ('00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-0000000000a1', 'a/ninth.jpg', 8) $$,
  '23514', null,
  'a ninth photo is refused'
);
select throws_ok(
  $$ insert into public.item_photos (user_id, item_id, storage_path, position)
     values ('00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-0000000000a1', 'a/again.jpg', 3) $$,
  '23505', null,
  'two photos cannot share a position on one item'
);
select throws_ok(
  $$ insert into public.item_photos (user_id, item_id, storage_path, position)
     values ('00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-0000000000a1', 'a/photo-0.jpg', 0) $$,
  '23505', null,
  'the same file is recorded once'
);

-- Photos change places in one statement, so the order can be rewritten without a gap.
select lives_ok(
  $$ update public.item_photos set position = 7 - position
     where item_id = '10000000-0000-0000-0000-0000000000a1' $$,
  'the photos of an item can be reordered in one statement'
);
select is(
  (select storage_path from public.item_photos
   where item_id = '10000000-0000-0000-0000-0000000000a1' and position = 0),
  'a/photo-7.jpg',
  'the new order is saved'
);

select * from finish();
rollback;
