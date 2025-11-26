import { createClient } from '@base44/sdk';
import apiClient from './apiClient.js';

// Check if running in standalone mode (uses Tandril backend)
// Default to standalone mode (true) unless explicitly set to false
const standaloneEnv = import.meta.env.VITE_STANDALONE_MODE;
const isStandaloneMode = standaloneEnv !== 'false' && standaloneEnv !== false;

// Debug logging (will show in browser console)
console.log('🔍 Tandril Mode Check:', {
  env: standaloneEnv,
  isStandaloneMode,
  mode: isStandaloneMode ? 'Standalone Backend' : 'Base44 SDK',
  backendUrl: import.meta.env.VITE_API_BASE_URL,
});

// Export the appropriate client based on mode
export const base44 = isStandaloneMode
  ? apiClient // Use our standalone backend
  : createClient({ // Use Base44 SDK (legacy)
      appId: "68a3236e6b961b3c35fd1bbc",
      requiresAuth: true
    });
