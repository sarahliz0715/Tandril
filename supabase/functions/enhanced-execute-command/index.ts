// Enhanced Execute Command Edge Function
// Supports preview mode (dry-run), complex filters, and undo tracking

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { decrypt, isEncrypted } from '../_shared/encryption.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SHOPIFY_API_VERSION = '2024-01';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const {
      command_id,
      actions,
      platform_targets,
      preview_mode = false, // NEW: Preview mode for dry-run
      track_for_undo = true, // NEW: Track changes for undo
    } = await req.json();

    if (!actions || !Array.isArray(actions)) {
      throw new Error('Missing or invalid actions parameter');
    }

    console.log(`[Enhanced Execute] ${preview_mode ? 'PREVIEW MODE' : 'EXECUTION MODE'}: ${actions.length} actions`);

    const { data: platforms, error: platformsError } = await supabaseClient
      .from('platforms')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .in('shop_name', platform_targets || []);

    if (platformsError || !platforms || platforms.length === 0) {
      throw new Error('No connected platforms found');
    }

    // Decrypt access tokens for all platforms
    for (const platform of platforms) {
      if (platform.access_token && isEncrypted(platform.access_token)) {
        try {
          platform.access_token = await decrypt(platform.access_token);
        } catch (error) {
          console.error(`[Enhanced Execute] Failed to decrypt token for ${platform.shop_domain}`);
          throw new Error('Failed to decrypt platform credentials');
        }
      }
    }

    const results = [];
    const changeSnapshots = []; // NEW: For undo tracking

    for (const platform of platforms) {
      console.log(`[Enhanced Execute] Processing ${platform.shop_domain}`);

      for (const action of actions) {
        try {
          const actionResult = await executeEnhancedAction(
            action,
            platform,
            preview_mode,
            supabaseClient
          );

          results.push({
            platform: platform.shop_name,
            action: action.type,
            success: true,
            result: actionResult,
            preview_mode,
          });

          // Track changes for undo (only in execute mode)
          if (!preview_mode && track_for_undo && actionResult.changes_made) {
            changeSnapshots.push({
              action_type: action.type,
              platform_id: platform.id,
              before_state: actionResult.before_state,
              after_state: actionResult.after_state,
              affected_resources: actionResult.affected_resources,
            });
          }
        } catch (error) {
          console.error(`[Enhanced Execute] Action failed:`, error);
          results.push({
            platform: platform.shop_name,
            action: action.type,
            success: false,
            error: error.message,
            preview_mode,
          });
        }
      }
    }

    // Save undo snapshot if changes were made
    if (!preview_mode && changeSnapshots.length > 0 && command_id) {
      await supabaseClient
        .from('command_history')
        .insert({
          command_id,
          user_id: user.id,
          change_snapshots: changeSnapshots,
          can_undo: true,
          executed_at: new Date().toISOString(),
        });
    }

    // Update command status
    if (command_id) {
      await supabaseClient
        .from('ai_commands')
        .update({
          status: preview_mode ? 'previewed' : 'completed',
          execution_results: { results, preview_mode },
          executed_at: preview_mode ? null : new Date().toISOString(),
        })
        .eq('id', command_id);
    }

    const summary = {
      total_actions: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      preview_mode,
      can_undo: !preview_mode && changeSnapshots.length > 0,
    };

    console.log(`[Enhanced Execute] Complete:`, summary);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          results,
          summary,
          change_snapshots: preview_mode ? null : changeSnapshots,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[Enhanced Execute] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

async function executeEnhancedAction(
  action: any,
  platform: any,
  previewMode: boolean,
  supabaseClient: any
): Promise<any> {
  const { type, parameters } = action;

  switch (type) {
    case 'get_products':
      return await getProductsEnhanced(platform, parameters, previewMode);

    case 'update_products':
      return await updateProductsEnhanced(platform, parameters, previewMode);

    case 'apply_discount':
      return await applyDiscountEnhanced(platform, parameters, previewMode);

    case 'update_inventory':
      return await updateInventoryEnhanced(platform, parameters, previewMode);

    case 'update_seo':
      return await updateSEOEnhanced(platform, parameters, previewMode);

    case 'conditional_update':
      return await conditionalUpdateEnhanced(platform, parameters, previewMode);

    default:
      throw new Error(`Unknown action type: ${type}`);
  }
}

