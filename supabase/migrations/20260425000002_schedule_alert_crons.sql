-- Schedule background alert checking and daily briefings
--
-- BEFORE RUNNING: replace the two placeholders below with your actual values:
--
--   YOUR_SUPABASE_URL  → find in Supabase Dashboard → Project Settings → API → Project URL
--                        example: https://abcdefghijkl.supabase.co
--
--   YOUR_CRON_SECRET   → any random string you choose (e.g. run: openssl rand -hex 32)
--                        must match the CRON_SECRET value you set in:
--                        Supabase Dashboard → Edge Functions → Secrets → CRON_SECRET

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ─── check-alerts every 15 minutes ───────────────────────────────────────────
SELECT cron.unschedule('tandril-check-alerts') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'tandril-check-alerts'
);

SELECT cron.schedule(
  'tandril-check-alerts',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://biksocozipayckfuzzul.supabase.co/functions/v1/check-alerts',
    headers := '{"Content-Type":"application/json","x-cron-secret":"YOUR_CRON_SECRET"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);

-- ─── daily briefing at 8:00 AM UTC every day ─────────────────────────────────
SELECT cron.unschedule('tandril-daily-briefing') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'tandril-daily-briefing'
);

SELECT cron.schedule(
  'tandril-daily-briefing',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://biksocozipayckfuzzul.supabase.co/functions/v1/daily-briefing-cron',
    headers := '{"Content-Type":"application/json","x-cron-secret":"YOUR_CRON_SECRET"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);

-- Verify:        SELECT jobname, schedule, active FROM cron.job;
-- View history:  SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;
-- Remove:        SELECT cron.unschedule('tandril-check-alerts');
