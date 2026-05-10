import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const REMEMBER_ME_KEY = 'tandril_remember_me';

// Custom storage: writes to localStorage when "remember me" is on, sessionStorage otherwise.
// getItem checks both so existing sessions are found regardless of where they were saved.
const supabaseStorage = {
  getItem: (key) => localStorage.getItem(key) ?? sessionStorage.getItem(key),
  setItem: (key, value) => {
    if (localStorage.getItem(REMEMBER_ME_KEY) === 'true') {
      localStorage.setItem(key, value);
      sessionStorage.removeItem(key);
    } else {
      sessionStorage.setItem(key, value);
      localStorage.removeItem(key);
    }
  },
  removeItem: (key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  },
};

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: supabaseStorage,
  }
});

// Check if Supabase is configured
export const isSupabaseConfigured = () => {
  return !!(supabaseUrl && supabaseAnonKey);
};

console.log('🔐 Supabase Auth:', {
  configured: isSupabaseConfigured(),
  url: supabaseUrl ? '✓' : '✗'
});
