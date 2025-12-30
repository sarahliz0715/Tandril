-- Insert default workflow templates (using UPSERT to avoid duplicates)
-- These are the 3 featured workflow templates that should appear in the UI

INSERT INTO workflow_templates (id, name, description, category, icon, trigger_type, trigger_config, actions, is_featured, use_count)
VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    'Daily Inventory Check',
    'Check for low stock items every morning and send a notification',
    'inventory',
    'Package',
    'schedule',
    '{"cron": "0 9 * * *", "timezone": "America/New_York"}',
    '[{"type": "check_inventory", "config": {"threshold": 10}}, {"type": "send_notification", "config": {"channel": "email"}}]',
    true,
    0
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'Weekend Sale Automation',
    'Automatically apply weekend discounts every Friday and remove them Monday',
    'pricing',
    'TrendingUp',
    'schedule',
    '{"cron": "0 0 * * 5", "timezone": "America/New_York"}',
    '[{"type": "apply_discount", "config": {"amount": 15, "type": "percentage", "collections": ["weekend-specials"]}}]',
    true,
    0
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'Low Stock Alert',
    'Get notified when any product drops below 5 units',
    'inventory',
    'AlertTriangle',
    'event',
    '{"event": "inventory_change", "condition": "quantity < 5"}',
    '[{"type": "send_alert", "config": {"priority": "high"}}]',
    true,
    0
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  icon = EXCLUDED.icon,
  trigger_type = EXCLUDED.trigger_type,
  trigger_config = EXCLUDED.trigger_config,
  actions = EXCLUDED.actions,
  is_featured = EXCLUDED.is_featured,
  updated_at = NOW();
