import { createClient } from '@base44/sdk';
import { mockFunctions, mockAuth, createMockEntities } from './mockData';
import { isSupabaseConfigured } from './supabaseClient';
import { supabaseFunctions } from './supabaseFunctions';
import { createSupabaseEntities } from './supabaseEntities';
import { supabaseAuthService } from './supabaseAuth';
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

// Create client based on configuration
let client;

if (hasSupabase) {
  // When using Supabase, create a minimal client object without calling base44 SDK
  // This prevents the 404 error from base44 trying to connect

  // Create mock integrations for Supabase mode
  const mockIntegrations = {
    Core: {
      InvokeLLM: async (params) => {
        console.warn('[Supabase Mode] InvokeLLM not implemented yet');
        return { data: { response: 'Mock LLM response' } };
      },
      SendEmail: async (params) => {
        console.warn('[Supabase Mode] SendEmail not implemented yet');
        return { data: { success: true } };
      },
      UploadFile: async (file) => {
        console.warn('[Supabase Mode] UploadFile not implemented yet');
        return { data: { url: 'mock-file-url' } };
      },
      GenerateImage: async (params) => {
        console.warn('[Supabase Mode] GenerateImage not implemented yet');
        return { data: { url: 'mock-image-url' } };
      },
      ExtractDataFromUploadedFile: async (params) => {
        console.warn('[Supabase Mode] ExtractDataFromUploadedFile not implemented yet');
        return { data: {} };
      },
      CreateFileSignedUrl: async (params) => {
        console.warn('[Supabase Mode] CreateFileSignedUrl not implemented yet');
        return { data: { url: 'mock-signed-url' } };
      },
      UploadPrivateFile: async (file) => {
        console.warn('[Supabase Mode] UploadPrivateFile not implemented yet');
        return { data: { url: 'mock-private-file-url' } };
      },
    }
  };

  client = {
    functions: supabaseFunctions,
    auth: supabaseAuthService,
    entities: createSupabaseEntities(),
    integrations: mockIntegrations
  };
  console.log('✅ Supabase Edge Functions attached to base44 client');
  console.log('✅ Supabase entities attached to base44 client');
} else if (isStandaloneMode) {
  // In standalone mode, create base44 client but override with mocks
  client = createClient({
    appId: "68a3236e6b961b3c35fd1bbc",
    requiresAuth: false
  });
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
} else {
  // Real Base44 mode
  client = createClient({
    appId: "68a3236e6b961b3c35fd1bbc",
    requiresAuth: true
  });
  console.log('✅ Using Base44 backend');
}

export const base44 = client;
