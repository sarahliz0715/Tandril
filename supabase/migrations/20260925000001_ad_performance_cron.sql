-- Schedule sync-ad-performance to run every 6 hours: refreshes lifetime spend/clicks/etc.
-- and picks up status changes made in Meta Ads Manager for every launched Meta campaign.
-- IMPORTANT: Replace biksocozipayckfuzzul and YOUR_SERVICE_ROLE_KEY before running.
-- Same values used in 20260508000002_sync_retry_cron.sql

SELECT cron.schedule(
  'sync-ad-performance',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://biksocozipayckfuzzul.supabase.co/functions/v1/sync-ad-performance',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
