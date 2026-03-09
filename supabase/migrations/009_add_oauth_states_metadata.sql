-- Add metadata column to oauth_states for storing PKCE code_verifier and other per-platform data
ALTER TABLE oauth_states
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
