-- Keep cross-platform product links when a store is disconnected.
--
-- Before this, platform_product_links.platform_id was ON DELETE CASCADE, so
-- clicking Disconnect on a store (even just to reconnect it) silently deleted
-- every product link that store was part of.
--
-- Now:
--   * Disconnect (deleting the platforms row) first copies that store's links
--     into paused_product_links. The cascade still removes the live links, so
--     nothing tries to sync to a store that isn't connected.
--   * When the same store is connected again (same user, platform type and
--     store identity), the links are restored automatically and the new
--     platforms row gets metadata.links_restored = { count, skus, at, pending:true }.
--     The Platforms page (or the hourly check-platform-connections job) then
--     runs a lowest-wins catch-up sync for those SKUs and clears `pending`.
--   * A different store is never matched, so its links are not restored.

-- Identifies "the same store" across a disconnect/reconnect, independent of
-- the platforms row id (which changes on reconnect).
create or replace function public.platform_store_key(p public.platforms)
returns text
language sql
immutable
as $$
  select nullif(
    rtrim(lower(trim(coalesce(
      nullif(p.shop_domain, ''),
      nullif(p.store_url, ''),
      nullif(p.metadata->>'shop_id', ''),
      nullif(p.name, '')
    ))), '/'),
    ''
  );
$$;

create table if not exists public.paused_product_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  platform_type text not null,
  store_key text not null,
  store_name text,
  sku text not null,
  platform_product_id text not null,
  platform_variant_id text,
  last_synced_quantity integer,
  link_created_at timestamptz,
  paused_at timestamptz not null default now()
);

-- No foreign key to auth.users on purpose: the pause trigger also fires while
-- an account is being deleted (users -> platforms cascade), and an FK would
-- make that account deletion fail. Rows for a deleted account are skipped by
-- the trigger below, and shop-redact (Shopify GDPR) deletes a shop's saved links.
create index if not exists paused_product_links_lookup
  on public.paused_product_links (user_id, platform_type, store_key);

alter table public.paused_product_links enable row level security;

drop policy if exists "Users view own paused links" on public.paused_product_links;
create policy "Users view own paused links" on public.paused_product_links
  for select using (auth.uid() = user_id);

drop policy if exists "Users delete own paused links" on public.paused_product_links;
create policy "Users delete own paused links" on public.paused_product_links
  for delete using (auth.uid() = user_id);

-- Disconnect: save the store's links before the cascade removes them.
create or replace function public.pause_links_on_platform_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text := public.platform_store_key(old);
begin
  if v_key is null then
    return old;
  end if;
  -- Account being deleted: don't keep anything.
  if not exists (select 1 from auth.users where id = old.user_id) then
    return old;
  end if;

  insert into public.paused_product_links
    (user_id, platform_type, store_key, store_name, sku, platform_product_id,
     platform_variant_id, last_synced_quantity, link_created_at)
  select l.user_id, l.platform_type, v_key, coalesce(old.shop_name, old.name), l.sku,
         l.platform_product_id, l.platform_variant_id, l.last_synced_quantity, l.created_at
  from public.platform_product_links l
  where l.platform_id = old.id;

  return old;
end;
$$;

drop trigger if exists pause_links_on_platform_delete on public.platforms;
create trigger pause_links_on_platform_delete
  before delete on public.platforms
  for each row execute function public.pause_links_on_platform_delete();

-- Reconnect: restore links saved for this same store.
create or replace function public.restore_links_on_platform_connect()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text := public.platform_store_key(new);
  v_count integer;
  v_skus text[];
begin
  if v_key is null or not (coalesce(new.is_active, false) or new.status = 'connected') then
    return null;
  end if;

  with moved as (
    delete from public.paused_product_links p
    where p.user_id = new.user_id
      and p.platform_type = new.platform_type
      and p.store_key = v_key
    returning p.*
  ), inserted as (
    insert into public.platform_product_links
      (user_id, sku, platform_id, platform_product_id, platform_variant_id,
       platform_type, last_synced_quantity, created_at)
    select m.user_id, m.sku, new.id, m.platform_product_id, m.platform_variant_id,
           m.platform_type, m.last_synced_quantity, coalesce(m.link_created_at, now())
    from moved m
    where not exists (
      select 1 from public.platform_product_links l
      where l.platform_id = new.id
        and l.sku = m.sku
        and l.platform_product_id = m.platform_product_id
        and l.platform_variant_id is not distinct from m.platform_variant_id
    )
    returning sku
  )
  select count(*), array_agg(distinct sku) into v_count, v_skus from inserted;

  if coalesce(v_count, 0) > 0 then
    update public.platforms
    set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'links_restored', jsonb_build_object(
        'count', v_count, 'skus', to_jsonb(v_skus), 'at', now(), 'pending', true))
    where id = new.id;
  end if;

  return null;
end;
$$;

drop trigger if exists restore_links_on_platform_connect on public.platforms;
create trigger restore_links_on_platform_connect
  after insert or update of is_active, status, shop_domain, store_url on public.platforms
  for each row execute function public.restore_links_on_platform_connect();
