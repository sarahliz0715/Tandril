import { createClient } from '@base44/sdk';
import { mockFunctions, mockAuth, createMockEntities } from './mockData';
import { isSupabaseConfigured } from './supabaseClient';
import { supabaseFunctions } from './supabaseFunctions';
// import { getAccessToken } from '@base44/sdk/utils/auth-utils';

// Check if running in standalone mode (e.g., Vercel without Base44 auth)
// Default to standalone mode (true) unless explicitly set to false
const standaloneEnv = import.meta.env.VITE_STANDALONE_MODE;
const isStandaloneMode = standaloneEnv !== 'false' && standaloneEnv !== false;

// Check if Supabase is configured
const hasSupabase = isSupabaseConfigured();

// Debug logging (will show in browser console)
console.log('🔍 Tandril Mode Check:', {
  env: standaloneEnv,
  isStandaloneMode,
  hasSupabase,
  functionProvider: hasSupabase ? 'Supabase Edge Functions' : isStandaloneMode ? 'Mock' : 'Base44',
  requiresAuth: !isStandaloneMode
});

// Create a client with conditional authentication
const client = createClient({
  appId: "68a3236e6b961b3c35fd1bbc",
  requiresAuth: !isStandaloneMode // Only require auth if NOT in standalone mode
});

// Configure functions based on available backend
if (hasSupabase) {
  // Use Supabase Edge Functions when Supabase is configured
  client.functions = supabaseFunctions;
  console.log('✅ Supabase Edge Functions attached to base44 client');
} else if (isStandaloneMode) {
  // Use mock functions in standalone mode without Supabase
  if (!client.functions) {
    client.functions = mockFunctions;
    console.log('✅ Mock functions attached to base44 client');
  } else if (!client.functions.invoke) {
    client.functions.invoke = mockFunctions.invoke;
    console.log('✅ Mock invoke method attached to base44.functions');
  }

  // Mock auth
  if (!client.auth) {
    client.auth = mockAuth;
    console.log('✅ Mock auth attached to base44 client');
  } else {
    client.auth = { ...client.auth, ...mockAuth };
    console.log('✅ Mock auth methods merged with base44.auth');
  }

  // Mock entities
  if (!client.entities) {
    client.entities = createMockEntities();
    console.log('✅ Mock entities attached to base44 client');
  } else {
    client.entities = { ...client.entities, ...createMockEntities() };
    console.log('✅ Mock entities merged with base44.entities');
  }
}

export const base44 = client;
