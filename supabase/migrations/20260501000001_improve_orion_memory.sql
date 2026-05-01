-- Orion Memory System Upgrade
-- Adds confidence scoring, reinforcement counting, access tracking, and expiry
-- to orion_memory. Creates orion_preferences for structured permanent settings.

-- ─── Upgrade orion_memory ────────────────────────────────────────────────────

ALTER TABLE orion_memory
  ADD COLUMN IF NOT EXISTS confidence       FLOAT        NOT NULL DEFAULT 0.7,
  ADD COLUMN IF NOT EXISTS source_count     INT          NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS expires_at       TIMESTAMPTZ  DEFAULT NULL;

-- Backfill reasonable defaults on any rows that predate this migration
UPDATE orion_memory SET
  confidence       = 0.7,
  source_count     = 1,
  last_accessed_at = updated_at
WHERE confidence = 0.7 AND source_count = 1;

-- Index for expiry filtering (most queries will exclude expired rows)
CREATE INDEX IF NOT EXISTS idx_orion_memory_user_expires
  ON orion_memory(user_id, expires_at NULLS FIRST, updated_at DESC);

-- ─── orion_preferences ───────────────────────────────────────────────────────
-- One row per user. Stores structured, permanent preferences in a JSONB blob
-- so Orion can write and update preferences without schema changes.
-- Examples of keys Orion might write:
--   price_format, sku_format, low_stock_threshold, alert_email,
--   response_style, business_type, timezone, primary_platform

CREATE TABLE IF NOT EXISTS orion_preferences (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preferences  JSONB       NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_orion_preferences_user
  ON orion_preferences(user_id);

ALTER TABLE orion_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own orion preferences"
  ON orion_preferences FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
