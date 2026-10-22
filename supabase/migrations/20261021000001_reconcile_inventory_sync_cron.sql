-- Schedule reconcile-inventory-sync every 20 minutes: the cross-platform inventory
-- reconciliation sweep planned since Sept 25, 2026 and never built. Backstops every
-- multi-platform-linked SKU with a lowest-wins sync, independent of webhooks (manual edits
-- on non-Shopify platforms, missed/failed webhook deliveries, or eBay's real-time order
-- notification, which turned out to have never actually worked — see Key Fixes Oct 21, 2026).
-- IMPORTANT: Replace biksocozipayckfuzzul and YOUR_SERVICE_ROLE_KEY before running
-- (or copy the headers from an existing cron.job command, as done for sync-ad-performance).

SELECT cron.schedule(
  'reconcile-inventory-sync',
  '*/20 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://biksocozipayckfuzzul.supabase.co/functions/v1/reconcile-inventory-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
