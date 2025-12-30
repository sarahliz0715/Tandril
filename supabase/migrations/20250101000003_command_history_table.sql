-- Create command_history table for tracking changes and supporting undo
CREATE TABLE IF NOT EXISTS command_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  command_id UUID NOT NULL REFERENCES ai_commands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  change_snapshots JSONB NOT NULL DEFAULT '[]'::jsonb,
  can_undo BOOLEAN NOT NULL DEFAULT true,
  executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  undone_at TIMESTAMP WITH TIME ZONE,
  undo_results JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add index for faster lookups
CREATE INDEX idx_command_history_command_id ON command_history(command_id);
CREATE INDEX idx_command_history_user_id ON command_history(user_id);
CREATE INDEX idx_command_history_can_undo ON command_history(can_undo) WHERE can_undo = true;

-- Enable RLS
ALTER TABLE command_history ENABLE ROW LEVEL SECURITY;

-- RLS policy: Users can only see their own command history
CREATE POLICY "Users can view their own command history"
  ON command_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own command history"
  ON command_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own command history"
  ON command_history FOR UPDATE
  USING (auth.uid() = user_id);

-- Add optional columns to ai_commands table for tracking undo status
ALTER TABLE ai_commands
  ADD COLUMN IF NOT EXISTS undone_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS supports_undo BOOLEAN DEFAULT false;

COMMENT ON TABLE command_history IS 'Tracks command execution history with snapshots for undo functionality';
COMMENT ON COLUMN command_history.change_snapshots IS 'Array of before/after states for each change made';
COMMENT ON COLUMN command_history.can_undo IS 'Whether this command can be safely reverted';
COMMENT ON COLUMN command_history.undone_at IS 'Timestamp when the command was undone (null if not undone)';
