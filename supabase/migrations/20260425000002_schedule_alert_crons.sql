-- Schedule background alert checking and daily briefings
--
-- BEFORE RUNNING THIS MIGRATION, set these two database settings once in the
-- Supabase SQL editor (Project Settings > SQL Editor):
--
--   ALTER DATABASE postgres SET app.settings.supabase_url   = 'https://YOUR_PROJECT_ID.supabase.co';
--   ALTER DATABASE postgres SET app.settings.cron_secret    = 'YOUR_CRON_SECRET';
--
-- The CRON_SECRET must match the CRON_SECRET Supabase secret set on your edge functions.
-- Generate a random value: openssl rand -hex 32
-- Add it in: Supabase Dashboard → Edge Functions → Secrets → CRON_SECRET

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ─── check-alerts every 15 minutes ───────────────────────────────────────────
SELECT cron.schedule(
  'tandril-check-alerts',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url     := current_setting('app.settings.supabase_url') || '/functions/v1/check-alerts',
    headers := jsonb_build_object(
      'Content-Type',   'application/json',
      'x-cron-secret',  current_setting('app.settings.cron_secret')
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- ─── daily briefing at 8:00 AM UTC every day ─────────────────────────────────
SELECT cron.schedule(
  'tandril-daily-briefing',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url     := current_setting('app.settings.supabase_url') || '/functions/v1/daily-briefing-cron',
    headers := jsonb_build_object(
      'Content-Type',   'application/json',
      'x-cron-secret',  current_setting('app.settings.cron_secret')
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- View scheduled jobs:  SELECT * FROM cron.job;
-- View run history:     SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;
-- Remove a job:         SELECT cron.unschedule('tandril-check-alerts');
