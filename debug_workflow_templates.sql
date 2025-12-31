-- Debug: Check if workflow_templates table exists and has data

-- Step 1: Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'workflow_templates'
) as table_exists;

-- Step 2: Count how many templates exist
SELECT COUNT(*) as template_count FROM workflow_templates;

-- Step 3: Show all templates
SELECT id, name, description, is_featured, created_at FROM workflow_templates ORDER BY created_at;

-- If the above queries fail or show 0 templates, run this complete setup:

/*
-- Complete Workflow Templates Setup (run this if needed)

-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS workflow_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    icon TEXT,
    trigger_type TEXT NOT NULL,
    trigger_config JSONB DEFAULT '{}',
    actions JSONB NOT NULL DEFAULT '[]',
    is_featured BOOLEAN DEFAULT false,
    use_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Anyone can view workflow templates" ON workflow_templates;

-- Create policy to allow authenticated users to read
CREATE POLICY "Anyone can view workflow templates"
    ON workflow_templates FOR SELECT
    TO authenticated
    USING (true);

-- Delete existing data to avoid duplicates
DELETE FROM workflow_templates;

-- Insert the 3 templates
INSERT INTO workflow_templates (name, description, category, icon, trigger_type, trigger_config, actions, is_featured) VALUES
('Daily Inventory Check', 'Check for low stock items every morning and send a notification', 'inventory', 'Package', 'schedule', '{"cron": "0 9 * * *", "timezone": "America/New_York"}', '[{"type": "check_inventory", "config": {"threshold": 10}}, {"type": "send_notification", "config": {"channel": "email"}}]', true),
('Weekend Sale Automation', 'Automatically apply weekend discounts every Friday and remove them Monday', 'pricing', 'TrendingUp', 'schedule', '{"cron": "0 0 * * 5", "timezone": "America/New_York"}', '[{"type": "apply_discount", "config": {"amount": 15, "type": "percentage", "collections": ["weekend-specials"]}}]', true),
('Low Stock Alert', 'Get notified when any product drops below 5 units', 'inventory', 'AlertTriangle', 'event', '{"event": "inventory_change", "condition": "quantity < 5"}', '[{"type": "send_alert", "config": {"priority": "high"}}]', true);

-- Verify the insert worked
SELECT COUNT(*) as final_count FROM workflow_templates;
*/
