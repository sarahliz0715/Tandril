// Dead Product Cleanup Edge Function
// Auto-flags or deactivates products with no sales or engagement in X days

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
      days_inactive = 90,          // Products with no sales in X days
      action = 'flag',              // 'flag' (add tag) or 'unpublish'
      tag_name = 'Dead Product',    // Tag to add if action=flag
      workflow_id = null            // Optional workflow ID for tracking
    } = await req.json().catch(() => ({}));

    console.log(`[Dead Product Cleanup] Running for user ${user.id}, ${days_inactive} days inactive, action: ${action}`);

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
      console.log(`[Dead Product Cleanup] Processing ${platform.shop_domain}`);

      try {
        const platformResults = await cleanupDeadProducts(
          platform,
          days_inactive,
          action,
          tag_name
        );
        allResults.push({
          platform: platform.shop_name,
          success: true,
          ...platformResults,
        });
      } catch (error) {
        console.error(`[Dead Product Cleanup] Error on ${platform.shop_domain}:`, error);
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

    const totalCleaned = allResults.reduce((sum, r) => sum + (r.cleaned_count || 0), 0);
    const totalDead = allResults.reduce((sum, r) => sum + (r.dead_products_found || 0), 0);

    console.log(`[Dead Product Cleanup] Complete - Found ${totalDead} dead products, cleaned ${totalCleaned} across ${platforms.length} stores`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          dead_products_found: totalDead,
          cleaned_count: totalCleaned,
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
    console.error('[Dead Product Cleanup] Error:', error);
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

async function cleanupDeadProducts(
  platform: any,
  daysInactive: number,
  action: string,
  tagName: string
): Promise<any> {
  // Calculate cutoff date
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysInactive);
  const cutoffISO = cutoffDate.toISOString();

  console.log(`[Dead Product Cleanup] Looking for products with no sales since ${cutoffISO}`);

  // Fetch recent orders to find products that HAVE sold
  const ordersResponse = await shopifyRequest(
    platform,
    `orders.json?status=any&created_at_min=${cutoffISO}&limit=250`
  );
  const orders = ordersResponse.orders || [];

  console.log(`[Dead Product Cleanup] Found ${orders.length} orders in last ${daysInactive} days`);

  // Extract product IDs from recent orders (products that DID sell)
  const soldProductIds = new Set<number>();
  for (const order of orders) {
    for (const lineItem of order.line_items || []) {
      if (lineItem.product_id) {
        soldProductIds.add(lineItem.product_id);
      }
    }
  }

  console.log(`[Dead Product Cleanup] ${soldProductIds.size} unique products sold in last ${daysInactive} days`);

  // Fetch all products
  const productsResponse = await shopifyRequest(platform, 'products.json?limit=250');
  const allProducts = productsResponse.products || [];

  console.log(`[Dead Product Cleanup] Found ${allProducts.length} total products`);

  // Find dead products (not in sold set and published)
  const deadProducts = allProducts.filter(product =>
    !soldProductIds.has(product.id) && product.status === 'active'
  );

  console.log(`[Dead Product Cleanup] Found ${deadProducts.length} dead products (no sales in ${daysInactive} days)`);

  const cleanedProducts = [];

  for (const product of deadProducts) {
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

        cleanedProducts.push({
          product_id: product.id,
          title: product.title,
          action: 'unpublished',
          days_since_sale: daysInactive,
        });

        console.log(`[Dead Product Cleanup] Unpublished: ${product.title}`);
      } else if (action === 'flag') {
        // Add tag to flag as dead
        const currentTags = product.tags ? product.tags.split(',').map((t: string) => t.trim()) : [];

        // Only add tag if not already present
        if (!currentTags.includes(tagName)) {
          const newTags = [...currentTags, tagName].join(', ');

          await shopifyRequest(
            platform,
            `products/${product.id}.json`,
            'PUT',
            {
              product: {
                tags: newTags,
              },
            }
          );

          cleanedProducts.push({
            product_id: product.id,
            title: product.title,
            action: 'flagged',
            tag: tagName,
            days_since_sale: daysInactive,
          });

          console.log(`[Dead Product Cleanup] Flagged: ${product.title} with tag "${tagName}"`);
        }
      }
    } catch (error) {
      console.error(`[Dead Product Cleanup] Failed to clean ${product.title}:`, error);
      cleanedProducts.push({
        product_id: product.id,
        title: product.title,
        action: 'failed',
        error: error.message,
      });
    }
  }

  return {
    products_checked: allProducts.length,
    dead_products_found: deadProducts.length,
    cleaned_count: cleanedProducts.filter(p => p.action !== 'failed').length,
    failed_count: cleanedProducts.filter(p => p.action === 'failed').length,
    cleaned_products: cleanedProducts,
    products_still_selling: soldProductIds.size,
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
