-- Cross-platform product links table for inventory sync
-- Links the same physical product across multiple platforms by SKU

CREATE TABLE platform_product_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sku TEXT NOT NULL,
    platform_id UUID NOT NULL REFERENCES platforms(id) ON DELETE CASCADE,
    platform_product_id TEXT NOT NULL,   -- platform's own product/listing ID
    platform_variant_id TEXT,            -- platform's variant ID if applicable
    platform_type TEXT NOT NULL,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, sku, platform_id)
);

CREATE INDEX idx_platform_product_links_user_sku ON platform_product_links(user_id, sku);
CREATE INDEX idx_platform_product_links_platform ON platform_product_links(platform_id);

ALTER TABLE platform_product_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own product links" ON platform_product_links
    FOR ALL USING (auth.uid() = user_id);

-- Inventory sync log for auditing what changed and why
CREATE TABLE inventory_sync_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sku TEXT NOT NULL,
    source_platform_type TEXT NOT NULL,
    source_platform_id UUID REFERENCES platforms(id) ON DELETE SET NULL,
    new_quantity INTEGER NOT NULL,
    synced_platforms JSONB DEFAULT '[]',  -- [{platform_type, platform_id, success, error}]
    triggered_by TEXT NOT NULL,           -- 'webhook' | 'manual'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inventory_sync_log_user ON inventory_sync_log(user_id, created_at DESC);

ALTER TABLE inventory_sync_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own sync log" ON inventory_sync_log
    FOR SELECT USING (auth.uid() = user_id);
