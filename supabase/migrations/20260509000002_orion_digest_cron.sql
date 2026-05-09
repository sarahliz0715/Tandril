-- Schedule generate-orion-digest to run every day at 8:00 UTC
-- IMPORTANT: Replace biksocozipayckfuzzul and YOUR_SERVICE_ROLE_KEY before running.

SELECT cron.schedule(
  'generate-orion-digest',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://biksocozipayckfuzzul.supabase.co/functions/v1/generate-orion-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
