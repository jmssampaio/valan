-- Photo storage.
--
--   * The seller's photos live in a private bucket. Each file is under the owner's folder:
--     {user id}/{item id}/{photo id}.jpg, with a small version beside it for lists.
--   * The app re-encodes every photo as a JPEG before upload, so the bucket takes nothing else.
--   * An item has at most eight photos, each in its own position. That is now a rule of the
--     database, not only of the app.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('item-photos', 'item-photos', false, 5242880, array['image/jpeg']);

-- A signed-in user reaches only the files under their own folder. There is no update
-- policy: a stored photo is never overwritten, only added or deleted.
create policy "Owners read their item photo files" on storage.objects
  for select to authenticated
  using (bucket_id = 'item-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Owners add their item photo files" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'item-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Owners delete their item photo files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'item-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

alter table public.item_photos
  add constraint item_photos_position_in_range check (position between 0 and 7),
  -- Deferrable, so the photos of an item can change places in a single statement.
  add constraint item_photos_item_id_position_key unique (item_id, position) deferrable initially immediate,
  add constraint item_photos_storage_path_key unique (storage_path);

-- The unique constraint above covers what this index did.
drop index public.item_photos_item_id_position_idx;
