-- Create business_coaching table for storing AI coach interactions and insights
CREATE TABLE IF NOT EXISTS business_coaching (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coaching_type TEXT NOT NULL CHECK (coaching_type IN (
    'daily_briefing',
    'growth_opportunity',
    'risk_alert',
    'conversation',
    'advice'
  )),
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  was_helpful BOOLEAN,
  user_feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_business_coaching_user_id ON business_coaching(user_id);
CREATE INDEX idx_business_coaching_type ON business_coaching(coaching_type);
CREATE INDEX idx_business_coaching_created_at ON business_coaching(created_at DESC);
CREATE INDEX idx_business_coaching_user_type ON business_coaching(user_id, coaching_type, created_at DESC);

-- Enable RLS
ALTER TABLE business_coaching ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own coaching data"
  ON business_coaching FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own coaching data"
  ON business_coaching FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own coaching data"
  ON business_coaching FOR UPDATE
  USING (auth.uid() = user_id);

-- Create view for coaching insights
CREATE OR REPLACE VIEW coaching_insights AS
SELECT
  user_id,
  coaching_type,
  COUNT(*) AS total_sessions,
  COUNT(*) FILTER (WHERE was_helpful = true) AS helpful_count,
  COUNT(*) FILTER (WHERE was_helpful = false) AS not_helpful_count,
  CASE
    WHEN COUNT(*) FILTER (WHERE was_helpful IS NOT NULL) > 0
    THEN (COUNT(*) FILTER (WHERE was_helpful = true)::DECIMAL /
          COUNT(*) FILTER (WHERE was_helpful IS NOT NULL)) * 100
    ELSE NULL
  END AS helpfulness_rate,
  MAX(created_at) AS last_session_at,
  MIN(created_at) AS first_session_at
FROM business_coaching
GROUP BY user_id, coaching_type;

-- Enable RLS on view
ALTER VIEW coaching_insights SET (security_barrier = true);

-- Grant access to authenticated users
GRANT SELECT ON coaching_insights TO authenticated;

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_coaching_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_business_coaching_updated_at
  BEFORE UPDATE ON business_coaching
  FOR EACH ROW
  EXECUTE FUNCTION update_coaching_updated_at();

COMMENT ON TABLE business_coaching IS 'Stores AI business coach interactions, briefings, and advice';
COMMENT ON COLUMN business_coaching.coaching_type IS 'Type of coaching: daily_briefing, growth_opportunity, risk_alert, conversation, advice';
COMMENT ON COLUMN business_coaching.content IS 'The actual coaching content (briefing, opportunities, risks, Q&A, etc.)';
COMMENT ON COLUMN business_coaching.metadata IS 'Additional context like date, metrics, confidence scores';
COMMENT ON COLUMN business_coaching.was_helpful IS 'User feedback: was this coaching helpful?';
COMMENT ON COLUMN business_coaching.user_feedback IS 'Optional text feedback from user';
