-- Initial schema: the eight tables of the Valan data model, with row level security.
--
-- Access model
--   * The app writes only profiles (language, currency), items, item_photos and push_tokens.
--   * platform_connections, listings, offers and sales are written by Edge Functions
--     (service role); the owner can read them, but never the marketplace tokens.
--   * Signed-out callers have no access at all.
--
-- Every table carries user_id, and child tables point at their parent with a composite
-- foreign key (id, user_id), so a row can never belong to a different user than its parent.

-- Types ---------------------------------------------------------------------------------

create type public.marketplace as enum ('ebay', 'discogs');
create type public.connection_status as enum ('connected', 'expired', 'revoked');
create type public.item_type as enum ('record', 'equipment');
create type public.item_status as enum ('draft', 'active', 'sold', 'removed');
-- Goldmine grading scale, best to worst.
create type public.record_condition as enum ('M', 'NM', 'VG+', 'VG', 'G+', 'G', 'F', 'P');
create type public.listing_status as enum ('pending', 'published', 'error', 'paused', 'removed');
create type public.offer_status as enum ('pending', 'accepted', 'rejected', 'expired', 'withdrawn');

-- Shared trigger functions --------------------------------------------------------------

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Tables --------------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  language text not null default 'en' check (language in ('pt-PT', 'es', 'en')),
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.platform_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  marketplace public.marketplace not null,
  status public.connection_status not null default 'connected',
  -- Ciphertext only; encrypted and decrypted inside Edge Functions.
  access_token_encrypted text,
  refresh_token_encrypted text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, marketplace)
);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type public.item_type not null,
  title text not null,
  artist text,
  discogs_release_id bigint,
  media_condition public.record_condition,
  sleeve_condition public.record_condition,
  description text,
  -- Money is stored in minor units (cents) to avoid rounding errors.
  price_minor integer check (price_minor >= 0),
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  accepts_offers boolean not null default false,
  status public.item_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  -- Only records are identified through the Discogs catalogue and graded.
  constraint equipment_has_no_record_fields check (
    type = 'record'
    or (discogs_release_id is null and media_condition is null and sleeve_condition is null)
  )
);

create table public.item_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  item_id uuid not null,
  storage_path text not null,
  position integer not null check (position >= 0),
  created_at timestamptz not null default now(),
  foreign key (item_id, user_id) references public.items (id, user_id) on delete cascade
);

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  item_id uuid not null,
  marketplace public.marketplace not null,
  external_id text,
  url text,
  status public.listing_status not null default 'pending',
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  unique (item_id, marketplace),
  foreign key (item_id, user_id) references public.items (id, user_id) on delete cascade
);

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  listing_id uuid not null,
  external_id text not null,
  buyer text,
  amount_minor integer not null check (amount_minor >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  status public.offer_status not null default 'pending',
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (listing_id, external_id),
  foreign key (listing_id, user_id) references public.listings (id, user_id) on delete cascade
);

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  listing_id uuid not null,
  external_order_id text not null,
  price_minor integer not null check (price_minor >= 0),
  fees_minor integer not null default 0 check (fees_minor >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  buyer text,
  sold_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (listing_id, external_order_id),
  foreign key (listing_id, user_id) references public.listings (id, user_id) on delete cascade
);

create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token text not null,
  created_at timestamptz not null default now(),
  unique (user_id, token)
);

-- Indexes for the per-user lookups every policy and screen makes ---------------------------

create index items_user_id_idx on public.items (user_id);
create index item_photos_user_id_idx on public.item_photos (user_id);
create index item_photos_item_id_position_idx on public.item_photos (item_id, position);
create index listings_user_id_idx on public.listings (user_id);
create index offers_user_id_idx on public.offers (user_id);
create index sales_user_id_sold_at_idx on public.sales (user_id, sold_at desc);

-- Triggers ------------------------------------------------------------------------------

create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.platform_connections
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.items
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.listings
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.offers
  for each row execute function public.set_updated_at();

-- Runs as the function owner because the signing-up user cannot insert profiles themselves.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- Privileges ----------------------------------------------------------------------------
-- Start from nothing, then grant exactly what the app needs. RLS filters rows;
-- these grants decide which operations and columns exist for the app at all.

revoke all on all tables in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;

grant select on public.profiles to authenticated;
grant update (language, currency) on public.profiles to authenticated;

grant select, insert, update, delete on public.items to authenticated;
grant select, insert, update, delete on public.item_photos to authenticated;
grant select, insert, delete on public.push_tokens to authenticated;

-- Everything except the token columns.
grant select (id, user_id, marketplace, status, expires_at, created_at, updated_at)
  on public.platform_connections to authenticated;

grant select on public.listings to authenticated;
grant select on public.offers to authenticated;
grant select on public.sales to authenticated;

-- Row level security --------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.platform_connections enable row level security;
alter table public.items enable row level security;
alter table public.item_photos enable row level security;
alter table public.listings enable row level security;
alter table public.offers enable row level security;
alter table public.sales enable row level security;
alter table public.push_tokens enable row level security;

-- (select auth.uid()) is evaluated once per statement instead of once per row.

create policy "Owners read their profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "Owners update their profile" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "Owners read their connections" on public.platform_connections
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "Owners read their items" on public.items
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Owners insert their items" on public.items
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Owners update their items" on public.items
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Owners delete their items" on public.items
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Owners read their photos" on public.item_photos
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Owners insert their photos" on public.item_photos
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Owners update their photos" on public.item_photos
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Owners delete their photos" on public.item_photos
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Owners read their listings" on public.listings
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "Owners read their offers" on public.offers
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "Owners read their sales" on public.sales
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "Owners read their push tokens" on public.push_tokens
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Owners insert their push tokens" on public.push_tokens
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Owners delete their push tokens" on public.push_tokens
  for delete to authenticated using ((select auth.uid()) = user_id);
