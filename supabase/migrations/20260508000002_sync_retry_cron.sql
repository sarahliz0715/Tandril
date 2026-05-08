-- Schedule process-sync-retries to run every 15 minutes
-- IMPORTANT: Replace YOUR_PROJECT_REF and YOUR_SERVICE_ROLE_KEY before running.
-- Same values as 20260428000002_scheduled_workflows_cron.sql

SELECT cron.schedule(
  'process-sync-retries',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-sync-retries',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
