-- Compliance Requests Table
-- This table tracks GDPR and privacy law compliance webhook requests from Shopify
-- Required for Shopify App Store listing

-- Compliance Requests table - stores webhook requests for data access, deletion, and shop data removal
CREATE TABLE compliance_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_type TEXT NOT NULL, -- 'customers/data_request', 'customers/redact', 'shop/redact'
    shop_id BIGINT, -- Shopify shop ID
    shop_domain TEXT NOT NULL, -- e.g., "my-store.myshopify.com"
    customer_id BIGINT, -- Shopify customer ID (null for shop/redact)
    customer_email TEXT, -- Customer email (null for shop/redact)
    customer_phone TEXT, -- Customer phone (null for shop/redact)
    orders_requested BIGINT[], -- For customers/data_request
    orders_to_redact BIGINT[], -- For customers/redact
    data_request_id BIGINT, -- For customers/data_request
    status TEXT NOT NULL DEFAULT 'pending', -- pending, in_progress, completed, error
    error_message TEXT, -- Error details if status is 'error'
    received_at TIMESTAMPTZ NOT NULL,
    processed_at TIMESTAMPTZ, -- When action was started
    completed_at TIMESTAMPTZ, -- When action was completed
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_compliance_requests_shop_domain ON compliance_requests(shop_domain);
CREATE INDEX idx_compliance_requests_request_type ON compliance_requests(request_type);
CREATE INDEX idx_compliance_requests_status ON compliance_requests(status);
CREATE INDEX idx_compliance_requests_received_at ON compliance_requests(received_at DESC);
CREATE INDEX idx_compliance_requests_customer_email ON compliance_requests(customer_email) WHERE customer_email IS NOT NULL;

-- Apply updated_at trigger
CREATE TRIGGER update_compliance_requests_updated_at BEFORE UPDATE ON compliance_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policy
-- Note: This table is accessed by Edge Functions with service role key
-- We don't need user-level RLS, but we enable it for security
ALTER TABLE compliance_requests ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (Edge Functions use this)
CREATE POLICY "Service role has full access to compliance requests"
    ON compliance_requests
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Authenticated users cannot access compliance requests directly
-- (This is a backend-only table for compliance tracking)
CREATE POLICY "Regular users cannot access compliance requests"
    ON compliance_requests
    FOR ALL
    TO authenticated
    USING (false);
