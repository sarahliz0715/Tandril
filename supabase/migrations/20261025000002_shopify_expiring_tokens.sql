-- Expiring Shopify offline tokens (required for public apps from Jan 1, 2027).
--
-- An expiring token lasts 60 minutes and comes with a refresh token (90 days, renewed on
-- every refresh). platforms.access_token keeps holding the CURRENT access token (encrypted),
-- so the ~40 functions that read it keep working unchanged; this table holds what's needed
-- to renew it. It is service-only: RLS on with no policies, and no grants to signed-in users,
-- so the browser can never read refresh tokens.
--
-- A row only exists for stores that have been switched to expiring tokens. Stores without a
-- row keep their non-expiring token and behave exactly as before.
--
-- for_access_token = the exact encrypted platforms.access_token this pair belongs to. If a
-- reconnect, uninstall or anything else replaces platforms.access_token, the row no longer
-- matches and is ignored/cleaned up instead of being used to overwrite the newer token.

create table if not exists public.shopify_token_state (
  platform_id              uuid primary key references public.platforms(id) on delete cascade,
  for_access_token         text not null,
  refresh_token            text not null,          -- encrypted, same scheme as access_token
  access_token_expires_at  timestamptz not null,
  refresh_token_expires_at timestamptz,
  lease_until              timestamptz,            -- only one refresh at a time per store
  migrated_from            text,                   -- encrypted original non-expiring token (Shopify lets a lost
                                                   -- migration response be recovered with it for 7 days)
  migrated_at              timestamptz,
  last_refreshed_at        timestamptz,
  last_error               text,
  updated_at               timestamptz not null default now()
);

alter table public.shopify_token_state enable row level security;
revoke all on table public.shopify_token_state from public, anon, authenticated;
grant select, insert, update, delete on table public.shopify_token_state to service_role;

-- Save a token from Shopify in one transaction: the access token on platforms and (for an
-- expiring token) its refresh token here. p_refresh_token null = a non-expiring token, which
-- removes any stale expiring state. p_expected_access_token makes it a compare-and-set: if
-- platforms.access_token was replaced meanwhile (e.g. the merchant reconnected), nothing is
-- written and the call fails, so an older pair never overwrites a newer one.
create or replace function public.save_shopify_token(
  p_platform_id uuid,
  p_access_token text,
  p_refresh_token text,
  p_access_expires_at timestamptz,
  p_refresh_expires_at timestamptz,
  p_migrated_from text default null,
  p_expected_access_token text default null
) returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update platforms
     set access_token = p_access_token
   where id = p_platform_id
     and (p_expected_access_token is null or access_token = p_expected_access_token);
  if not found then
    raise exception 'token_replaced: platform % has a different access token now (or no longer exists)', p_platform_id;
  end if;

  if p_refresh_token is null then
    delete from shopify_token_state where platform_id = p_platform_id;
    return;
  end if;

  insert into shopify_token_state as s (
    platform_id, for_access_token, refresh_token, access_token_expires_at, refresh_token_expires_at,
    migrated_from, migrated_at, last_refreshed_at, lease_until, last_error, updated_at
  ) values (
    p_platform_id, p_access_token, p_refresh_token, p_access_expires_at, p_refresh_expires_at,
    p_migrated_from, case when p_migrated_from is not null then now() end, now(), null, null, now()
  )
  on conflict (platform_id) do update set
    for_access_token         = excluded.for_access_token,
    refresh_token            = excluded.refresh_token,
    access_token_expires_at  = excluded.access_token_expires_at,
    refresh_token_expires_at = excluded.refresh_token_expires_at,
    migrated_from            = coalesce(excluded.migrated_from, s.migrated_from),
    migrated_at              = coalesce(excluded.migrated_at, s.migrated_at),
    last_refreshed_at        = now(),
    lease_until              = null,
    last_error               = null,
    updated_at               = now();
end;
$$;

-- Take the per-store refresh lease. Returns true for exactly one caller until the lease
-- expires or save_shopify_token clears it.
create or replace function public.claim_shopify_token_refresh(p_platform_id uuid, p_seconds int default 30)
returns boolean
language sql
security invoker
set search_path = public
as $$
  with claimed as (
    update shopify_token_state
       set lease_until = now() + make_interval(secs => p_seconds)
     where platform_id = p_platform_id
       and (lease_until is null or lease_until < now())
    returning 1
  )
  select exists (select 1 from claimed);
$$;

revoke execute on function public.save_shopify_token(uuid, text, text, timestamptz, timestamptz, text, text) from public, anon, authenticated;
revoke execute on function public.claim_shopify_token_refresh(uuid, int) from public, anon, authenticated;
grant execute on function public.save_shopify_token(uuid, text, text, timestamptz, timestamptz, text, text) to service_role;
grant execute on function public.claim_shopify_token_refresh(uuid, int) to service_role;
