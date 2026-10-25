# Shopify expiring tokens — runbook

Shopify requires public apps to use **expiring** offline tokens from **Jan 1, 2027**. Code:
`supabase/functions/_shared/shopifyToken.ts`, `supabase/functions/refresh-shopify-tokens/`,
migrations `20261025000002_shopify_expiring_tokens.sql` and `20261025000003_refresh_shopify_tokens_cron.sql`.

## How it works
- `platforms.access_token` always holds the store's **current** token (encrypted). Every function
  that reads it keeps working without changes.
- `shopify_token_state` (service-only, browser can't read it) holds the refresh token and expiry
  for stores that have been switched. No row = old non-expiring token = behaves exactly as before.
- `refresh-shopify-tokens` runs every 10 minutes and renews any token with < 30 minutes left, so
  the stored token always has 20+ minutes left. The hourly `check-platform-connections` also
  renews before it tests a store, so a late renewal never sends a false "reconnect" email.
- Only one renewal per store at a time (`claim_shopify_token_refresh` lease). If a renewal
  response is lost, Shopify accepts the same refresh token again, so it is simply retried.
- A store needs reconnecting **only** if Shopify rejects its refresh token (401) — e.g. no renewal
  for 90 days, or the app was uninstalled. That store is flagged `needs_reconnect` and the
  merchant gets the usual reconnect email + bell alert.
- Switching an existing store (`migrate`) needs no action from the merchant. Shopify kills the old
  token for GraphQL as soon as it answers, so the new pair is saved first and checked with a test
  call. If saving failed, running `migrate` again within 7 days returns the same pair.
- The switch `SHOPIFY_EXPIRING_TOKENS=on` (Supabase secrets **and** Vercel `tandril-mvp`) makes
  **new** connections ask for expiring tokens. Off = connect requests are exactly as before.

## Rollout order (nothing changes for stores until step 4)
1. Merge the PR (deploys `refresh-shopify-tokens`; everything else is unchanged while off).
2. SQL editor: run `20261025000002_shopify_expiring_tokens.sql`, then `20261025000003_refresh_shopify_tokens_cron.sql`.
3. Check status (below): every store shows `"token":"non-expiring"`.
4. Switch the **test store** `omhbridge-dev` (below). Check status, the Products page on
   `shopify-test@tandril.org`, and a forced refresh. Leave it for 2+ hours; status should show
   `last_refreshed_at` moving forward about every 40 minutes, no `last_error`.
5. Turn on `SHOPIFY_EXPIRING_TOKENS=on` in Supabase **and** Vercel (`tandril-mvp`, Production);
   redeploy Vercel. Reconnect `omhbridge-dev` once from Platforms → status still `expiring`.
6. With Sarah's go-ahead: switch `407c04-19.myshopify.com` (O'Mama Hill's) the same way.
7. Before Jan 1, 2027: every active Shopify store shows `expiring`.

## SQL snippets (Supabase → SQL Editor)
Call the function (change the body for each action):
```sql
select net.http_post(
  url := 'https://biksocozipayckfuzzul.supabase.co/functions/v1/refresh-shopify-tokens',
  headers := jsonb_build_object('Content-Type','application/json',
    'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'tandril_secret_key')),
  body := '{"action":"status"}'::jsonb
) as request_id;
```
Bodies:
- `{"action":"status"}` — which stores are expiring, expiry times (never shows tokens)
- `{"action":"migrate","shop_domain":"omhbridge-dev.myshopify.com"}` — switch one store
- `{"action":"refresh","shop_domain":"omhbridge-dev.myshopify.com","force":true}` — renew now

Read the answer a few seconds later (use the request_id from above):
```sql
select status_code, content::jsonb from net._http_response where id = <request_id>;
```

## If something goes wrong
- A switched store fails: reconnect it from Platforms → Connect Shopify (always gives a working token).
- `status` shows `last_error` repeating: check edge logs for `refresh-shopify-tokens`.
- Turn new connections back to non-expiring: set `SHOPIFY_EXPIRING_TOKENS` to `off` (already-switched
  stores keep renewing normally).
