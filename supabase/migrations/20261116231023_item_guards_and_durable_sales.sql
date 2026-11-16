-- Item guards and durable sales.
--
--   * The app may delete an item only while it is a draft. Removing a published item
--     has to take its listings off the marketplaces first, so it goes through an Edge Function.
--   * The app can never set items.status: publishing, selling and removing are decided
--     by the server, so the status always reflects what really happened on the marketplaces.
--   * A sale is a permanent record. It outlives its listing and its item, and keeps a
--     snapshot of what was sold.

-- Items: delete only drafts -------------------------------------------------------------

drop policy "Owners delete their items" on public.items;

create policy "Owners delete their draft items" on public.items
  for delete to authenticated
  using ((select auth.uid()) = user_id and status = 'draft');

-- Items: status is server-only ----------------------------------------------------------
-- Column grants replace the table-wide ones. Without status in the insert list a new item
-- always takes the default, 'draft'.

revoke insert, update on public.items from authenticated;

grant insert (
  id, user_id, type, title, artist, discogs_release_id, media_condition, sleeve_condition,
  description, price_minor, currency, accepts_offers
) on public.items to authenticated;

grant update (
  type, title, artist, discogs_release_id, media_condition, sleeve_condition,
  description, price_minor, currency, accepts_offers
) on public.items to authenticated;

-- Sales: keep the record when the listing or item goes away -------------------------------

alter table public.sales
  add column marketplace public.marketplace not null,
  add column item_title text not null,
  add column item_artist text,
  alter column listing_id drop not null;

alter table public.sales
  drop constraint sales_listing_id_user_id_fkey,
  drop constraint sales_listing_id_external_order_id_key;

alter table public.sales
  -- Clearing only listing_id keeps the sale and its owner.
  add constraint sales_listing_id_user_id_fkey
    foreign key (listing_id, user_id) references public.listings (id, user_id)
    on delete set null (listing_id),
  -- Sales no longer disappear with the listing, so account deletion needs its own link.
  add constraint sales_user_id_fkey
    foreign key (user_id) references auth.users (id) on delete cascade,
  -- Still one row per marketplace order once the listing is gone.
  add constraint sales_user_id_marketplace_external_order_id_key
    unique (user_id, marketplace, external_order_id);

create index sales_listing_id_idx on public.sales (listing_id);
