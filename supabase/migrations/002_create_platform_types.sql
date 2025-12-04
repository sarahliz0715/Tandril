-- Platform Types table - defines available platform integrations
CREATE TABLE platform_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type_id TEXT NOT NULL UNIQUE, -- e.g., 'shopify', 'etsy', 'ebay'
    name TEXT NOT NULL, -- Display name
    description TEXT,
    category TEXT NOT NULL DEFAULT 'e_commerce_platform', -- e_commerce_platform, marketplace, print_on_demand, advertising
    logo_url TEXT,
    is_available BOOLEAN DEFAULT true,
    is_beta BOOLEAN DEFAULT false,
    connection_instructions TEXT,
    required_scopes TEXT[], -- Required OAuth scopes
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index
CREATE INDEX idx_platform_types_category ON platform_types(category);
CREATE INDEX idx_platform_types_available ON platform_types(is_available);

-- Enable RLS
ALTER TABLE platform_types ENABLE ROW LEVEL SECURITY;

-- Platform types are public read for all authenticated users
CREATE POLICY "Anyone can view platform types"
    ON platform_types FOR SELECT
    TO authenticated
    USING (true);

-- Apply updated_at trigger
CREATE TRIGGER update_platform_types_updated_at BEFORE UPDATE ON platform_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed platform types
INSERT INTO platform_types (type_id, name, description, category, is_available, is_beta, required_scopes) VALUES
('shopify', 'Shopify', 'Connect your Shopify store to automate inventory, orders, and marketing', 'e_commerce_platform', true, false, ARRAY['read_products', 'write_products', 'read_orders', 'read_inventory', 'write_inventory']),
('etsy', 'Etsy', 'Manage your Etsy shop listings and orders', 'marketplace', true, true, ARRAY['listings_r', 'listings_w', 'transactions_r']),
('ebay', 'eBay', 'Connect your eBay store for automated listing management', 'marketplace', true, true, ARRAY['sell.inventory', 'sell.account']),
('amazon', 'Amazon Seller Central', 'Manage your Amazon seller account', 'marketplace', false, false, ARRAY[]::text[]),
('woocommerce', 'WooCommerce', 'Connect your WooCommerce store', 'e_commerce_platform', false, false, ARRAY[]::text[]),
('printful', 'Printful', 'Sync your print-on-demand products', 'print_on_demand', false, false, ARRAY[]::text[]),
('redbubble', 'Redbubble', 'Manage your Redbubble artist shop', 'print_on_demand', false, false, ARRAY[]::text[]),
('teepublic', 'TeePublic', 'Connect your TeePublic store', 'print_on_demand', false, false, ARRAY[]::text[]),
('facebook', 'Facebook Ads', 'Manage your Facebook ad campaigns', 'advertising', false, false, ARRAY[]::text[]),
('google_ads', 'Google Ads', 'Connect Google Ads for campaign management', 'advertising', false, false, ARRAY[]::text[]);
