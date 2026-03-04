-- Extended Platform Types: Wix, Squarespace, Ecwid, Magento, Square, TikTok, Amazon, Walmart, and more
-- All platforms listed here have public developer APIs available for integration.
-- NOTE: API credentials (client_id, client_secret, redirect URIs) must be added to Supabase
--       environment secrets before each platform's OAuth flow can go live.

INSERT INTO platform_types (type_id, name, category, description, logo_url, is_active, requires_oauth)
VALUES

-- ─── E-Commerce Platforms ──────────────────────────────────────────────────
(
    'wix',
    'Wix',
    'ecommerce',
    'Connect your Wix store. Sync products, orders, and inventory via the Wix Headless / REST API.',
    'https://www.wix.com/favicon.ico',
    true,
    true
),
(
    'squarespace',
    'Squarespace',
    'ecommerce',
    'Connect your Squarespace Commerce store to manage products, orders, and inventory.',
    'https://static1.squarespace.com/static/ta/5134cbefe4b0c6fb04df8065/10515/assets/favicon.ico',
    true,
    true
),
(
    'ecwid',
    'Ecwid by Lightspeed',
    'ecommerce',
    'Developer-friendly REST API for products, orders, and inventory. Great for third-party automation.',
    'https://www.ecwid.com/favicon.ico',
    true,
    true
),
(
    'magento',
    'Magento / Adobe Commerce',
    'ecommerce',
    'Enterprise-grade REST and GraphQL API. One of the most integration-friendly platforms.',
    'https://business.adobe.com/favicon.ico',
    true,
    true
),
(
    'prestashop',
    'PrestaShop',
    'ecommerce',
    'Open-source platform with a full REST API for products, orders, customers, and inventory.',
    'https://www.prestashop.com/favicon.ico',
    true,
    false
),
(
    'shopware',
    'Shopware',
    'ecommerce',
    'Modern REST API, popular in Europe. Full product, order, and inventory management.',
    'https://www.shopware.com/favicon.ico',
    true,
    true
),
(
    'shift4shop',
    '3dcart / Shift4Shop',
    'ecommerce',
    'REST API for orders, products, and inventory. Formerly 3dcart.',
    'https://www.shift4shop.com/favicon.ico',
    true,
    true
),
(
    'volusion',
    'Volusion',
    'ecommerce',
    'API access for products, orders, and customers. Older but functional REST API.',
    'https://www.volusion.com/favicon.ico',
    true,
    true
),
(
    'salesforce_commerce',
    'Salesforce Commerce Cloud',
    'ecommerce',
    'Enterprise B2C Commerce API. Full integration for large-scale retail operations.',
    'https://www.salesforce.com/favicon.ico',
    true,
    true
),
(
    'weebly',
    'Weebly / Square Online',
    'ecommerce',
    'Integrated with Square ecosystem. API access through Square''s commerce platform.',
    'https://www.weebly.com/favicon.ico',
    true,
    true
),

-- ─── Point of Sale / Omnichannel ───────────────────────────────────────────
(
    'square',
    'Square Online',
    'ecommerce',
    'Full public API covering orders, inventory, and catalog. Unified POS + online commerce.',
    'https://squareup.com/favicon.ico',
    true,
    true
),

-- ─── Social Commerce ───────────────────────────────────────────────────────
(
    'tiktok_shop',
    'TikTok Shop',
    'social',
    'Seller API for managing products, orders, and promotions directly through TikTok Shop.',
    'https://www.tiktok.com/favicon.ico',
    true,
    true
),
(
    'meta_ads',
    'Facebook / Meta Ads',
    'advertising',
    'Meta Commerce and Ads API for catalog management, ad campaigns, and performance tracking.',
    'https://www.facebook.com/favicon.ico',
    true,
    true
),

-- ─── Marketplaces ──────────────────────────────────────────────────────────
(
    'amazon',
    'Amazon',
    'marketplace',
    'Amazon Selling Partner API (SP-API) for inventory, orders, listings, and FBA management.',
    'https://www.amazon.com/favicon.ico',
    true,
    true
),
(
    'walmart',
    'Walmart Marketplace',
    'marketplace',
    'Walmart Marketplace API for product listings, inventory, orders, and fulfillment.',
    'https://www.walmart.com/favicon.ico',
    true,
    true
),
(
    'wish',
    'Wish',
    'marketplace',
    'Wish Merchant API for product listings, orders, and inventory updates.',
    'https://www.wish.com/favicon.ico',
    true,
    true
),
(
    'temu',
    'Temu',
    'marketplace',
    'Temu seller platform integration. API availability limited — partner application required.',
    'https://www.temu.com/favicon.ico',
    false,
    true
),

-- ─── Wholesale / B2B ───────────────────────────────────────────────────────
(
    'fashiongo',
    'FashionGo',
    'wholesale',
    'Wholesale fashion marketplace with integration API used by ERPs. Focused on B2B fashion.',
    'https://www.fashiongo.net/favicon.ico',
    true,
    true
),
(
    'joor',
    'JOOR',
    'wholesale',
    'Brand Integration API for wholesale fashion. Gated — requires partner application to access.',
    'https://www.joorconnect.com/favicon.ico',
    false,
    true
),
(
    'wizcommerce',
    'WizCommerce',
    'wholesale',
    'B2B wholesale platform with custom integrations. API-friendly with 48-hour custom build turnaround.',
    'https://www.wizcommerce.com/favicon.ico',
    true,
    true
)

ON CONFLICT (type_id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();
