-- Create automation_performance table for tracking execution metrics and learning
CREATE TABLE IF NOT EXISTS automation_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  success_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  execution_time_ms INTEGER,
  items_affected INTEGER DEFAULT 0,
  errors_encountered JSONB DEFAULT '[]'::jsonb,
  metrics JSONB DEFAULT '{}'::jsonb,
  trigger_context JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add AI scheduling columns to automations table
ALTER TABLE automations
  ADD COLUMN IF NOT EXISTS ai_recommended_schedule JSONB,
  ADD COLUMN IF NOT EXISTS ai_schedule_confidence DECIMAL(3,2),
  ADD COLUMN IF NOT EXISTS next_ai_scheduled_run TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS last_executed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS performance_score DECIMAL(5,2) DEFAULT 0.00;

-- Add indexes for performance
CREATE INDEX idx_automation_performance_automation_id ON automation_performance(automation_id);
CREATE INDEX idx_automation_performance_user_id ON automation_performance(user_id);
CREATE INDEX idx_automation_performance_executed_at ON automation_performance(executed_at DESC);
CREATE INDEX idx_automations_next_ai_scheduled_run ON automations(next_ai_scheduled_run) WHERE next_ai_scheduled_run IS NOT NULL;

-- Enable RLS
ALTER TABLE automation_performance ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own automation performance"
  ON automation_performance FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own automation performance"
  ON automation_performance FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own automation performance"
  ON automation_performance FOR UPDATE
  USING (auth.uid() = user_id);

-- Create view for automation insights
CREATE OR REPLACE VIEW automation_insights AS
SELECT
  a.id AS automation_id,
  a.user_id,
  a.name AS automation_name,
  a.trigger_type,
  a.enabled,
  a.performance_score,
  a.ai_recommended_schedule,
  a.ai_schedule_confidence,
  a.next_ai_scheduled_run,
  COUNT(ap.id) AS total_runs,
  AVG(ap.success_rate) AS avg_success_rate,
  AVG(ap.execution_time_ms) AS avg_execution_time_ms,
  SUM(ap.items_affected) AS total_items_affected,
  MAX(ap.executed_at) AS last_run_at,
  CASE
    WHEN AVG(ap.success_rate) >= 90 THEN 'excellent'
    WHEN AVG(ap.success_rate) >= 70 THEN 'good'
    WHEN AVG(ap.success_rate) >= 50 THEN 'fair'
    ELSE 'needs_improvement'
  END AS performance_rating
FROM automations a
LEFT JOIN automation_performance ap ON a.id = ap.automation_id
WHERE a.deleted_at IS NULL
GROUP BY a.id, a.user_id, a.name, a.trigger_type, a.enabled, a.performance_score,
         a.ai_recommended_schedule, a.ai_schedule_confidence, a.next_ai_scheduled_run;

-- Enable RLS on view
ALTER VIEW automation_insights SET (security_barrier = true);

-- Grant access to authenticated users
GRANT SELECT ON automation_insights TO authenticated;

COMMENT ON TABLE automation_performance IS 'Tracks automation execution metrics for AI learning and optimization';
COMMENT ON COLUMN automation_performance.success_rate IS 'Percentage of successful operations (0-100)';
COMMENT ON COLUMN automation_performance.execution_time_ms IS 'How long the automation took to execute';
COMMENT ON COLUMN automation_performance.items_affected IS 'Number of products/orders/items modified';
COMMENT ON COLUMN automation_performance.metrics IS 'Additional performance metrics (JSON)';
COMMENT ON COLUMN automation_performance.trigger_context IS 'Context at time of trigger (store state, timing, etc.)';

COMMENT ON COLUMN automations.ai_recommended_schedule IS 'AI-generated optimal schedule (JSON)';
COMMENT ON COLUMN automations.ai_schedule_confidence IS 'Confidence in AI recommendation (0.00-1.00)';
COMMENT ON COLUMN automations.next_ai_scheduled_run IS 'Next scheduled run time by AI';
COMMENT ON COLUMN automations.performance_score IS 'Overall performance score (0-100)';
