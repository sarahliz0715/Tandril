// Supabase Edge Functions Client
// This provides a wrapper around Supabase Edge Functions for calling backend functions

import { supabase, isSupabaseConfigured } from './supabaseClient';

/**
 * Call a Supabase Edge Function
 * @param {string} functionName - Name of the Edge Function
 * @param {object} params - Parameters to pass to the function
 * @returns {Promise<any>} The function response
 */
export async function invokeEdgeFunction(functionName, params = {}) {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  }

  try {
    console.log(`[Supabase Functions] Invoking ${functionName}:`, params);

    const { data, error } = await supabase.functions.invoke(functionName, {
      body: params,
    });

    if (error) {
      console.error(`[Supabase Functions] Error from ${functionName}:`, error);
      throw new Error(error.message || `Function ${functionName} failed`);
    }

    console.log(`[Supabase Functions] Response from ${functionName}:`, data);

    // Edge functions return {success, data, error} format
    if (data && !data.success && data.error) {
      throw new Error(data.error);
    }

    return data;
  } catch (error) {
    console.error(`[Supabase Functions] Exception calling ${functionName}:`, error);
    throw error;
  }
}

/**
 * Shopify OAuth initiation
 * @param {string} storeName - Shopify store name (without .myshopify.com)
 * @returns {Promise<{authorization_url: string, shop_domain: string}>}
 */
export async function initiateShopifyAuth(storeName) {
  const response = await invokeEdgeFunction('shopify-auth-init', {
    store_name: storeName,
  });

  return response.data || response;
}

/**
 * Interpret a natural language command
 * @param {string} commandText - The command text
 * @param {string[]} platformTargets - Target platform names
 * @param {string[]} fileUrls - Optional file URLs
 * @returns {Promise<{actions: Array, confidence_score: number, warnings: string[], estimated_impact: string}>}
 */
export async function interpretCommand(commandText, platformTargets = [], fileUrls = []) {
  const response = await invokeEdgeFunction('interpret-command', {
    command_text: commandText,
    platform_targets: platformTargets,
    file_urls: fileUrls,
  });

  return response.data || response;
}

/**
 * Execute a command on connected platforms
 * @param {string} commandId - The command ID from database
 * @param {Array} actions - Array of actions to execute
 * @param {string[]} platformTargets - Target platform names
 * @returns {Promise<{results: Array}>}
 */
export async function executeCommand(commandId, actions, platformTargets) {
  const response = await invokeEdgeFunction('execute-command', {
    command_id: commandId,
    actions,
    platform_targets: platformTargets,
  });

  return response.data || response;
}

/**
 * Execute a workflow
 * @param {string} workflowId - The workflow ID
 * @param {Array} actions - Array of actions to execute
 * @param {string[]} platformTargets - Target platform names
 * @returns {Promise<{results: Array}>}
 */
export async function executeWorkflow(workflowId, actions, platformTargets) {
  const response = await invokeEdgeFunction('execute-workflow', {
    workflow_id: workflowId,
    actions,
    platform_targets: platformTargets,
  });

  return response.data || response;
}

/**
 * Run Inventory Protection automation
 * Auto-unpublishes products when inventory hits zero
 * @param {object} options - Configuration options
 * @param {number} options.threshold - Inventory threshold (default: 0)
 * @param {string} options.action - 'unpublish' or 'preorder' (default: 'unpublish')
 * @param {string} options.workflow_id - Optional workflow ID for tracking
 * @returns {Promise<{protected_count: number, platforms_processed: number, results: Array}>}
 */
export async function runInventoryProtection({ threshold = 0, action = 'unpublish', workflow_id = null } = {}) {
  const response = await invokeEdgeFunction('inventory-protection', {
    threshold,
    action,
    workflow_id,
  });

  return response.data || response;
}

/**
 * Run Price Guardrail automation
 * Monitors margins and auto-adjusts or flags when margins drop too low
 * @param {object} options - Configuration options
 * @param {number} options.min_margin_percent - Minimum acceptable margin % (default: 30)
 * @param {string} options.action - 'flag' or 'auto_adjust' (default: 'flag')
 * @param {number} options.target_margin_percent - Target margin for auto-adjust (default: 35)
 * @param {string} options.workflow_id - Optional workflow ID for tracking
 * @returns {Promise<{low_margin_count: number, adjusted_count: number, results: Array}>}
 */
export async function runPriceGuardrail({
  min_margin_percent = 30,
  action = 'flag',
  target_margin_percent = 35,
  workflow_id = null
} = {}) {
  const response = await invokeEdgeFunction('price-guardrail', {
    min_margin_percent,
    action,
    target_margin_percent,
    workflow_id,
  });

  return response.data || response;
}

