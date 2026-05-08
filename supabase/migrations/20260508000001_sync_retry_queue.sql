-- Tracks failed cross-platform inventory syncs so they can be retried
-- and surfaced in the UI as health indicators

ALTER TABLE platform_product_links
  ADD COLUMN IF NOT EXISTS last_synced_quantity INTEGER,
  ADD COLUMN IF NOT EXISTS last_sync_error TEXT,
  ADD COLUMN IF NOT EXISTS last_sync_failed_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS sync_retry_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sku TEXT NOT NULL,
    target_platform_id UUID NOT NULL REFERENCES platforms(id) ON DELETE CASCADE,
    target_platform_type TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    source_platform_type TEXT NOT NULL,
    triggered_by TEXT NOT NULL,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    last_attempted_at TIMESTAMPTZ,
    last_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ  -- set when successfully retried
);

CREATE INDEX idx_sync_retry_queue_user_pending
  ON sync_retry_queue(user_id, created_at DESC)
  WHERE resolved_at IS NULL;

ALTER TABLE sync_retry_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own sync retries" ON sync_retry_queue
  FOR ALL USING (auth.uid() = user_id);
