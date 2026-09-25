-- Schedule check-platform-connections hourly (at :07): flags Shopify stores whose access token
-- Shopify rejects as 'needs_reconnect', re-registers missing sync webhooks, and emails sellers
-- about broken connections (immediately, then 24h/72h reminders).
-- IMPORTANT: Replace biksocozipayckfuzzul and YOUR_SERVICE_ROLE_KEY before running
-- (or copy the headers from an existing cron.job command, as done for sync-ad-performance).

SELECT cron.schedule(
  'check-platform-connections',
  '7 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://biksocozipayckfuzzul.supabase.co/functions/v1/check-platform-connections',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