/**
 * Run SEO Fixer automation
 * AI-powered SEO optimization for product titles, descriptions, and alt text
 * @param {object} options - Configuration options
 * @param {string} options.mode - 'analyze' or 'fix' (default: 'analyze')
 * @param {number} options.max_products - Maximum products to process (default: 50)
 * @param {string} options.workflow_id - Optional workflow ID for tracking
 * @returns {Promise<{analyzed_count: number, fixed_count: number, results: Array}>}
 */
export async function runSEOFixer({
  mode = 'analyze',
  max_products = 50,
  workflow_id = null
} = {}) {
  const response = await invokeEdgeFunction('seo-fixer', {
    mode,
    max_products,
    workflow_id,
  });

  return response.data || response;
}

/**
 * Run Dead Product Cleanup automation
 * Flags or unpublishes products with no sales in X days
 * @param {object} options - Configuration options
 * @param {number} options.days_inactive - Days with no sales (default: 90)
 * @param {string} options.action - 'flag' or 'unpublish' (default: 'flag')
 * @param {string} options.tag_name - Tag to add if action=flag (default: 'Dead Product')
 * @param {string} options.workflow_id - Optional workflow ID for tracking
 * @returns {Promise<{dead_products_found: number, cleaned_count: number, results: Array}>}
 */
export async function runDeadProductCleanup({
  days_inactive = 90,
  action = 'flag',
  tag_name = 'Dead Product',
  workflow_id = null
} = {}) {
  const response = await invokeEdgeFunction('dead-product-cleanup', {
    days_inactive,
    action,
    tag_name,
    workflow_id,
  });

  return response.data || response;
}

/**
 * Calculate P&L (Profit & Loss) for a date range
 * Aggregates revenue, costs, and calculates net profit across all platforms
 * @param {object} options - Configuration options
 * @param {string} options.start_date - Start date ISO string (default: 30 days ago)
 * @param {string} options.end_date - End date ISO string (default: today)
 * @param {string} options.platform_id - Optional platform ID to filter by
 * @returns {Promise<{revenue: number, cogs: number, net_profit: number, profit_margin: number, platforms: Array}>}
 */
export async function calculatePnL({
  start_date = null,
  end_date = null,
  platform_id = null
} = {}) {
  const response = await invokeEdgeFunction('calculate-pnl', {
    start_date,
    end_date,
    platform_id,
  });

  return response.data || response;
}

/**
 * Monitor orders for fulfillment issues, stuck orders, and returns
 * @param {object} options - Configuration options
 * @param {number} options.stuck_days - Days unfulfilled before flagged as stuck (default: 3)
 * @param {number} options.lookback_days - Days to look back for orders (default: 30)
 * @param {boolean} options.include_returns - Include return/refund analysis (default: true)
 * @returns {Promise<{stuck_orders: Array, fulfillment_summary: object, returns_summary: object}>}
 */
export async function monitorOrders({
  stuck_days = 3,
  lookback_days = 30,
  include_returns = true
} = {}) {
  const response = await invokeEdgeFunction('order-monitor', {
    stuck_days,
    lookback_days,
    include_returns,
  });

  return response.data || response;
}

/**
 * Generate AI-powered insights and recommendations for your store
 * Analyzes SEO, orders, pricing, inventory, and trends
 * @returns {Promise<{insights: Array, summary: object}>}
 */
export async function generateAIInsights() {
  const response = await invokeEdgeFunction('ai-insights', {});
  return response.data || response;
}

/**
 * Generate AI content for products (descriptions, titles, SEO, social, alt text)
 * @param {object} options - Configuration options
 * @param {string} options.content_type - 'description', 'title', 'meta', 'social', or 'alt_text'
 * @param {Array<string>} options.product_ids - Product IDs to generate content for
 * @param {string} options.tone - 'professional', 'casual', 'luxury', or 'playful' (default: 'professional')
 * @param {string} options.target_audience - 'general', 'b2b', 'b2c', 'youth', or 'premium' (default: 'general')
 * @param {boolean} options.apply_to_store - If true, update products in Shopify (default: false)
 * @param {string} options.platform_id - Required if apply_to_store is true
 * @returns {Promise<{results: Array, summary: object}>}
 */
export async function generateAIContent({
  content_type = 'description',
  product_ids = [],
  tone = 'professional',
  target_audience = 'general',
  apply_to_store = false,
  platform_id = null
} = {}) {
  const response = await invokeEdgeFunction('ai-content-generator', {
    content_type,
    product_ids,
    tone,
    target_audience,
    apply_to_store,
    platform_id,
  });

  return response.data || response;
}

