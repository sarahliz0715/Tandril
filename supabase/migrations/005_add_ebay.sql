-- Add eBay platform type
-- eBay is now fully functional with OAuth Edge Functions

INSERT INTO platform_types (type_id, name, category, description, logo_url, is_active, requires_oauth)
VALUES
(
    'ebay',
    'eBay',
    'ecommerce',
    'Connect your eBay marketplace to manage listings, orders, and inventory with AI-powered automation.',
    'https://ir.ebaystatic.com/cr/v/c1/ebay-logo-1-1200x630-margin.png',
    true,
    true
)
ON CONFLICT (type_id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    logo_url = EXCLUDED.logo_url,
    is_active = EXCLUDED.is_active,
    requires_oauth = EXCLUDED.requires_oauth,
    updated_at = NOW();
