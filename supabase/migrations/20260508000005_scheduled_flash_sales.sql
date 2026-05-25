-- scheduled_flash_sales: queue of future sales set via flash_sale action with start_at
CREATE TABLE IF NOT EXISTS scheduled_flash_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  discount_percent NUMERIC(5,2) NOT NULL,
  duration_hours NUMERIC(10,2) NOT NULL,
  platforms TEXT[] NOT NULL,
  skus TEXT[],                          -- null = all products
  start_at TIMESTAMPTZ NOT NULL,
  started_at TIMESTAMPTZ,              -- null = pending
  cancelled_at TIMESTAMPTZ,
  flash_sale_id UUID,                  -- set when started, links to scheduled_restores
  start_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE scheduled_flash_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own scheduled flash sales"
  ON scheduled_flash_sales FOR ALL USING (auth.uid() = user_id);

CREATE INDEX scheduled_flash_sales_pending_idx
  ON scheduled_flash_sales (start_at)
  WHERE started_at IS NULL AND cancelled_at IS NULL;