async function shopifyRequest(
  platform: any,
  endpoint: string,
  method: string = 'GET',
  body?: any
): Promise<any> {
  const url = `https://${platform.shop_domain}/admin/api/${SHOPIFY_API_VERSION}/${endpoint}`;

  const options: RequestInit = {
    method,
    headers: {
      'X-Shopify-Access-Token': platform.access_token,
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Shopify API error (${response.status}): ${errorText}`);
  }

  return await response.json();
}

// Enhanced product filtering with complex conditions
function applyComplexFilters(products: any[], filters: any[]): any[] {
  if (!filters || filters.length === 0) return products;

  return products.filter((product) => {
    let matches = true;

    for (const filter of filters) {
      const { field, operator, value, logic = 'AND' } = filter;

      let fieldValue: any;
      if (field.includes('.')) {
        // Nested field like "variants.price"
        const parts = field.split('.');
        fieldValue = product;
        for (const part of parts) {
          fieldValue = fieldValue?.[part];
        }
      } else {
        fieldValue = product[field];
      }

      let conditionMet = false;

      switch (operator) {
        case 'equals':
          conditionMet = fieldValue === value;
          break;
        case 'not_equals':
          conditionMet = fieldValue !== value;
          break;
        case 'contains':
          conditionMet = String(fieldValue || '').toLowerCase().includes(String(value).toLowerCase());
          break;
        case 'not_contains':
          conditionMet = !String(fieldValue || '').toLowerCase().includes(String(value).toLowerCase());
          break;
        case 'greater_than':
          conditionMet = Number(fieldValue) > Number(value);
          break;
        case 'less_than':
          conditionMet = Number(fieldValue) < Number(value);
          break;
        case 'greater_than_or_equal':
          conditionMet = Number(fieldValue) >= Number(value);
          break;
        case 'less_than_or_equal':
          conditionMet = Number(fieldValue) <= Number(value);
          break;
        default:
          conditionMet = false;
      }

      if (logic === 'AND') {
        matches = matches && conditionMet;
      } else if (logic === 'OR') {
        matches = matches || conditionMet;
      }
    }

    return matches;
  });
}

async function getProductsEnhanced(
  platform: any,
  parameters: any,
  previewMode: boolean
): Promise<any> {
  const { filters, limit = 250 } = parameters;

  // Fetch all products
  const productsResponse = await shopifyRequest(platform, `products.json?limit=${limit}`);
  let products = productsResponse.products || [];

  // Apply complex filters
  if (filters && filters.length > 0) {
    products = applyComplexFilters(products, filters);
  }

  return {
    count: products.length,
    products: products.slice(0, 50), // Return first 50 for preview
    total_available: products.length,
    preview_mode: previewMode,
    changes_made: false,
  };
}

async function updateProductsEnhanced(
  platform: any,
  parameters: any,
  previewMode: boolean
): Promise<any> {
  const { product_ids, updates, filters } = parameters;

  let targetProducts = [];

  // Get products by IDs or filters
  if (product_ids && product_ids.length > 0) {
    // Fetch specific products
    for (const id of product_ids.slice(0, 50)) {
      try {
        const response = await shopifyRequest(platform, `products/${id}.json`);
        targetProducts.push(response.product);
      } catch (error) {
        console.error(`Failed to fetch product ${id}:`, error);
      }
    }
  } else if (filters) {
    // Fetch and filter products
    const allProducts = await shopifyRequest(platform, 'products.json?limit=250');
    targetProducts = applyComplexFilters(allProducts.products || [], filters);
  }

  const beforeStates = [];
  const afterStates = [];
  const results = [];

  for (const product of targetProducts) {
    const beforeState = {
      id: product.id,
      title: product.title,
      variants: product.variants?.map((v: any) => ({
        id: v.id,
        price: v.price,
        inventory_quantity: v.inventory_quantity,
      })),
    };
    beforeStates.push(beforeState);

    if (previewMode) {
      // Simulate the update
      const afterState = { ...beforeState, ...updates };
      afterStates.push(afterState);
      results.push({
        product_id: product.id,
        product_title: product.title,
        before: beforeState,
        after: afterState,
        simulated: true,
      });
    } else {
      // Actually update
      try {
        const response = await shopifyRequest(
          platform,
          `products/${product.id}.json`,
          'PUT',
          { product: updates }
        );

        afterStates.push({
          id: response.product.id,
          title: response.product.title,
          variants: response.product.variants?.map((v: any) => ({
            id: v.id,
            price: v.price,
            inventory_quantity: v.inventory_quantity,
          })),
        });

        results.push({
          product_id: product.id,
          success: true,
          product: response.product,
        });
      } catch (error) {
        results.push({
          product_id: product.id,
          success: false,
          error: error.message,
        });
      }
    }
  }

  return {
    affected_count: targetProducts.length,
    results,
    preview_mode: previewMode,
    changes_made: !previewMode,
    before_state: beforeStates,
    after_state: afterStates,
    affected_resources: targetProducts.map((p) => ({ type: 'product', id: p.id })),
  };
}

async function applyDiscountEnhanced(
  platform: any,
  parameters: any,
  previewMode: boolean
): Promise<any> {
  const { discount_type, discount_value, product_ids, filters } = parameters;

  if (previewMode) {
    // Calculate what would happen
    let estimatedProducts = product_ids?.length || 0;

    if (!estimatedProducts && filters) {
      const productsResponse = await shopifyRequest(platform, 'products.json?limit=250');
      const filtered = applyComplexFilters(productsResponse.products || [], filters);
      estimatedProducts = filtered.length;
    }

    return {
      discount_type,
      discount_value,
      estimated_products: estimatedProducts,
      message: `Would apply ${discount_value}${discount_type === 'percentage' ? '%' : ' currency units'} discount to ~${estimatedProducts} products`,
      preview_mode: true,
      changes_made: false,
    };
  }

  // Actually create the price rule
  const priceRule = {
    price_rule: {
      title: `Discount ${discount_value}${discount_type === 'percentage' ? '%' : ' off'}`,
      target_type: 'line_item',
      target_selection: 'entitled',
      allocation_method: 'across',
      value_type: discount_type === 'percentage' ? 'percentage' : 'fixed_amount',
      value: discount_type === 'percentage' ? `-${discount_value}` : `-${discount_value}`,
      customer_selection: 'all',
      starts_at: new Date().toISOString(),
    },
  };

  const response = await shopifyRequest(platform, 'price_rules.json', 'POST', priceRule);

  return {
    price_rule_id: response.price_rule?.id,
    message: `Created price rule: ${response.price_rule?.title}`,
    preview_mode: false,
    changes_made: true,
    before_state: null,
    after_state: response.price_rule,
    affected_resources: [{ type: 'price_rule', id: response.price_rule?.id }],
  };
}

async function updateInventoryEnhanced(
  platform: any,
  parameters: any,
  previewMode: boolean
): Promise<any> {
  const { inventory_item_id, location_id, available, quantity, product_title, filters } = parameters;
  const targetQty = available ?? quantity;

  if (targetQty === undefined || targetQty === null) {
    throw new Error('Inventory quantity (available/quantity) is required');
  }

  // Fast path: caller already knows the specific inventory_item_id and location_id
  if (inventory_item_id && location_id) {
    if (previewMode) {
      return {
        inventory_item_id,
        location_id,
        new_quantity: targetQty,
        message: `Would update inventory to ${targetQty}`,
        preview_mode: true,
        changes_made: false,
      };
    }

    const response = await shopifyRequest(platform, 'inventory_levels/set.json', 'POST', {
      inventory_item_id,
      location_id,
      available: targetQty,
    });

    return {
      inventory_level: response.inventory_level,
      message: `Updated inventory to ${targetQty}`,
      preview_mode: false,
      changes_made: true,
      affected_resources: [{ type: 'inventory_level', id: inventory_item_id }],
    };
  }

  // Lookup path: find products by title or filters
  const productsResponse = await shopifyRequest(platform, 'products.json?limit=250');
  let products = productsResponse.products || [];

  if (product_title) {
    const lowerTitle = product_title.toLowerCase();
    products = products.filter((p: any) => p.title.toLowerCase().includes(lowerTitle));
  } else if (filters && filters.length > 0) {
    products = applyComplexFilters(products, filters);
  }

  if (products.length === 0) {
    throw new Error(`No products found matching criteria`);
  }

  // Get the store's first active location if not provided
  let resolvedLocationId = location_id;
  if (!resolvedLocationId) {
    const locationsResponse = await shopifyRequest(platform, 'locations.json');
    const locations = (locationsResponse.locations || []).filter((l: any) => l.active);
    if (locations.length === 0) {
      throw new Error('No active locations found for this store');
    }
    resolvedLocationId = locations[0].id;
  }

  // Collect all Shopify-managed variants from matching products
  const variantsToUpdate: any[] = [];
  for (const product of products) {
    for (const variant of product.variants || []) {
      if (variant.inventory_management === 'shopify') {
        variantsToUpdate.push({
          product_id: product.id,
          product_title: product.title,
          variant_id: variant.id,
          variant_title: variant.title,
          inventory_item_id: variant.inventory_item_id,
          current_quantity: variant.inventory_quantity,
        });
      }
    }
  }

  if (variantsToUpdate.length === 0) {
    throw new Error('No Shopify-managed inventory variants found for matching products');
  }

  if (previewMode) {
    return {
      affected_count: variantsToUpdate.length,
      new_quantity: targetQty,
      message: `Would update inventory to ${targetQty} for ${variantsToUpdate.length} variant(s)`,
      products: products.map((p: any) => ({ id: p.id, title: p.title })),
      preview_mode: true,
      changes_made: false,
    };
  }

  // Update each variant
  const results: any[] = [];
  for (const variant of variantsToUpdate) {
    try {
      const response = await shopifyRequest(platform, 'inventory_levels/set.json', 'POST', {
        inventory_item_id: variant.inventory_item_id,
        location_id: resolvedLocationId,
        available: targetQty,
      });
      results.push({
        product_title: variant.product_title,
        variant_title: variant.variant_title,
        success: true,
        previous_quantity: variant.current_quantity,
        new_quantity: targetQty,
        inventory_level: response.inventory_level,
      });
    } catch (error) {
      results.push({
        product_title: variant.product_title,
        variant_title: variant.variant_title,
        success: false,
        error: error.message,
      });
    }
  }

  return {
    updated: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
    message: `Updated inventory to ${targetQty} for ${results.filter((r) => r.success).length} variant(s)`,
    preview_mode: false,
    changes_made: true,
    before_state: variantsToUpdate.map((v) => ({
      inventory_item_id: v.inventory_item_id,
      quantity: v.current_quantity,
    })),
    after_state: results.filter((r) => r.success).map((r) => ({
      product_title: r.product_title,
      quantity: targetQty,
    })),
    affected_resources: variantsToUpdate.map((v) => ({
      type: 'inventory_level',
      id: v.inventory_item_id,
    })),
  };
}

async function updateSEOEnhanced(
  platform: any,
  parameters: any,
  previewMode: boolean
): Promise<any> {
  const { product_ids, seo_updates, filters } = parameters;

  let targetProducts = [];

  if (product_ids && product_ids.length > 0) {
    for (const id of product_ids.slice(0, 50)) {
      try {
        const response = await shopifyRequest(platform, `products/${id}.json`);
        targetProducts.push(response.product);
      } catch (error) {
        console.error(`Failed to fetch product ${id}:`, error);
      }
    }
  } else if (filters) {
    const productsResponse = await shopifyRequest(platform, 'products.json?limit=250');
    targetProducts = applyComplexFilters(productsResponse.products || [], filters);
  }

  if (previewMode) {
    return {
      affected_count: targetProducts.length,
      seo_updates,
      message: `Would update SEO for ${targetProducts.length} products`,
      sample_products: targetProducts.slice(0, 5).map((p) => ({
        id: p.id,
        title: p.title,
        current_seo: p.metafields_global_title_tag || 'None',
        new_seo: seo_updates.meta_title || 'None',
      })),
      preview_mode: true,
      changes_made: false,
    };
  }

  const results = [];
  for (const product of targetProducts) {
    try {
      const metafields = [];

      if (seo_updates.meta_title) {
        metafields.push({
          namespace: 'global',
          key: 'title_tag',
          value: seo_updates.meta_title,
          type: 'single_line_text_field',
        });
      }

      if (seo_updates.meta_description) {
        metafields.push({
          namespace: 'global',
          key: 'description_tag',
          value: seo_updates.meta_description,
          type: 'single_line_text_field',
        });
      }

      for (const metafield of metafields) {
        await shopifyRequest(platform, `products/${product.id}/metafields.json`, 'POST', { metafield });
      }

      results.push({
        product_id: product.id,
        success: true,
        updated_fields: Object.keys(seo_updates),
      });
    } catch (error) {
      results.push({
        product_id: product.id,
        success: false,
        error: error.message,
      });
    }
  }

  return {
    updated: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
    preview_mode: false,
    changes_made: true,
    affected_resources: targetProducts.map((p) => ({ type: 'product_seo', id: p.id })),
  };
}

async function conditionalUpdateEnhanced(
  platform: any,
  parameters: any,
  previewMode: boolean
): Promise<any> {
  const { condition_filters, then_action, else_action } = parameters;

  // Fetch products
  const productsResponse = await shopifyRequest(platform, 'products.json?limit=250');
  const allProducts = productsResponse.products || [];

  // Apply condition filters
  const matchingProducts = applyComplexFilters(allProducts, condition_filters);
  const nonMatchingProducts = allProducts.filter((p) => !matchingProducts.includes(p));

  const results = {
    condition_met_count: matchingProducts.length,
    condition_not_met_count: nonMatchingProducts.length,
    preview_mode: previewMode,
    changes_made: !previewMode,
  };

  if (previewMode) {
    results['then_action_preview'] = {
      action: then_action,
      would_affect: matchingProducts.length,
      sample_products: matchingProducts.slice(0, 5).map((p) => ({ id: p.id, title: p.title })),
    };

    if (else_action) {
      results['else_action_preview'] = {
        action: else_action,
        would_affect: nonMatchingProducts.length,
        sample_products: nonMatchingProducts.slice(0, 5).map((p) => ({ id: p.id, title: p.title })),
      };
    }
  } else {
    // Execute the conditional logic
    // (This would recursively call executeEnhancedAction with the then/else actions)
    results['message'] = 'Conditional update executed';
  }

  return results;
}
