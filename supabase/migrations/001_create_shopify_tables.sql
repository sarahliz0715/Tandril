-- Tandril Supabase Database Schema
-- This creates the necessary tables for Shopify integration, commands, and workflows

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- OAuth States table - stores temporary OAuth state parameters for security
CREATE TABLE oauth_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    state TEXT NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    shop_domain TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_oauth_states_state ON oauth_states(state);
CREATE INDEX idx_oauth_states_expires ON oauth_states(expires_at);

-- Platforms table - stores connected Shopify stores
CREATE TABLE platforms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    platform_type TEXT NOT NULL DEFAULT 'shopify',
    shop_domain TEXT NOT NULL, -- e.g., "my-store.myshopify.com"
    shop_name TEXT, -- Display name
    access_token TEXT NOT NULL, -- Encrypted Shopify access token
    access_scopes TEXT[], -- Granted scopes
    is_active BOOLEAN DEFAULT true,
    last_synced_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}', -- Store additional platform-specific data
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, shop_domain)
);

-- AI Commands table - stores command history and execution
CREATE TABLE ai_commands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    command_text TEXT NOT NULL,
    platform_targets TEXT[], -- Platform names this command targets
    actions_planned JSONB DEFAULT '[]', -- Planned actions from interpretation
    status TEXT NOT NULL DEFAULT 'pending', -- pending, interpreting, awaiting_confirmation, executing, completed, failed
    confidence_score DECIMAL(3,2) DEFAULT 0.8,
    execution_results JSONB DEFAULT '{}',
    error_message TEXT,
    executed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Saved Commands table - user's saved command templates
CREATE TABLE saved_commands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    command_text TEXT NOT NULL,
    description TEXT,
    category TEXT,
    is_favorite BOOLEAN DEFAULT false,
    use_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflows table - automated workflows
CREATE TABLE ai_workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    trigger_type TEXT NOT NULL, -- schedule, event, manual
    trigger_config JSONB DEFAULT '{}', -- Cron expression or event config
    actions JSONB NOT NULL DEFAULT '[]', -- Array of actions to execute
    is_active BOOLEAN DEFAULT true,
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    run_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow Runs table - execution history for workflows
CREATE TABLE workflow_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL REFERENCES ai_workflows(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'running', -- running, completed, failed
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    execution_results JSONB DEFAULT '{}',
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow Templates table - pre-built workflow templates
CREATE TABLE workflow_templates (
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

-- Create indexes for better query performance
CREATE INDEX idx_platforms_user_id ON platforms(user_id);
CREATE INDEX idx_platforms_shop_domain ON platforms(shop_domain);
CREATE INDEX idx_ai_commands_user_id ON ai_commands(user_id);
CREATE INDEX idx_ai_commands_status ON ai_commands(status);
CREATE INDEX idx_ai_commands_created_at ON ai_commands(created_at DESC);
CREATE INDEX idx_saved_commands_user_id ON saved_commands(user_id);
CREATE INDEX idx_ai_workflows_user_id ON ai_workflows(user_id);
CREATE INDEX idx_ai_workflows_is_active ON ai_workflows(is_active);
CREATE INDEX idx_ai_workflows_next_run ON ai_workflows(next_run_at) WHERE is_active = true;
CREATE INDEX idx_workflow_runs_workflow_id ON workflow_runs(workflow_id);
CREATE INDEX idx_workflow_templates_featured ON workflow_templates(is_featured);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_platforms_updated_at BEFORE UPDATE ON platforms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_commands_updated_at BEFORE UPDATE ON ai_commands
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_saved_commands_updated_at BEFORE UPDATE ON saved_commands
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_workflows_updated_at BEFORE UPDATE ON ai_workflows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
ALTER TABLE platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;

-- Platforms policies
CREATE POLICY "Users can view their own platforms"
    ON platforms FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own platforms"
    ON platforms FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own platforms"
    ON platforms FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own platforms"
    ON platforms FOR DELETE
    USING (auth.uid() = user_id);

-- AI Commands policies
CREATE POLICY "Users can view their own commands"
    ON ai_commands FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own commands"
    ON ai_commands FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own commands"
    ON ai_commands FOR UPDATE
    USING (auth.uid() = user_id);

-- Saved Commands policies
CREATE POLICY "Users can view their own saved commands"
    ON saved_commands FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved commands"
    ON saved_commands FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved commands"
    ON saved_commands FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved commands"
    ON saved_commands FOR DELETE
    USING (auth.uid() = user_id);

-- AI Workflows policies
CREATE POLICY "Users can view their own workflows"
    ON ai_workflows FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own workflows"
    ON ai_workflows FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workflows"
    ON ai_workflows FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workflows"
    ON ai_workflows FOR DELETE
    USING (auth.uid() = user_id);

-- Workflow Runs policies (join with workflow to check ownership)
CREATE POLICY "Users can view their workflow runs"
    ON workflow_runs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM ai_workflows
            WHERE ai_workflows.id = workflow_runs.workflow_id
            AND ai_workflows.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert workflow runs"
    ON workflow_runs FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM ai_workflows
            WHERE ai_workflows.id = workflow_runs.workflow_id
            AND ai_workflows.user_id = auth.uid()
        )
    );

-- Workflow Templates policies (public read)
CREATE POLICY "Anyone can view workflow templates"
    ON workflow_templates FOR SELECT
    TO authenticated
    USING (true);

-- Insert some default workflow templates
INSERT INTO workflow_templates (name, description, category, icon, trigger_type, trigger_config, actions, is_featured) VALUES
('Daily Inventory Check', 'Check for low stock items every morning and send a notification', 'inventory', 'Package', 'schedule', '{"cron": "0 9 * * *", "timezone": "America/New_York"}', '[{"type": "check_inventory", "config": {"threshold": 10}}, {"type": "send_notification", "config": {"channel": "email"}}]', true),
('Weekend Sale Automation', 'Automatically apply weekend discounts every Friday and remove them Monday', 'pricing', 'TrendingUp', 'schedule', '{"cron": "0 0 * * 5", "timezone": "America/New_York"}', '[{"type": "apply_discount", "config": {"amount": 15, "type": "percentage", "collections": ["weekend-specials"]}}]', true),
('Low Stock Alert', 'Get notified when any product drops below 5 units', 'inventory', 'AlertTriangle', 'event', '{"event": "inventory_change", "condition": "quantity < 5"}', '[{"type": "send_alert", "config": {"priority": "high"}}]', true);
