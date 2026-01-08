// Inventory Protection Edge Function
// Auto-unpublishes products when inventory hits zero (0-Stock Protection)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { decrypt, isEncrypted } from '../_shared/encryption.ts';

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

    // Get configuration parameters (defaults)
    const {
      threshold = 0,           // Inventory threshold (0 = out of stock)
      action = 'unpublish',    // 'unpublish' or 'preorder'
      workflow_id = null       // Optional workflow ID for tracking
    } = await req.json().catch(() => ({}));

    console.log(`[Inventory Protection] Running for user ${user.id}, threshold: ${threshold}, action: ${action}`);

    // Get all active Shopify platforms for the user
    const { data: platforms, error: platformsError } = await supabaseClient
      .from('platforms')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .eq('platform_type', 'shopify');

    if (platformsError) {
      throw new Error(`Failed to fetch platforms: ${platformsError.message}`);
    }

    // Decrypt access tokens for all platforms
    for (const platform of platforms) {
      if (platform.access_token && isEncrypted(platform.access_token)) {
        try {
          platform.access_token = await decrypt(platform.access_token);
        } catch (error) {
          console.error(`Failed to decrypt token for ${platform.shop_domain}`);
          throw new Error('Failed to decrypt platform credentials');
        }
      }
    }

    if (!platforms || platforms.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No active Shopify stores found',
          results: [],
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Process each platform
    const allResults = [];
    for (const platform of platforms) {
      console.log(`[Inventory Protection] Processing ${platform.shop_domain}`);

      try {
        const platformResults = await protectInventory(platform, threshold, action);
        allResults.push({
          platform: platform.shop_name,
          success: true,
          ...platformResults,
        });
      } catch (error) {
        console.error(`[Inventory Protection] Error on ${platform.shop_domain}:`, error);
        allResults.push({
          platform: platform.shop_name,
          success: false,
          error: error.message,
        });
      }
    }

    // Log results to workflow_runs if workflow_id provided
    if (workflow_id) {
      await supabaseClient
        .from('workflow_runs')
        .insert({
          workflow_id,
          user_id: user.id,
          status: 'completed',
          results: { platforms: allResults },
          executed_at: new Date().toISOString(),
        });
    }

    const totalProtected = allResults.reduce((sum, r) => sum + (r.protected_count || 0), 0);
    console.log(`[Inventory Protection] Complete - Protected ${totalProtected} products across ${platforms.length} stores`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          protected_count: totalProtected,
          platforms_processed: platforms.length,
          results: allResults,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[Inventory Protection] Error:', error);
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

async function protectInventory(platform: any, threshold: number, action: string): Promise<any> {
  // Fetch all products
  const productsResponse = await shopifyRequest(platform, 'products.json?limit=250');
  const products = productsResponse.products || [];

  console.log(`[Inventory Protection] Found ${products.length} products on ${platform.shop_domain}`);

  const protectedProducts = [];

  for (const product of products) {
    // Check if product is published (status: 'active')
    if (product.status !== 'active') {
      continue; // Skip already unpublished products
    }

    // Check all variants for low/zero inventory
    let hasLowInventory = false;
    for (const variant of product.variants || []) {
      if (variant.inventory_quantity !== undefined && variant.inventory_quantity <= threshold) {
        hasLowInventory = true;
        break;
      }
    }

    if (hasLowInventory) {
      try {
        if (action === 'unpublish') {
          // Unpublish the product
          await shopifyRequest(
            platform,
            `products/${product.id}.json`,
            'PUT',
            {
              product: {
                status: 'draft',
              },
            }
          );

          protectedProducts.push({
            product_id: product.id,
            title: product.title,
            action: 'unpublished',
            inventory: product.variants?.[0]?.inventory_quantity || 0,
          });

          console.log(`[Inventory Protection] Unpublished: ${product.title} (${product.id})`);
        } else if (action === 'preorder') {
          // Convert to preorder (set inventory policy to continue)
          const updates = {
            variants: product.variants.map((v: any) => ({
              id: v.id,
              inventory_policy: 'continue', // Allow purchases when out of stock
            })),
          };

          await shopifyRequest(
            platform,
            `products/${product.id}.json`,
            'PUT',
            { product: updates }
          );

          protectedProducts.push({
            product_id: product.id,
            title: product.title,
            action: 'converted_to_preorder',
            inventory: product.variants?.[0]?.inventory_quantity || 0,
          });

          console.log(`[Inventory Protection] Converted to preorder: ${product.title} (${product.id})`);
        }
      } catch (error) {
        console.error(`[Inventory Protection] Failed to protect ${product.title}:`, error);
        protectedProducts.push({
          product_id: product.id,
          title: product.title,
          action: 'failed',
          error: error.message,
        });
      }
    }
  }

  return {
    products_checked: products.length,
    protected_count: protectedProducts.filter(p => p.action !== 'failed').length,
    failed_count: protectedProducts.filter(p => p.action === 'failed').length,
    protected_products: protectedProducts,
  };
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
