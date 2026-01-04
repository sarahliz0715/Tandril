// Price Guardrail Edge Function
// Monitors product margins and auto-adjusts or flags when margins drop too low

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

    // Get configuration parameters
    const {
      min_margin_percent = 30,      // Minimum acceptable margin (30% default)
      action = 'flag',               // 'flag' or 'auto_adjust'
      target_margin_percent = 35,    // Target margin for auto-adjust
      workflow_id = null             // Optional workflow ID for tracking
    } = await req.json().catch(() => ({}));

    console.log(`[Price Guardrail] Running for user ${user.id}, min margin: ${min_margin_percent}%, action: ${action}`);

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
      console.log(`[Price Guardrail] Processing ${platform.shop_domain}`);

      try {
        const platformResults = await checkPriceMargins(
          platform,
          min_margin_percent,
          action,
          target_margin_percent
        );
        allResults.push({
          platform: platform.shop_name,
          success: true,
          ...platformResults,
        });
      } catch (error) {
        console.error(`[Price Guardrail] Error on ${platform.shop_domain}:`, error);
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

    const totalFlagged = allResults.reduce((sum, r) => sum + (r.low_margin_count || 0), 0);
    const totalAdjusted = allResults.reduce((sum, r) => sum + (r.adjusted_count || 0), 0);

    console.log(`[Price Guardrail] Complete - Flagged ${totalFlagged}, Adjusted ${totalAdjusted} across ${platforms.length} stores`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          low_margin_count: totalFlagged,
          adjusted_count: totalAdjusted,
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
    console.error('[Price Guardrail] Error:', error);
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

async function checkPriceMargins(
  platform: any,
  minMarginPercent: number,
  action: string,
  targetMarginPercent: number
): Promise<any> {
  // Fetch all products
  const productsResponse = await shopifyRequest(platform, 'products.json?limit=250');
  const products = productsResponse.products || [];

  console.log(`[Price Guardrail] Checking ${products.length} products on ${platform.shop_domain}`);

  const lowMarginProducts = [];
  const adjustedProducts = [];

  for (const product of products) {
    for (const variant of product.variants || []) {
      try {
        // Get variant details including inventory_item_id
        const price = parseFloat(variant.price || '0');
        const inventoryItemId = variant.inventory_item_id;

        if (!inventoryItemId || price === 0) {
          continue; // Skip variants without inventory item or price
        }

        // Fetch inventory item to get cost
        const inventoryResponse = await shopifyRequest(
          platform,
          `inventory_items/${inventoryItemId}.json`
        );
        const inventoryItem = inventoryResponse.inventory_item;
        const cost = parseFloat(inventoryItem.cost || '0');

        if (cost === 0) {
          continue; // Skip if no cost data
        }

        // Calculate margin: (price - cost) / price * 100
        const margin = ((price - cost) / price) * 100;

        console.log(`[Price Guardrail] ${product.title} - ${variant.title}: $${price} (cost: $${cost}, margin: ${margin.toFixed(1)}%)`);

        // Check if margin is below threshold
        if (margin < minMarginPercent) {
          const productInfo = {
            product_id: product.id,
            variant_id: variant.id,
            title: `${product.title}${variant.title !== 'Default Title' ? ' - ' + variant.title : ''}`,
            current_price: price,
            cost: cost,
            current_margin: parseFloat(margin.toFixed(2)),
            min_margin: minMarginPercent,
          };

          if (action === 'auto_adjust') {
            // Calculate new price to achieve target margin
            // Formula: price = cost / (1 - target_margin/100)
            const newPrice = cost / (1 - targetMarginPercent / 100);
            const roundedPrice = Math.ceil(newPrice * 100) / 100; // Round up to nearest cent

            try {
              // Update variant price
              await shopifyRequest(
                platform,
                `variants/${variant.id}.json`,
                'PUT',
                {
                  variant: {
                    price: roundedPrice.toFixed(2),
                  },
                }
              );

              adjustedProducts.push({
                ...productInfo,
                new_price: roundedPrice,
                new_margin: targetMarginPercent,
                action: 'price_adjusted',
              });

              console.log(`[Price Guardrail] Adjusted price: ${productInfo.title} from $${price} to $${roundedPrice} (margin: ${margin.toFixed(1)}% → ${targetMarginPercent}%)`);
            } catch (error) {
              lowMarginProducts.push({
                ...productInfo,
                action: 'adjustment_failed',
                error: error.message,
              });
            }
          } else {
            // Just flag for review
            lowMarginProducts.push({
              ...productInfo,
              action: 'flagged_for_review',
              suggested_price: (cost / (1 - targetMarginPercent / 100)).toFixed(2),
            });

            console.log(`[Price Guardrail] Flagged: ${productInfo.title} (margin: ${margin.toFixed(1)}%)`);
          }
        }
      } catch (error) {
        console.error(`[Price Guardrail] Error checking variant ${variant.id}:`, error.message);
      }
    }
  }

  return {
    products_checked: products.length,
    low_margin_count: lowMarginProducts.length,
    adjusted_count: adjustedProducts.length,
    low_margin_products: lowMarginProducts,
    adjusted_products: adjustedProducts,
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
