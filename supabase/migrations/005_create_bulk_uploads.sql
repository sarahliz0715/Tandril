-- Bulk Uploads Migration
-- Adds bulk_uploads table for tracking CSV/file uploads and processing

CREATE TABLE IF NOT EXISTS bulk_uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL, -- product_csv, product_images, order_spreadsheet, supplier_catalog
    file_size INTEGER,
    target_platforms TEXT[], -- Platform IDs to create products on
    processing_status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
    processing_options JSONB DEFAULT '{}', -- Auto-generate descriptions, categorize, etc.
    ai_analysis JSONB DEFAULT '{}', -- AI analysis results
    processing_results JSONB DEFAULT '{}', -- Stats: total_records, successful, failed, etc.
    error_details JSONB DEFAULT '{}', -- Detailed error information
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_bulk_uploads_user_id ON bulk_uploads(user_id);
CREATE INDEX idx_bulk_uploads_processing_status ON bulk_uploads(processing_status);
CREATE INDEX idx_bulk_uploads_created_at ON bulk_uploads(created_at DESC);

-- Enable Row Level Security
ALTER TABLE bulk_uploads ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own bulk uploads"
    ON bulk_uploads FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bulk uploads"
    ON bulk_uploads FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bulk uploads"
    ON bulk_uploads FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bulk uploads"
    ON bulk_uploads FOR DELETE
    USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_bulk_uploads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_bulk_uploads_updated_at
    BEFORE UPDATE ON bulk_uploads
    FOR EACH ROW
    EXECUTE FUNCTION update_bulk_uploads_updated_at();
