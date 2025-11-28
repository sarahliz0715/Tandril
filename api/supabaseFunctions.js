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

// Export all functions as a functions object similar to base44.functions
export const supabaseFunctions = {
  invoke: invokeEdgeFunction,
  initiateShopifyAuth,
  interpretCommand,
  executeCommand,
  executeWorkflow,
};
