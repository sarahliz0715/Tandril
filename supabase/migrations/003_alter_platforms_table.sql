-- Add missing fields to platforms table that the UI expects

-- Add status field (replaces is_active for more granular states)
ALTER TABLE platforms ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'connected';
ALTER TABLE platforms ADD COLUMN IF NOT EXISTS name TEXT; -- Display name for the platform

-- Add status check constraint
ALTER TABLE platforms DROP CONSTRAINT IF EXISTS platforms_status_check;
ALTER TABLE platforms ADD CONSTRAINT platforms_status_check
    CHECK (status IN ('connected', 'pending', 'processing', 'disconnected', 'error'));

-- Create index for status
CREATE INDEX IF NOT EXISTS idx_platforms_status ON platforms(status);

-- Migrate existing data: if is_active is true, set status to 'connected', otherwise 'disconnected'
UPDATE platforms SET status = CASE
    WHEN is_active = true THEN 'connected'
    ELSE 'disconnected'
END WHERE status IS NULL OR status = 'connected';

-- Update name field to use shop_name if not set
UPDATE platforms SET name = shop_name WHERE name IS NULL AND shop_name IS NOT NULL;
