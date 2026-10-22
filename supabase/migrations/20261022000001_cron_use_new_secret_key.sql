-- Move every cron job that calls an edge function off the legacy service_role JWT
-- (leaked in the Railway breach, Oct 2026) and onto the new secret key.
--
-- The new key (sb_secret_...) is not a JWT, so it goes on the `apikey` header, not
-- `Authorization: Bearer`, and is read from Vault at run time instead of being written
-- into cron.job in plain text. The receiving functions check it with isServiceRequest()
-- (supabase/functions/_shared/supabaseKeys.ts) and are deployed with --no-verify-jwt.
--
-- Prerequisite — run once by hand in the SQL editor (never commit the value):
--   select vault.create_secret('<sb_secret_...>', 'tandril_secret_key',
--     'Supabase secret key used by cron jobs to call edge functions');
--
-- Only jobs that send an Authorization header are touched; check-alerts and
-- daily-briefing-cron use their own x-cron-secret header and are left as they are.

do $$
declare
  j record;
begin
  if not exists (select 1 from vault.secrets where name = 'tandril_secret_key') then
    raise exception 'Create the tandril_secret_key Vault secret first (see comment above)';
  end if;

  for j in
    select jobid, substring(command from 'functions/v1/([a-z0-9-]+)') as fn
    from cron.job
    where command ~ 'functions/v1/' and command ~ 'Authorization'
  loop
    perform cron.alter_job(j.jobid, command := format($cmd$
  SELECT net.http_post(
    url := 'https://biksocozipayckfuzzul.supabase.co/functions/v1/%s',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'tandril_secret_key')
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $cmd$, j.fn));
  end loop;
end $$;
