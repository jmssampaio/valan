begin;
create extension if not exists pgtap with schema extensions;

select plan(11);

select has_table('public', 'profiles', 'profiles table exists');
select has_table('public', 'platform_connections', 'platform_connections table exists');
select has_table('public', 'items', 'items table exists');
select has_table('public', 'item_photos', 'item_photos table exists');
select has_table('public', 'listings', 'listings table exists');
select has_table('public', 'offers', 'offers table exists');
select has_table('public', 'sales', 'sales table exists');
select has_table('public', 'push_tokens', 'push_tokens table exists');

-- Guards every future table too: a table added without RLS fails this test.
select is_empty(
  $$ select tablename::text from pg_tables where schemaname = 'public' and not rowsecurity $$,
  'every public table has row level security enabled'
);

select is_empty(
  $$ select c.relname::text
     from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relkind = 'r'
       and not exists (select 1 from pg_policy p where p.polrelid = c.oid) $$,
  'every public table has at least one policy'
);

select is_empty(
  $$ select table_name::text, privilege_type::text
     from information_schema.role_table_grants
     where table_schema = 'public' and grantee = 'anon' $$,
  'signed-out callers have no privileges on any public table'
);

select * from finish();
rollback;
