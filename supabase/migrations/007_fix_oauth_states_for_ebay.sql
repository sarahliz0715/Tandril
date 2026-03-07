-- Fix oauth_states table to support multiple platforms (not just Shopify)
-- Makes shop_domain optional and adds a platform column

ALTER TABLE oauth_states
    ALTER COLUMN shop_domain DROP NOT NULL;

ALTER TABLE oauth_states
    ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'shopify';

-- Update existing Shopify rows to have platform set
UPDATE oauth_states SET platform = 'shopify' WHERE platform IS NULL;
