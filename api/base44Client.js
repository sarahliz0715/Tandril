import { createClient } from '@base44/sdk';
// import { getAccessToken } from '@base44/sdk/utils/auth-utils';

// Create a client with authentication required
export const base44 = createClient({
  appId: "68a3236e6b961b3c35fd1bbc", 
  requiresAuth: true // Ensure authentication is required for all operations
});
