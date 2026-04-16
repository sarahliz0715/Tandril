-- Orders and Order Items
-- Provides a platform-agnostic local copy of orders synced from all connected
-- selling channels (Shopify, Etsy, eBay, TikTok Shop, WooCommerce, etc.).
-- Orion reads from here for analytics and context; fulfillment actions write
-- back to the originating platform AND update these rows to stay in sync.

-- ─── orders ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS orders (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Source platform
  platform_type       TEXT NOT NULL,          -- 'shopify', 'etsy', 'ebay', 'tiktok_shop', 'woocommerce', etc.
  platform_order_id   TEXT NOT NULL,          -- the order/receipt ID on the originating platform
  order_number        TEXT,                   -- human-readable (e.g. "#1042", Etsy receipt_id)

  -- Status
  status              TEXT NOT NULL DEFAULT 'pending',
    -- pending | processing | shipped | delivered | cancelled | refunded
  fulfillment_status  TEXT NOT NULL DEFAULT 'unfulfilled',
    -- unfulfilled | partial | fulfilled

  -- Customer
  customer_name       TEXT,
  customer_email      TEXT,
  shipping_address    JSONB,                  -- { name, address1, address2, city, province, zip, country }

  -- Financials
  subtotal            NUMERIC(10,2) DEFAULT 0,
  total_price         NUMERIC(10,2) DEFAULT 0,
  currency            TEXT DEFAULT 'USD',

  -- Line items stored denormalized for fast reads by Orion
  -- Each item: { title, sku, quantity, unit_price, total_price, variant_title, image_url }
  line_items          JSONB DEFAULT '[]',

  -- Shipping / fulfillment
  tracking_number     TEXT,
  tracking_company    TEXT,
  shipped_at          TIMESTAMPTZ,

  -- Meta
  notes               TEXT,
  tags                TEXT,
  order_date          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate rows if sync runs twice
  UNIQUE (user_id, platform_type, platform_order_id)
);

CREATE INDEX IF NOT EXISTS idx_orders_user_date
  ON orders(user_id, order_date DESC);

CREATE INDEX IF NOT EXISTS idx_orders_user_status
  ON orders(user_id, status);

CREATE INDEX IF NOT EXISTS idx_orders_user_platform
  ON orders(user_id, platform_type);

-- ─── order_items ──────────────────────────────────────────────────────────────
-- Normalised line items for queries like "how many units of X sold this month?"

CREATE TABLE IF NOT EXISTS order_items (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id              UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform_type         TEXT,
  product_title         TEXT NOT NULL DEFAULT '',
  sku                   TEXT,
  quantity              INTEGER DEFAULT 1,
  unit_price            NUMERIC(10,2) DEFAULT 0,
  total_price           NUMERIC(10,2) DEFAULT 0,
  variant_title         TEXT,
  platform_product_id   TEXT,
  image_url             TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order
  ON order_items(order_id);

CREATE INDEX IF NOT EXISTS idx_order_items_user_sku
  ON order_items(user_id, sku);

-- ─── updated_at trigger ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_orders_updated_at ON orders;
CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_orders_updated_at();

-- ─── Row-Level Security ───────────────────────────────────────────────────────

ALTER TABLE orders       ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own orders"
  ON orders FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own order_items"
  ON order_items FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
