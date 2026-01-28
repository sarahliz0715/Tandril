-- Add WooCommerce, BigCommerce, and Faire platform types
-- These platforms are now fully functional with Edge Functions

INSERT INTO platform_types (type_id, name, category, description, logo_url, is_active, requires_oauth)
VALUES
(
    'woocommerce',
    'WooCommerce',
    'ecommerce',
    'Connect your WooCommerce store to sync products, orders, and inventory. Perfect for WordPress-based stores.',
    'https://woocommerce.com/wp-content/themes/woo/images/logo-woocommerce.svg',
    true,
    false
),
(
    'bigcommerce',
    'BigCommerce',
    'ecommerce',
    'Connect your BigCommerce store for enterprise-grade e-commerce automation and AI-powered optimization.',
    'https://www.bigcommerce.com/assets/images/bc-logo.svg',
    true,
    false
),
(
    'faire',
    'Faire',
    'ecommerce',
    'Connect your Faire wholesale brand to manage retailers, products, and bulk orders efficiently.',
    'https://cdn.faire.com/static/favicon/faire-logo.svg',
    true,
    false
)
ON CONFLICT (type_id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    logo_url = EXCLUDED.logo_url,
    is_active = EXCLUDED.is_active,
    requires_oauth = EXCLUDED.requires_oauth,
    updated_at = NOW();
