-- Schedule process-scheduled-sales to run every 5 minutes
-- IMPORTANT: Replace biksocozipayckfuzzul and YOUR_SERVICE_ROLE_KEY before running.

SELECT cron.schedule(
  'process-scheduled-sales',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://biksocozipayckfuzzul.supabase.co/functions/v1/process-scheduled-sales',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
