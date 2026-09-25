-- Allow platforms.status = 'needs_reconnect': set when a platform rejects Tandril's stored
-- credentials (e.g. Shopify 401 after the app was uninstalled or its token revoked), so the
-- UI can prompt a reconnect instead of showing "Connected" with an empty product list.
-- See supabase/functions/_shared/platformHealth.ts.
ALTER TABLE platforms DROP CONSTRAINT IF EXISTS platforms_status_check;
ALTER TABLE platforms ADD CONSTRAINT platforms_status_check
  CHECK (status = ANY (ARRAY['connected', 'pending', 'processing', 'disconnected', 'error', 'needs_reconnect']));
