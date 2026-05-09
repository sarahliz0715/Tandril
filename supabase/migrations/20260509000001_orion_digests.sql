-- orion_digests: AI-generated daily business summaries
CREATE TABLE IF NOT EXISTS orion_digests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period TEXT NOT NULL DEFAULT 'daily',
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  digest_text TEXT NOT NULL,
  data_snapshot JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE orion_digests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own digests"
  ON orion_digests FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX orion_digests_user_time_idx
  ON orion_digests (user_id, generated_at DESC);
