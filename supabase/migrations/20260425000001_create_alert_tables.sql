-- Alert System: custom_alerts + smart_alerts
-- custom_alerts: rules defined by the user ("alert me when inventory < 5")
-- smart_alerts:  fired instances shown in the notification bell

-- ─── custom_alerts ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS custom_alerts (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name                  TEXT NOT NULL,
    description           TEXT,
    is_active             BOOLEAN NOT NULL DEFAULT true,
    trigger_type          TEXT NOT NULL,
    conditions            JSONB NOT NULL DEFAULT '[]'::jsonb,
    notification_channels TEXT[] NOT NULL DEFAULT '{in_app}'::text[],
    notification_template JSONB NOT NULL DEFAULT '{}'::jsonb,
    target_scope          JSONB NOT NULL DEFAULT '{}'::jsonb,
    check_frequency       TEXT NOT NULL DEFAULT 'hourly'
                              CHECK (check_frequency IN (
                                  'real_time','every_5_minutes','every_15_minutes','hourly','daily'
                              )),
    cooldown_minutes      INTEGER NOT NULL DEFAULT 60,
    trigger_count         INTEGER NOT NULL DEFAULT 0,
    last_triggered        TIMESTAMPTZ,
    last_checked          TIMESTAMPTZ,
    created_at            TIMESTAMPTZ DEFAULT NOW(),
    updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_custom_alerts_user     ON custom_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_alerts_active   ON custom_alerts(is_active, trigger_type);

ALTER TABLE custom_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own custom alerts"
    ON custom_alerts FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ─── smart_alerts ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS smart_alerts (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    custom_alert_id   UUID REFERENCES custom_alerts(id) ON DELETE SET NULL,
    alert_type        TEXT NOT NULL DEFAULT 'maintenance'
                          CHECK (alert_type IN ('critical','opportunity','maintenance','info')),
    title             TEXT NOT NULL,
    message           TEXT NOT NULL,
    priority          TEXT NOT NULL DEFAULT 'medium'
                          CHECK (priority IN ('urgent','high','medium','low')),
    suggested_actions JSONB DEFAULT '[]'::jsonb,
    is_read           BOOLEAN NOT NULL DEFAULT false,
    is_dismissed      BOOLEAN NOT NULL DEFAULT false,
    expires_at        TIMESTAMPTZ,
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_smart_alerts_user_unread
    ON smart_alerts(user_id, is_dismissed, created_at DESC);

ALTER TABLE smart_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own smart alerts"
    ON smart_alerts FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Service role can insert smart_alerts on behalf of any user (needed by check-alerts cron function)
CREATE POLICY "Service role can insert smart alerts"
    ON smart_alerts FOR INSERT
    TO service_role
    WITH CHECK (true);

CREATE POLICY "Service role can update smart alerts"
    ON smart_alerts FOR UPDATE
    TO service_role
    USING (true);

-- Service role can read custom_alerts to evaluate them
CREATE POLICY "Service role can read custom alerts"
    ON custom_alerts FOR SELECT
    TO service_role
    USING (true);

CREATE POLICY "Service role can update custom alerts"
    ON custom_alerts FOR UPDATE
    TO service_role
    USING (true);

-- ─── updated_at trigger ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_custom_alert_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_custom_alerts_updated_at ON custom_alerts;
CREATE TRIGGER trg_custom_alerts_updated_at
    BEFORE UPDATE ON custom_alerts
    FOR EACH ROW EXECUTE FUNCTION update_custom_alert_updated_at();
