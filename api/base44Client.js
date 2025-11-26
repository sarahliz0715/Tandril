import { createClient } from '@base44/sdk';
import { mockFunctions, mockAuth } from './mockData';
// import { getAccessToken } from '@base44/sdk/utils/auth-utils';

// Check if running in standalone mode (e.g., Vercel without Base44 auth)
// Default to standalone mode (true) unless explicitly set to false
const standaloneEnv = import.meta.env.VITE_STANDALONE_MODE;
const isStandaloneMode = standaloneEnv !== 'false' && standaloneEnv !== false;

// Debug logging (will show in browser console)
console.log('🔍 Tandril Mode Check:', {
  env: standaloneEnv,
  isStandaloneMode,
  requiresAuth: !isStandaloneMode
});

// Create a client with conditional authentication
const client = createClient({
  appId: "68a3236e6b961b3c35fd1bbc",
  requiresAuth: !isStandaloneMode // Only require auth if NOT in standalone mode
});

// In standalone mode, ensure functions and auth are available with mock implementations
if (isStandaloneMode) {
  // Mock functions
  if (!client.functions) {
    client.functions = mockFunctions;
    console.log('✅ Mock functions attached to base44 client');
  } else if (!client.functions.invoke) {
    // If functions exists but doesn't have invoke, add it
    client.functions.invoke = mockFunctions.invoke;
    console.log('✅ Mock invoke method attached to base44.functions');
  }

  // Mock auth
  if (!client.auth) {
    client.auth = mockAuth;
    console.log('✅ Mock auth attached to base44 client');
  } else {
    // Override auth methods with mocks
    client.auth = { ...client.auth, ...mockAuth };
    console.log('✅ Mock auth methods merged with base44.auth');
  }
}

export const base44 = client;
