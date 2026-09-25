-- Schedule check-platform-connections daily at 13:07 UTC: flags Shopify stores whose access
-- token Shopify rejects as 'needs_reconnect' and drops an alert in the notification bell.
-- IMPORTANT: Replace biksocozipayckfuzzul and YOUR_SERVICE_ROLE_KEY before running
-- (or copy the headers from an existing cron.job command, as done for sync-ad-performance).

SELECT cron.schedule(
  'check-platform-connections',
  '7 13 * * *',
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
