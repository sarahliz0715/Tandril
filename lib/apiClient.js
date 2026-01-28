// Tandril API Client
// Unified client interface for functions, auth, and entities
// Uses Supabase in production, mocks in development/standalone mode

import { mockFunctions, mockAuth, createMockEntities } from './mockData';
import { isSupabaseConfigured } from './supabaseClient';
import { supabaseFunctions } from './supabaseFunctions';
import { createSupabaseEntities } from './supabaseEntities';
import { supabaseAuthService } from './supabaseAuth';
import logger from '@/utils/logger';

// Check if running in standalone mode (without Supabase)
const standaloneEnv = import.meta.env.VITE_STANDALONE_MODE;
const isStandaloneMode = standaloneEnv !== 'false' && standaloneEnv !== false;

// Check if Supabase is configured
const hasSupabase = isSupabaseConfigured();

// Debug logging
logger.dev('🔍 Tandril Client Mode:', {
  env: standaloneEnv,
  isStandaloneMode,
  hasSupabase,
  functionProvider: hasSupabase ? 'Supabase Edge Functions' : 'Mock',
  authProvider: hasSupabase ? 'Supabase Auth' : 'Mock',
  entityProvider: hasSupabase ? 'Supabase PostgreSQL' : 'Mock'
});

// Create mock integrations (placeholder for future platform integrations)
const mockIntegrations = {
  Core: {
    InvokeLLM: async (params) => {
      logger.warn('[Tandril] InvokeLLM integration not implemented yet');
      return { data: { response: 'Mock LLM response' } };
    },
    SendEmail: async (params) => {
      logger.warn('[Tandril] SendEmail integration not implemented yet');
      return { data: { success: true } };
    },
    UploadFile: async (file) => {
      logger.warn('[Tandril] UploadFile integration not implemented yet');
      return { data: { url: 'mock-file-url' } };
    },
    GenerateImage: async (params) => {
      logger.warn('[Tandril] GenerateImage integration not implemented yet');
      return { data: { url: 'mock-image-url' } };
    },
    ExtractDataFromUploadedFile: async (params) => {
      logger.warn('[Tandril] ExtractDataFromUploadedFile integration not implemented yet');
      return { data: {} };
    },
    CreateFileSignedUrl: async (params) => {
      logger.warn('[Tandril] CreateFileSignedUrl integration not implemented yet');
      return { data: { url: 'mock-signed-url' } };
    },
    UploadPrivateFile: async (file) => {
      logger.warn('[Tandril] UploadPrivateFile integration not implemented yet');
      return { data: { url: 'mock-private-file-url' } };
    },
  }
};

// Create unified client interface
let client;

if (hasSupabase) {
  // Production mode: Use Supabase for everything
  client = {
    functions: supabaseFunctions,
    auth: supabaseAuthService,
    entities: createSupabaseEntities(),
    integrations: mockIntegrations
  };
  logger.dev('✅ Tandril Client initialized with Supabase backend');
} else {
  // Standalone/development mode: Use mocks
  client = {
    functions: mockFunctions,
    auth: mockAuth,
    entities: createMockEntities(),
    integrations: mockIntegrations
  };
  logger.dev('✅ Tandril Client initialized with mock backend');
}

// Export unified API client
export const api = client;
