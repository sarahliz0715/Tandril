import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
// Publishable key (sb_publishable_...) — replaces the legacy anon key.
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  }
});

// Check if Supabase is configured
export const isSupabaseConfigured = () => {
  return !!(supabaseUrl && supabasePublishableKey);
};

console.log('🔐 Supabase Auth:', {
  configured: isSupabaseConfigured(),
  url: supabaseUrl ? '✓' : '✗'
});
