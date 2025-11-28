// Execute Command Edge Function
// This function executes interpreted commands against Shopify stores

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SHOPIFY_API_VERSION = '2024-01';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify the user is authenticated
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Get request body
    const { command_id, actions, platform_targets } = await req.json();

    if (!actions || !Array.isArray(actions)) {
      throw new Error('Missing or invalid actions parameter');
    }

    console.log(`[Execute Command] Starting execution of ${actions.length} actions for user ${user.id}`);

    // Get platform credentials for the user
    const { data: platforms, error: platformsError } = await supabaseClient
      .from('platforms')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .in('shop_name', platform_targets || []);

    if (platformsError) {
      throw new Error(`Failed to fetch platforms: ${platformsError.message}`);
    }

    if (!platforms || platforms.length === 0) {
      throw new Error('No connected platforms found. Please connect a Shopify store first.');
    }

    // Execute actions on each platform
    const results = [];
    for (const platform of platforms) {
      console.log(`[Execute Command] Executing on ${platform.shop_domain}`);

      for (const action of actions) {
        try {
          const actionResult = await executeAction(action, platform);
          results.push({
            platform: platform.shop_name,
            action: action.type,
            success: true,
            result: actionResult,
          });
        } catch (error) {
          console.error(`[Execute Command] Action failed:`, error);
          results.push({
            platform: platform.shop_name,
            action: action.type,
            success: false,
            error: error.message,
          });
        }
      }
    }

    // Update command status in database if command_id provided
    if (command_id) {
      await supabaseClient
        .from('ai_commands')
        .update({
          status: 'completed',
          execution_results: { results },
          executed_at: new Date().toISOString(),
        })
        .eq('id', command_id);
    }

    console.log(`[Execute Command] Execution complete with ${results.filter(r => r.success).length}/${results.length} successful actions`);

    return new Response(
      JSON.stringify({
        success: true,
        data: { results },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[Execute Command] Error:', error);
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

async function executeAction(action: any, platform: any): Promise<any> {
  const { type, parameters } = action;

  switch (type) {
    case 'get_products':
      return await getProducts(platform, parameters);

    case 'update_products':
      return await updateProducts(platform, parameters);

    case 'apply_discount':
      return await applyDiscount(platform, parameters);

    case 'update_inventory':
      return await updateInventory(platform, parameters);

    case 'update_seo':
      return await updateSEO(platform, parameters);

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

async function getProducts(platform: any, parameters: any): Promise<any> {
  const { filter, operator, value, limit = 50 } = parameters;

  // Build query parameters
  const queryParams = new URLSearchParams({
    limit: limit.toString(),
  });

  // For inventory filtering, we need to use the inventory_item endpoint
  if (filter === 'inventory_quantity') {
    const productsResponse = await shopifyRequest(platform, `products.json?${queryParams}`);
    const products = productsResponse.products || [];

    // Filter products based on inventory
    const filteredProducts = [];
    for (const product of products) {
      for (const variant of product.variants || []) {
        if (variant.inventory_quantity !== undefined) {
          const meetsCondition = operator === 'less_than'
            ? variant.inventory_quantity < value
            : operator === 'greater_than'
              ? variant.inventory_quantity > value
              : variant.inventory_quantity === value;

          if (meetsCondition) {
            filteredProducts.push({
              product_id: product.id,
              product_title: product.title,
              variant_id: variant.id,
              variant_title: variant.title,
              inventory_quantity: variant.inventory_quantity,
            });
          }
        }
      }
    }

    return {
      count: filteredProducts.length,
      products: filteredProducts,
    };
  }

  // Default: just fetch products
  const response = await shopifyRequest(platform, `products.json?${queryParams}`);
  return {
    count: response.products?.length || 0,
    products: response.products || [],
  };
}

async function updateProducts(platform: any, parameters: any): Promise<any> {
  const { product_ids, updates } = parameters;

  if (!product_ids || !Array.isArray(product_ids)) {
    throw new Error('product_ids array is required');
  }

  const results = [];
  for (const productId of product_ids) {
    try {
      const response = await shopifyRequest(
        platform,
        `products/${productId}.json`,
        'PUT',
        { product: updates }
      );
      results.push({
        product_id: productId,
        success: true,
        product: response.product,
      });
    } catch (error) {
      results.push({
        product_id: productId,
        success: false,
        error: error.message,
      });
    }
  }

  return {
    updated: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results,
  };
}

async function applyDiscount(platform: any, parameters: any): Promise<any> {
  const { discount_type, discount_value, product_ids, collection_id } = parameters;

  // Shopify price rules API
  const priceRule = {
    price_rule: {
      title: `Discount ${discount_value}${discount_type === 'percentage' ? '%' : ' off'}`,
      target_type: product_ids ? 'line_item' : 'line_item',
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
  };
}

async function updateInventory(platform: any, parameters: any): Promise<any> {
  const { inventory_item_id, location_id, available } = parameters;

  const response = await shopifyRequest(
    platform,
    'inventory_levels/set.json',
    'POST',
    {
      inventory_item_id,
      location_id,
      available,
    }
  );

  return {
    inventory_level: response.inventory_level,
    message: `Updated inventory to ${available}`,
  };
}

async function updateSEO(platform: any, parameters: any): Promise<any> {
  const { product_ids, seo_updates } = parameters;

  const results = [];
  for (const productId of product_ids || []) {
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
        await shopifyRequest(
          platform,
          `products/${productId}/metafields.json`,
          'POST',
          { metafield }
        );
      }

      results.push({
        product_id: productId,
        success: true,
        updated_fields: Object.keys(seo_updates),
      });
    } catch (error) {
      results.push({
        product_id: productId,
        success: false,
        error: error.message,
      });
    }
  }

  return {
    updated: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results,
  };
}
