-- Custom Alerts Migration
-- Adds tables for custom alert system with monitoring and notifications

CREATE TABLE IF NOT EXISTS custom_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    trigger_type TEXT NOT NULL, -- inventory_low, sales_drop, revenue_milestone, new_review, etc.
    conditions JSONB NOT NULL DEFAULT '[]', -- Array of {field, operator, value} conditions
    check_frequency TEXT NOT NULL DEFAULT 'hourly', -- real_time, every_5_minutes, every_15_minutes, hourly, daily
    notification_channels TEXT[] NOT NULL DEFAULT '{"in_app"}', -- in_app, email, sms
    notification_template JSONB DEFAULT '{"priority": "medium"}', -- Template for notifications
    is_active BOOLEAN DEFAULT true,
    last_checked_at TIMESTAMPTZ,
    last_triggered_at TIMESTAMPTZ,
    trigger_count INTEGER DEFAULT 0,
    cooldown_minutes INTEGER DEFAULT 60, -- Minimum time between notifications for same alert
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alert History table to track when alerts fire
CREATE TABLE IF NOT EXISTS alert_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_id UUID NOT NULL REFERENCES custom_alerts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    triggered_at TIMESTAMPTZ DEFAULT NOW(),
    trigger_data JSONB DEFAULT '{}', -- Data that caused the alert to trigger
    notification_sent BOOLEAN DEFAULT false,
    notification_channels TEXT[],
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications table for in-app notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    alert_id UUID REFERENCES custom_alerts(id) ON DELETE SET NULL,
    alert_history_id UUID REFERENCES alert_history(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    priority TEXT DEFAULT 'medium', -- low, medium, high, urgent
    type TEXT DEFAULT 'alert', -- alert, info, warning, error, success
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    action_url TEXT, -- Optional link to take action
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_custom_alerts_user_id ON custom_alerts(user_id);
CREATE INDEX idx_custom_alerts_is_active ON custom_alerts(is_active) WHERE is_active = true;
CREATE INDEX idx_custom_alerts_trigger_type ON custom_alerts(trigger_type);

CREATE INDEX idx_alert_history_alert_id ON alert_history(alert_id);
CREATE INDEX idx_alert_history_user_id ON alert_history(user_id);
CREATE INDEX idx_alert_history_triggered_at ON alert_history(triggered_at DESC);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- Enable Row Level Security
ALTER TABLE custom_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for custom_alerts
CREATE POLICY "Users can view their own custom alerts"
    ON custom_alerts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own custom alerts"
    ON custom_alerts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own custom alerts"
    ON custom_alerts FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own custom alerts"
    ON custom_alerts FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for alert_history
CREATE POLICY "Users can view their own alert history"
    ON alert_history FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can acknowledge their own alerts"
    ON alert_history FOR UPDATE
    USING (auth.uid() = user_id);

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications"
    ON notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
    ON notifications FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
    ON notifications FOR DELETE
    USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_custom_alerts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_custom_alerts_updated_at
    BEFORE UPDATE ON custom_alerts
    FOR EACH ROW
    EXECUTE FUNCTION update_custom_alerts_updated_at();
