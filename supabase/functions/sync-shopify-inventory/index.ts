// Sync Shopify Inventory Edge Function
// Fetches products and inventory levels from Shopify and returns formatted data

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

    console.log(`[Sync Inventory] Syncing inventory for user ${user.id}`);

    // Get all active Shopify platforms for this user
    const { data: platforms, error: platformsError } = await supabaseClient
      .from('platforms')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform_type', 'shopify')
      .eq('is_active', true);

    if (platformsError) {
      throw new Error(`Failed to fetch platforms: ${platformsError.message}`);
    }

    if (!platforms || platforms.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          data: { inventory: [], message: 'No Shopify stores connected' },
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Fetch inventory from all connected stores
    const allInventory = [];

    for (const platform of platforms) {
      console.log(`[Sync Inventory] Fetching from ${platform.shop_domain}`);

      try {
        // Fetch products with variants
        const productsData = await shopifyRequest(platform, 'products.json?limit=250');
        const products = productsData.products || [];

        // Fetch locations for this store
        const locationsData = await shopifyRequest(platform, 'locations.json');
        const locations = locationsData.locations || [];
        const primaryLocation = locations[0]; // Use first location as primary

        console.log(`[Sync Inventory] Found ${products.length} products`);

        // Process each product and its variants
        for (const product of products) {
          for (const variant of product.variants || []) {
            // Get inventory levels for this variant
            let inventoryQuantity = variant.inventory_quantity || 0;

            // Try to get more accurate inventory data from inventory_levels API
            try {
              if (variant.inventory_item_id && primaryLocation) {
                const inventoryLevelData = await shopifyRequest(
                  platform,
                  `inventory_levels.json?inventory_item_ids=${variant.inventory_item_id}&location_ids=${primaryLocation.id}`
                );

                if (inventoryLevelData.inventory_levels && inventoryLevelData.inventory_levels.length > 0) {
                  inventoryQuantity = inventoryLevelData.inventory_levels[0].available || 0;
                }
              }
            } catch (invError) {
              console.warn(`[Sync Inventory] Could not fetch detailed inventory for variant ${variant.id}:`, invError.message);
            }

            // Calculate status based on inventory
            let status = 'in_stock';
            const reorderPoint = 10; // Default reorder point

            if (inventoryQuantity === 0) {
              status = 'out_of_stock';
            } else if (inventoryQuantity <= reorderPoint) {
              status = 'low_stock';
            }

            const inventoryItem = {
              id: `${platform.id}-${variant.id}`,
              platform_id: platform.id,
              platform_name: platform.shop_name || platform.shop_domain,
              product_id: product.id.toString(),
              variant_id: variant.id.toString(),
              inventory_item_id: variant.inventory_item_id?.toString(),
              product_name: product.title,
              variant_name: variant.title !== 'Default Title' ? variant.title : null,
              sku: variant.sku || '',
              barcode: variant.barcode || '',
              total_stock: inventoryQuantity,
              status: status,
              cost_per_unit: parseFloat(variant.price) || 0,
              reorder_point: reorderPoint,
              location_id: primaryLocation?.id?.toString(),
              location_name: primaryLocation?.name,
              inventory_policy: variant.inventory_policy,
              inventory_management: variant.inventory_management,
              product_type: product.product_type,
              vendor: product.vendor,
              tags: product.tags?.split(',').map((t: string) => t.trim()) || [],
              image_url: variant.image_id
                ? product.images?.find((img: any) => img.id === variant.image_id)?.src
                : product.images?.[0]?.src,
              updated_at: variant.updated_at || product.updated_at,
            };

            allInventory.push(inventoryItem);
          }
        }

        console.log(`[Sync Inventory] Processed ${allInventory.length} inventory items from ${platform.shop_domain}`);

      } catch (error) {
        console.error(`[Sync Inventory] Error fetching from ${platform.shop_domain}:`, error);
        // Continue with other platforms even if one fails
      }
    }

    console.log(`[Sync Inventory] Total inventory items: ${allInventory.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          inventory: allInventory,
          synced_at: new Date().toISOString(),
          platforms_synced: platforms.length,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[Sync Inventory] Error:', error);
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
