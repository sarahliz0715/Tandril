-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule execute-scheduled-workflows to run every hour
-- IMPORTANT: Replace biksocozipayckfuzzul and YOUR_SERVICE_ROLE_KEY below before running.
-- biksocozipayckfuzzul is the part before .supabase.co in your project URL.
-- YOUR_SERVICE_ROLE_KEY is found in Supabase Dashboard → Settings → API → service_role key.

SELECT cron.schedule(
  'execute-scheduled-workflows-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://biksocozipayckfuzzul.supabase.co/functions/v1/execute-scheduled-workflows',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
