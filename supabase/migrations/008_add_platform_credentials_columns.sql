-- Migration 008: Add missing platform columns for non-Shopify integrations
-- eBay, WooCommerce, Faire, and BigCommerce connectors use credentials (JSONB),
-- store_url, name, and status columns that were missing from the original schema.

-- Add credentials JSONB column for platforms that store multiple credential fields
-- (e.g., consumer_key/consumer_secret for WooCommerce, api_token for Faire)
ALTER TABLE platforms
  ADD COLUMN IF NOT EXISTS credentials JSONB DEFAULT NULL;

-- Add store_url as a general-purpose URL field (non-Shopify platforms use this
-- instead of shop_domain)
ALTER TABLE platforms
  ADD COLUMN IF NOT EXISTS store_url TEXT DEFAULT NULL;

-- Add name as a user-friendly display name (non-Shopify platforms use this
-- instead of shop_name)
ALTER TABLE platforms
  ADD COLUMN IF NOT EXISTS name TEXT DEFAULT NULL;

-- Add status column ('connected', 'disconnected', 'error')
ALTER TABLE platforms
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT NULL;

-- Make shop_domain nullable so non-Shopify platforms can omit it
ALTER TABLE platforms
  ALTER COLUMN shop_domain DROP NOT NULL;

-- Make access_token nullable so platforms that use credentials JSONB don't
-- require this field
ALTER TABLE platforms
  ALTER COLUMN access_token DROP NOT NULL;

-- Add index on credentials JSONB for faster JSONB lookups
CREATE INDEX IF NOT EXISTS idx_platforms_credentials ON platforms USING GIN (credentials);

-- Add index on store_url
CREATE INDEX IF NOT EXISTS idx_platforms_store_url ON platforms (store_url);
