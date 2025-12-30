-- Create onboarding_progress table for tracking user onboarding status
CREATE TABLE IF NOT EXISTS onboarding_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform_id UUID REFERENCES platforms(id) ON DELETE SET NULL,
  current_step TEXT NOT NULL DEFAULT 'welcome',
  completed_steps TEXT[] DEFAULT ARRAY[]::TEXT[],
  analysis_data JSONB DEFAULT '{}'::jsonb,
  recommendations JSONB DEFAULT '{}'::jsonb,
  completed_quick_wins INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  setup_automations TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_completed BOOLEAN DEFAULT false,
  skipped_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Ensure one onboarding per user per platform
  UNIQUE(user_id, platform_id)
);

-- Add indexes for performance
CREATE INDEX idx_onboarding_user_id ON onboarding_progress(user_id);
CREATE INDEX idx_onboarding_platform_id ON onboarding_progress(platform_id);
CREATE INDEX idx_onboarding_current_step ON onboarding_progress(current_step);
CREATE INDEX idx_onboarding_is_completed ON onboarding_progress(is_completed) WHERE is_completed = false;

-- Enable RLS
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own onboarding progress"
  ON onboarding_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own onboarding progress"
  ON onboarding_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own onboarding progress"
  ON onboarding_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_onboarding_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_onboarding_progress_updated_at
  BEFORE UPDATE ON onboarding_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_onboarding_updated_at();

-- Add onboarding_completed flag to users (optional)
ALTER TABLE auth.users
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE;

-- Create view for onboarding stats (admin use)
CREATE OR REPLACE VIEW onboarding_stats AS
SELECT
  DATE(created_at) AS date,
  COUNT(*) AS total_started,
  COUNT(*) FILTER (WHERE is_completed = true) AS total_completed,
  COUNT(*) FILTER (WHERE skipped_at IS NOT NULL) AS total_skipped,
  ROUND(
    (COUNT(*) FILTER (WHERE is_completed = true)::DECIMAL /
     NULLIF(COUNT(*), 0)) * 100,
    2
  ) AS completion_rate,
  AVG(
    CASE
      WHEN completed_at IS NOT NULL
      THEN EXTRACT(EPOCH FROM (completed_at - created_at)) / 60
      ELSE NULL
    END
  ) AS avg_completion_time_minutes
FROM onboarding_progress
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Grant access to authenticated users for their own data
GRANT SELECT ON onboarding_stats TO authenticated;

COMMENT ON TABLE onboarding_progress IS 'Tracks user progress through Orion-guided onboarding';
COMMENT ON COLUMN onboarding_progress.current_step IS 'Current onboarding step: welcome, connect, analyze, findings, quick_wins, automation, complete';
COMMENT ON COLUMN onboarding_progress.completed_steps IS 'Array of completed step IDs';
COMMENT ON COLUMN onboarding_progress.analysis_data IS 'Store analysis results from onboarding-store-analyzer';
COMMENT ON COLUMN onboarding_progress.recommendations IS 'Personalized recommendations from Orion';
COMMENT ON COLUMN onboarding_progress.completed_quick_wins IS 'Indexes of quick wins user completed';
COMMENT ON COLUMN onboarding_progress.setup_automations IS 'Automation IDs that were set up during onboarding';
