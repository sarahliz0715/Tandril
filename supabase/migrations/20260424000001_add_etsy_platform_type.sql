-- Add Etsy to platform_types
-- The Etsy row was commented out in 003_add_platform_types.sql and never inserted.

INSERT INTO platform_types (type_id, name, category, description, logo_url, is_active, requires_oauth)
VALUES (
  'etsy',
  'Etsy',
  'marketplace',
  'Connect your Etsy shop to manage listings, orders, and inventory with AI-powered workflows',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Etsy_logo.svg/320px-Etsy_logo.svg.png',
  true,
  true
)
ON CONFLICT (type_id) DO UPDATE SET
  is_active = true,
  updated_at = NOW();