// Enhanced Command Understanding Functions
export async function enhancedInterpretCommand({
  command_text,
  platform_targets,
  context = {},
  request_preview = true
} = {}) {
  const response = await invokeEdgeFunction('enhanced-interpret-command', {
    command_text,
    platform_targets,
    context,
    request_preview,
  });

  return response.data || response;
}

export async function enhancedExecuteCommand({
  command_id,
  actions,
  platform_targets,
  preview_mode = false,
  track_for_undo = true
} = {}) {
  const response = await invokeEdgeFunction('enhanced-execute-command', {
    command_id,
    actions,
    platform_targets,
    preview_mode,
    track_for_undo,
  });

  return response.data || response;
}

export async function undoCommand(command_id) {
  const response = await invokeEdgeFunction('undo-command', {
    command_id,
  });

  return response.data || response;
}

// Smart Automation Trigger Functions
export async function evaluateSmartTrigger({
  automation_id,
  trigger_type,
  context = {}
} = {}) {
  const response = await invokeEdgeFunction('smart-trigger-evaluator', {
    automation_id,
    trigger_type,
    context,
  });

  return response.data || response;
}

export async function intelligentScheduler({
  mode = 'analyze'
} = {}) {
  const response = await invokeEdgeFunction('intelligent-scheduler', {
    mode,
  });

  return response.data || response;
}

export async function trackAutomationPerformance({
  automation_id,
  success_rate,
  execution_time_ms,
  items_affected,
  errors_encountered = [],
  metrics = {},
  trigger_context = {}
} = {}) {
  const response = await invokeEdgeFunction('track-automation-performance', {
    automation_id,
    success_rate,
    execution_time_ms,
    items_affected,
    errors_encountered,
    metrics,
    trigger_context,
  });

  return response.data || response;
}

// AI Business Coach Functions
export async function getDailyBriefing({
  date = new Date().toISOString().split('T')[0]
} = {}) {
  const response = await invokeEdgeFunction('daily-business-briefing', {
    date,
  });

  return response.data || response;
}

export async function detectGrowthOpportunities() {
  const response = await invokeEdgeFunction('growth-opportunity-detector', {});

  return response.data || response;
}

export async function analyzeRisks() {
  const response = await invokeEdgeFunction('risk-alert-analyzer', {});

  return response.data || response;
}

export async function chatWithCoach({
  message,
  conversation_history = [],
  uploaded_files = []
} = {}) {
  const response = await invokeEdgeFunction('ai-coach-chat', {
    message,
    conversation_history,
    uploaded_files,
  });

  return response.data || response;
}

// Onboarding Functions
export async function analyzeStoreForOnboarding({
  platform_id
} = {}) {
  const response = await invokeEdgeFunction('onboarding-store-analyzer', {
    platform_id,
  });

  return response.data || response;
}

// Platform Connection Functions
export async function connectWooCommerce({
  store_url,
  consumer_key,
  consumer_secret
} = {}) {
  const response = await invokeEdgeFunction('woocommerce-connect', {
    store_url,
    consumer_key,
    consumer_secret,
  });

  return { data: response };
}

export async function connectBigCommerce({
  store_hash,
  access_token
} = {}) {
  const response = await invokeEdgeFunction('bigcommerce-connect', {
    store_hash,
    access_token,
  });

  return { data: response };
}

export async function connectFaire({
  api_token,
  brand_token
} = {}) {
  const response = await invokeEdgeFunction('faire-connect', {
    api_token,
    brand_token,
  });

  return { data: response };
}

export async function initiateEbayAuth() {
  const response = await invokeEdgeFunction('ebay-auth-init', {});
  return { data: response };
}

export async function handleEbayCallback({
  code,
  state
} = {}) {
  const response = await invokeEdgeFunction('ebay-auth-callback', {
    code,
    state,
  });
  return { data: response };
}

// Export all functions as a unified functions object
export const supabaseFunctions = {
  invoke: invokeEdgeFunction,
  initiateShopifyAuth,
  interpretCommand,
  executeCommand,
  executeWorkflow,
  runInventoryProtection,
  runPriceGuardrail,
  runSEOFixer,
  runDeadProductCleanup,
  calculatePnL,
  monitorOrders,
  generateAIInsights,
  generateAIContent,
  enhancedInterpretCommand,
  enhancedExecuteCommand,
  undoCommand,
  evaluateSmartTrigger,
  intelligentScheduler,
  trackAutomationPerformance,
  getDailyBriefing,
  detectGrowthOpportunities,
  analyzeRisks,
  chatWithCoach,
  analyzeStoreForOnboarding,
  connectWooCommerce,
  connectBigCommerce,
  connectFaire,
  initiateEbayAuth,
  handleEbayCallback,
};
