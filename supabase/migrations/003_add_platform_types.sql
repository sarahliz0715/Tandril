-- Create Platform Types table and add Shopify
-- This table stores available platform types (Shopify, Etsy, eBay, etc.)

-- Create platform_types table
CREATE TABLE IF NOT EXISTS platform_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type_id TEXT NOT NULL UNIQUE, -- e.g., 'shopify', 'etsy', 'ebay'
    name TEXT NOT NULL, -- Display name
    category TEXT, -- e.g., 'ecommerce', 'marketplace', 'social'
    description TEXT,
    logo_url TEXT, -- URL to platform logo
    is_active BOOLEAN DEFAULT true,
    requires_oauth BOOLEAN DEFAULT false,
    oauth_config JSONB, -- OAuth configuration (URLs, scopes, etc.)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on type_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_platform_types_type_id ON platform_types(type_id);
CREATE INDEX IF NOT EXISTS idx_platform_types_is_active ON platform_types(is_active);

-- Apply updated_at trigger
CREATE TRIGGER update_platform_types_updated_at BEFORE UPDATE ON platform_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE platform_types ENABLE ROW LEVEL SECURITY;

-- Anyone can view active platform types
CREATE POLICY "Anyone can view active platform types"
    ON platform_types FOR SELECT
    TO authenticated
    USING (is_active = true);

-- Service role has full access (for admin operations)
CREATE POLICY "Service role has full access to platform types"
    ON platform_types
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Insert Shopify as the primary platform
INSERT INTO platform_types (type_id, name, category, description, logo_url, is_active, requires_oauth, oauth_config)
VALUES
(
    'shopify',
    'Shopify',
    'ecommerce',
    'Connect your Shopify store to automate inventory, orders, and products with AI-powered workflows',
    'https://cdn.shopify.com/assets/images/logos/shopify-bag.png',
    true,
    true,
    '{
        "auth_url": "https://{{shop_domain}}/admin/oauth/authorize",
        "token_url": "https://{{shop_domain}}/admin/oauth/access_token",
        "scopes": "read_products,write_products,read_orders,read_customers,write_inventory,read_inventory"
    }'::jsonb
)
ON CONFLICT (type_id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- Optionally add other platforms (uncomment if needed in the future)
/*
INSERT INTO platform_types (type_id, name, category, description, is_active, requires_oauth)
VALUES
('etsy', 'Etsy', 'marketplace', 'Connect your Etsy shop', true, true),
('ebay', 'eBay', 'marketplace', 'Connect your eBay store', true, true),
('amazon', 'Amazon', 'marketplace', 'Connect your Amazon seller account', true, true),
('woocommerce', 'WooCommerce', 'ecommerce', 'Connect your WooCommerce store', true, false),
('facebook', 'Facebook Marketplace', 'social', 'Connect Facebook Marketplace', true, true)
ON CONFLICT (type_id) DO NOTHING;
*/
