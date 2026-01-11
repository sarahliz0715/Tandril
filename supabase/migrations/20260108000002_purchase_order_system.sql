-- Purchase Order System for Inventory Management
-- Allows users to track suppliers, create POs, and manage inventory restocking

-- =============================================
-- SUPPLIERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    contact_name TEXT,
    email TEXT,
    phone TEXT,
    website TEXT,
    address TEXT,
    notes TEXT,
    lead_time_days INTEGER DEFAULT 7, -- Default 1 week lead time
    minimum_order_amount DECIMAL(10,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PRODUCT SUPPLIERS TABLE
-- =============================================
-- Links products to suppliers with pricing info
CREATE TABLE IF NOT EXISTS product_suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL, -- Shopify product ID or internal SKU
    product_name TEXT NOT NULL,
    sku TEXT,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    supplier_sku TEXT, -- Supplier's SKU for this product
    cost_per_unit DECIMAL(10,2) NOT NULL,
    minimum_order_quantity INTEGER DEFAULT 1,
    is_primary BOOLEAN DEFAULT false, -- Primary supplier for this product
    last_ordered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, supplier_id)
);

-- =============================================
-- PURCHASE ORDERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    po_number TEXT NOT NULL, -- User-friendly PO number (e.g., PO-2026-001)
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'draft', -- draft, sent, confirmed, received, cancelled
    total_cost DECIMAL(10,2) DEFAULT 0,
    expected_delivery_date DATE,
    actual_delivery_date DATE,
    notes TEXT,
    shipping_cost DECIMAL(10,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    payment_terms TEXT, -- e.g., "Net 30", "COD", "Prepaid"
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    confirmed_at TIMESTAMPTZ,
    received_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    UNIQUE(user_id, po_number)
);

-- =============================================
-- PURCHASE ORDER ITEMS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL, -- Shopify product ID
    product_name TEXT NOT NULL,
    sku TEXT,
    quantity_ordered INTEGER NOT NULL,
    quantity_received INTEGER DEFAULT 0,
    cost_per_unit DECIMAL(10,2) NOT NULL,
    line_total DECIMAL(10,2) GENERATED ALWAYS AS (quantity_ordered * cost_per_unit) STORED,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_suppliers_user_id ON suppliers(user_id);
CREATE INDEX idx_suppliers_is_active ON suppliers(is_active);
CREATE INDEX idx_product_suppliers_user_id ON product_suppliers(user_id);
CREATE INDEX idx_product_suppliers_product_id ON product_suppliers(product_id);
CREATE INDEX idx_product_suppliers_supplier_id ON product_suppliers(supplier_id);
CREATE INDEX idx_purchase_orders_user_id ON purchase_orders(user_id);
CREATE INDEX idx_purchase_orders_supplier_id ON purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX idx_purchase_orders_po_number ON purchase_orders(po_number);
CREATE INDEX idx_purchase_order_items_po_id ON purchase_order_items(po_id);
CREATE INDEX idx_purchase_order_items_product_id ON purchase_order_items(product_id);

-- =============================================
-- TRIGGERS
-- =============================================
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_suppliers_updated_at BEFORE UPDATE ON product_suppliers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON purchase_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchase_order_items_updated_at BEFORE UPDATE ON purchase_order_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

-- Suppliers policies
CREATE POLICY "Users can view their own suppliers"
    ON suppliers FOR SELECT
    USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own suppliers"
    ON suppliers FOR INSERT
    WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own suppliers"
    ON suppliers FOR UPDATE
    USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own suppliers"
    ON suppliers FOR DELETE
    USING ((select auth.uid()) = user_id);

-- Product suppliers policies
CREATE POLICY "Users can view their own product suppliers"
    ON product_suppliers FOR SELECT
    USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own product suppliers"
    ON product_suppliers FOR INSERT
    WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own product suppliers"
    ON product_suppliers FOR UPDATE
    USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own product suppliers"
    ON product_suppliers FOR DELETE
    USING ((select auth.uid()) = user_id);

-- Purchase orders policies
CREATE POLICY "Users can view their own purchase orders"
    ON purchase_orders FOR SELECT
    USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own purchase orders"
    ON purchase_orders FOR INSERT
    WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own purchase orders"
    ON purchase_orders FOR UPDATE
    USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own purchase orders"
    ON purchase_orders FOR DELETE
    USING ((select auth.uid()) = user_id);

-- Purchase order items policies (via PO ownership)
CREATE POLICY "Users can view their purchase order items"
    ON purchase_order_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM purchase_orders
            WHERE purchase_orders.id = purchase_order_items.po_id
            AND purchase_orders.user_id = (select auth.uid())
        )
    );

CREATE POLICY "Users can insert purchase order items"
    ON purchase_order_items FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM purchase_orders
            WHERE purchase_orders.id = purchase_order_items.po_id
            AND purchase_orders.user_id = (select auth.uid())
        )
    );

CREATE POLICY "Users can update their purchase order items"
    ON purchase_order_items FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM purchase_orders
            WHERE purchase_orders.id = purchase_order_items.po_id
            AND purchase_orders.user_id = (select auth.uid())
        )
    );

CREATE POLICY "Users can delete their purchase order items"
    ON purchase_order_items FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM purchase_orders
            WHERE purchase_orders.id = purchase_order_items.po_id
            AND purchase_orders.user_id = (select auth.uid())
        )
    );

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to generate next PO number
CREATE OR REPLACE FUNCTION generate_po_number(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_year TEXT;
    v_count INTEGER;
    v_po_number TEXT;
BEGIN
    v_year := TO_CHAR(NOW(), 'YYYY');

    -- Get count of POs for this user this year
    SELECT COUNT(*) INTO v_count
    FROM purchase_orders
    WHERE user_id = p_user_id
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());

    v_po_number := 'PO-' || v_year || '-' || LPAD((v_count + 1)::TEXT, 3, '0');

    RETURN v_po_number;
END;
$$ LANGUAGE plpgsql;

-- Function to update PO total when items change
CREATE OR REPLACE FUNCTION update_po_total()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE purchase_orders
    SET total_cost = (
        SELECT COALESCE(SUM(line_total), 0)
        FROM purchase_order_items
        WHERE po_id = COALESCE(NEW.po_id, OLD.po_id)
    )
    WHERE id = COALESCE(NEW.po_id, OLD.po_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update PO total
CREATE TRIGGER update_po_total_on_item_change
    AFTER INSERT OR UPDATE OR DELETE ON purchase_order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_po_total();
