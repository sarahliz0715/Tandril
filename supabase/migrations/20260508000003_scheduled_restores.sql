-- scheduled_restores: tracks prices/promotions set by flash sales for automatic restoration
CREATE TABLE IF NOT EXISTS scheduled_restores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  flash_sale_id UUID NOT NULL,          -- groups all rows from one flash_sale action
  platform_id UUID,                     -- references platforms table
  platform_type TEXT NOT NULL,          -- 'shopify' | 'woocommerce' | 'etsy' | 'ebay'
  restore_type TEXT NOT NULL DEFAULT 'price',  -- 'price' | 'woo_sale_price' | 'end_promotion'
  platform_product_id TEXT,             -- product/listing ID on the platform
  platform_variant_id TEXT,             -- variant ID (Shopify)
  product_name TEXT,
  sku TEXT,
  original_price NUMERIC(10,2),         -- price before flash sale (null for promotions)
  sale_price NUMERIC(10,2),             -- price during flash sale
  promotion_id TEXT,                    -- eBay promotion ID (restore_type = 'end_promotion')
  restore_at TIMESTAMPTZ NOT NULL,      -- scheduled restore time
  restored_at TIMESTAMPTZ,             -- null = pending; set when restore completes
  restore_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE scheduled_restores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own scheduled restores"
  ON scheduled_restores FOR ALL USING (auth.uid() = user_id);

-- Fast lookup for the cron job: pending restores due now
CREATE INDEX scheduled_restores_pending_idx
  ON scheduled_restores (restore_at)
  WHERE restored_at IS NULL;
