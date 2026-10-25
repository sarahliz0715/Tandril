-- Only Tandril's own server (secret key / service_role) may decide which Shopify store a
-- platforms row belongs to.
--
-- Why: RLS lets a signed-in user insert/update their own platforms rows with any values.
-- Shopify webhooks (app_subscriptions/update, orders, app/uninstalled, GDPR) find the
-- owning row by shop_domain, picking the most recently updated active one. A user could
-- therefore copy another merchant's *.myshopify.com domain onto their own row and receive
-- that merchant's paid plan tier or hijack their inventory sync.
--
-- Every legitimate Shopify connect path (shopify-auth-exchange, shopify-auth-callback,
-- shopify-manual-connect, shopify-app-install) writes the row with the secret key, so it is
-- unaffected. The browser only ever updates `metadata` on these rows, which stays allowed.
-- Existing rows are not touched.

create or replace function public.guard_platform_shop_identity()
returns trigger
language plpgsql
security invoker            -- must stay INVOKER: it checks who is making the change
set search_path = public
as $$
begin
  -- Server-side writes (service_role, postgres, triggers running as the table owner) are trusted.
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.platform_type = 'shopify' or coalesce(new.shop_domain, '') ilike '%.myshopify.com' then
      raise exception 'Shopify stores can only be connected through Tandril''s Connect Shopify button'
        using errcode = '42501';
    end if;
  elsif (new.shop_domain is distinct from old.shop_domain
         or new.platform_type is distinct from old.platform_type)
        and (old.platform_type = 'shopify' or new.platform_type = 'shopify'
             or coalesce(old.shop_domain, '') ilike '%.myshopify.com'
             or coalesce(new.shop_domain, '') ilike '%.myshopify.com') then
    raise exception 'A Shopify store''s address can only be changed by reconnecting it'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

-- Trigger functions don't need EXECUTE at fire time; nobody should call this directly.
revoke execute on function public.guard_platform_shop_identity() from public, anon, authenticated;

drop trigger if exists guard_platform_shop_identity on public.platforms;
create trigger guard_platform_shop_identity
  before insert or update on public.platforms
  for each row execute function public.guard_platform_shop_identity();
