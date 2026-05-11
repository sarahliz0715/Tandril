-- market_intelligence: stores AI-generated niche market insights per user
CREATE TABLE IF NOT EXISTS market_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  niche TEXT NOT NULL,
  data_type TEXT NOT NULL, -- trending_products | niche_analysis | competitor_analysis | keyword_performance
  title TEXT,
  content JSONB NOT NULL DEFAULT '{}',
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE market_intelligence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own market intelligence"
  ON market_intelligence FOR ALL USING (auth.uid() = user_id);

CREATE INDEX market_intelligence_user_niche_idx
  ON market_intelligence (user_id, niche, data_type, generated_at DESC);
