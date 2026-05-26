-- Workflow state machine columns
-- current_step: which action index to resume from (0 = start fresh)
-- status: 'active' | 'waiting' (paused on a wait step) | 'completed' | 'failed'

ALTER TABLE ai_workflows ADD COLUMN IF NOT EXISTS current_step INTEGER DEFAULT 0;
ALTER TABLE ai_workflows ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Index so the scheduler can quickly find workflows that are ready to resume
CREATE INDEX IF NOT EXISTS idx_ai_workflows_resume
  ON ai_workflows(next_run_at, is_active)
  WHERE is_active = true;
