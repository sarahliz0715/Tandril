-- Every 10 minutes, renew any expiring Shopify token with less than 30 minutes left
-- (supabase/functions/refresh-shopify-tokens). A token lasts 60 minutes, so the stored
-- token always has 20+ minutes left for every function that reads platforms.access_token.
-- Stores still on non-expiring tokens have no shopify_token_state row and are skipped.
--
-- Apply AFTER the refresh-shopify-tokens function is deployed (merge to main deploys it).
-- Uses the tandril_secret_key Vault secret on the apikey header, like every other job.

select cron.unschedule('refresh-shopify-tokens')
where exists (select 1 from cron.job where jobname = 'refresh-shopify-tokens');

select cron.schedule(
  'refresh-shopify-tokens',
  '*/10 * * * *',
  $cmd$
  SELECT net.http_post(
    url := 'https://biksocozipayckfuzzul.supabase.co/functions/v1/refresh-shopify-tokens',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'tandril_secret_key')
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $cmd$
);
