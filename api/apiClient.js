/**
 * Tandril Backend API Client
 *
 * Replaces Base44 SDK with direct API calls to standalone backend
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for authentication
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase = null;
if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

// Backend API base URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

/**
 * Make authenticated API request
 */
async function fetchAPI(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add auth token if available
  if (supabase) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
  }

  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || error.message || 'API request failed');
  }

  const data = await response.json();
  return data.data || data;
}

/**
 * Auth API
 */
export const auth = {
  supabase, // Expose Supabase client

  async isAuthenticated() {
    if (!supabase) return false;
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
  },

  async me() {
    return fetchAPI('/api/auth/me');
  },

  async updateMe(updates) {
    return fetchAPI('/api/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  async signUp(email, password, metadata = {}) {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    });
    if (error) throw error;
    return data;
  },

  async signIn(email, password) {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    if (!supabase) throw new Error('Supabase not configured');
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  redirectToLogin(returnUrl) {
    window.location.href = `/login?returnUrl=${encodeURIComponent(returnUrl || window.location.pathname)}`;
  },
};

/**
 * Entity CRUD helpers
 */
function createEntityAPI(entityPath) {
  return {
    async list(orderBy = '-created_date') {
      return fetchAPI(`${entityPath}?orderBy=${orderBy}`);
    },

    async get(id) {
      return fetchAPI(`${entityPath}/${id}`);
    },

    async create(data) {
      return fetchAPI(entityPath, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async update(id, data) {
      return fetchAPI(`${entityPath}/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },

    async delete(id) {
      return fetchAPI(`${entityPath}/${id}`, {
        method: 'DELETE',
      });
    },

    async filter(filters) {
      const query = new URLSearchParams(filters).toString();
      return fetchAPI(`${entityPath}?${query}`);
    },
  };
}

/**
 * Entities API
 */
export const entities = {
  Platform: createEntityAPI('/api/platforms'),
  Product: createEntityAPI('/api/products'),
  Listing: createEntityAPI('/api/listings'),
  InventoryItem: createEntityAPI('/api/inventory'),
  Automation: createEntityAPI('/api/automations'),
  AICommand: createEntityAPI('/api/commands'),
  AdCampaign: createEntityAPI('/api/ads/campaigns'),
  Alert: createEntityAPI('/api/alerts'),

  // Mock entities for features not yet implemented
  SavedCommand: createEntityAPI('/api/commands/saved'),
  AIWorkflow: createEntityAPI('/api/workflows'),
  MarketIntelligence: createEntityAPI('/api/intelligence'),
  Order: createEntityAPI('/api/orders'),
  BetaInvite: createEntityAPI('/api/beta/invites'),
  SupportTicket: createEntityAPI('/api/support/tickets'),
  Subscription: createEntityAPI('/api/billing/subscriptions'),
  CustomAlert: createEntityAPI('/api/alerts/custom'),
};

/**
 * Functions API (invokable backend functions)
 */
export const functions = {
  async invoke(functionName, params = {}) {
    // Map function names to API endpoints
    const functionMap = {
      // Shopify
      'initiateShopifyAuth': (data) => {
        const query = new URLSearchParams({ shop: data.shop }).toString();
        return fetchAPI(`/api/shopify/auth/start?${query}`);
      },
      'handleShopifyCallback': (data) => {
        const query = new URLSearchParams(data).toString();
        return fetchAPI(`/api/shopify/auth/callback?${query}`);
      },
      'syncShopifyProducts': (data) => fetchAPI('/api/shopify/sync', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

      // Commands
      'interpretCommand': (data) => fetchAPI('/api/commands/interpret', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
      'executeCommand': (data) => fetchAPI('/api/commands', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

      // Listings
      'checkListingHealth': (data) => fetchAPI('/api/listings/health-check-all', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

      // Automations
      'evaluateTriggers': (data) => fetchAPI('/api/automations/evaluate-triggers', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
      'executeAutomation': (data) => fetchAPI(`/api/automations/${data.automationId}/execute`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

      // Ads
      'createFacebookCampaign': (data) => fetchAPI('/api/ads/campaigns', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

      // Intelligence
      'generateMarketIntelligence': (data) => fetchAPI('/api/intelligence/generate', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

      // Beta/Support
      'sendBetaInvite': (data) => fetchAPI('/api/beta/invites', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
      'sendSupportRequest': (data) => fetchAPI('/api/support/tickets', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    };

    const handler = functionMap[functionName];
    if (handler) {
      return handler(params);
    }

    // Fallback: try to invoke as generic function
    console.warn(`Function ${functionName} not mapped, using generic invoke`);
    return fetchAPI('/api/functions/invoke', {
      method: 'POST',
      body: JSON.stringify({ function: functionName, params }),
    });
  },
};

/**
 * Integrations API
 */
export const integrations = {
  Core: {
    async InvokeLLM(params) {
      return fetchAPI('/api/integrations/llm', {
        method: 'POST',
        body: JSON.stringify(params),
      });
    },

    async GenerateImage(params) {
      return fetchAPI('/api/integrations/image', {
        method: 'POST',
        body: JSON.stringify(params),
      });
    },

    async SendEmail(params) {
      return fetchAPI('/api/integrations/email', {
        method: 'POST',
        body: JSON.stringify(params),
      });
    },
  },
};

/**
 * Main API client export
 */
export const apiClient = {
  auth,
  entities,
  functions,
  integrations,
};

export default apiClient;
