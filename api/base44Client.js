import { createClient } from '@base44/sdk';
// import { getAccessToken } from '@base44/sdk/utils/auth-utils';

// Check if running in standalone mode (e.g., Vercel without Base44 auth)
const isStandaloneMode = import.meta.env.VITE_STANDALONE_MODE === 'true';

// Create a client with conditional authentication
export const base44 = createClient({
  appId: "68a3236e6b961b3c35fd1bbc",
  requiresAuth: !isStandaloneMode // Only require auth if NOT in standalone mode
});
