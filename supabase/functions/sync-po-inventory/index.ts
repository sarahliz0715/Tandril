// Shopify Inventory Sync for Purchase Orders
// Triggered when a PO is marked as "received" to update Shopify inventory levels

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getPlatformsByTypeWithDecryptedTokens } from '../_shared/platformHelpers.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PurchaseOrderItem {
  id: string;
  po_id: string;
  product_id: string;
  product_name: string;
  sku?: string;
  quantity_ordered: number;
  quantity_received: number;
  cost_per_unit: number;
}

interface ShopifyInventoryLevel {
  inventory_item_id: string;
  location_id: string;
  available: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get request body
    const { po_id, user_id } = await req.json();

    if (!po_id || !user_id) {
      throw new Error('Missing required parameters: po_id and user_id');
    }

    console.log(`[Inventory Sync] Starting sync for PO: ${po_id}`);

    // Fetch the PO to verify it's in "received" status
    const { data: po, error: poError } = await supabase
      .from('purchase_orders')
      .select('*')
      .eq('id', po_id)
      .eq('user_id', user_id)
      .single();

    if (poError || !po) {
      throw new Error(`Purchase order not found: ${poError?.message}`);
    }

    if (po.status !== 'received') {
      throw new Error(`PO status must be "received" to sync inventory. Current status: ${po.status}`);
    }

    // Fetch PO items
    const { data: poItems, error: itemsError } = await supabase
      .from('purchase_order_items')
      .select('*')
      .eq('po_id', po_id);

    if (itemsError || !poItems || poItems.length === 0) {
      throw new Error(`No items found for PO: ${itemsError?.message}`);
    }

    console.log(`[Inventory Sync] Found ${poItems.length} items to sync`);

    // Get user's Shopify platform connection
    const shopifyPlatforms = await getPlatformsByTypeWithDecryptedTokens(
      supabase,
      user_id,
      'shopify'
    );

    if (shopifyPlatforms.length === 0) {
      throw new Error('No active Shopify platform connection found');
    }

    const shopify = shopifyPlatforms[0];
    const shopDomain = shopify.shop_domain;
    const accessToken = shopify.access_token;

    console.log(`[Inventory Sync] Using Shopify store: ${shopDomain}`);

    // Check if the user has write_inventory scope
    const scopes = shopify.access_scopes || [];
    if (!scopes.includes('write_inventory')) {
      throw new Error('Missing required Shopify scope: write_inventory. Please reconnect your Shopify store with inventory permissions.');
    }

    // Process each item
    const results = [];
    for (const item of poItems as PurchaseOrderItem[]) {
      try {
        // Search for the product in Shopify by SKU or product ID
        let inventoryItemId: string | null = null;
        let locationId: string | null = null;

        // First, try to find the product by SKU
        if (item.sku) {
          const searchUrl = `https://${shopDomain}/admin/api/2024-01/products.json?fields=id,variants&limit=250`;
          const searchResponse = await fetch(searchUrl, {
            headers: {
              'X-Shopify-Access-Token': accessToken,
              'Content-Type': 'application/json',
            },
          });

          if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            const products = searchData.products || [];

            // Find variant with matching SKU
            for (const product of products) {
              const variant = product.variants?.find((v: any) => v.sku === item.sku);
              if (variant) {
                inventoryItemId = variant.inventory_item_id;
                break;
              }
            }
          }
        }

        if (!inventoryItemId) {
          console.warn(`[Inventory Sync] Could not find product for SKU: ${item.sku || 'N/A'}, product: ${item.product_name}`);
          results.push({
            item: item.product_name,
            sku: item.sku,
            status: 'skipped',
            reason: 'Product not found in Shopify'
          });
          continue;
        }

        // Get the primary location
        const locationsUrl = `https://${shopDomain}/admin/api/2024-01/locations.json`;
        const locationsResponse = await fetch(locationsUrl, {
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json',
          },
        });

        if (!locationsResponse.ok) {
          throw new Error(`Failed to fetch locations: ${locationsResponse.statusText}`);
        }

        const locationsData = await locationsResponse.json();
        const locations = locationsData.locations || [];
        locationId = locations[0]?.id; // Use first/primary location

        if (!locationId) {
          throw new Error('No Shopify location found');
        }

        // Get current inventory level
        const inventoryUrl = `https://${shopDomain}/admin/api/2024-01/inventory_levels.json?inventory_item_ids=${inventoryItemId}&location_ids=${locationId}`;
        const inventoryResponse = await fetch(inventoryUrl, {
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json',
          },
        });

        if (!inventoryResponse.ok) {
          throw new Error(`Failed to fetch inventory levels: ${inventoryResponse.statusText}`);
        }

        const inventoryData = await inventoryResponse.json();
        const currentLevel = inventoryData.inventory_levels?.[0]?.available || 0;

        // Calculate new inventory level (add received quantity)
        const newLevel = currentLevel + item.quantity_ordered;

        // Update inventory level using the adjust endpoint
        const adjustUrl = `https://${shopDomain}/admin/api/2024-01/inventory_levels/adjust.json`;
        const adjustResponse = await fetch(adjustUrl, {
          method: 'POST',
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            location_id: locationId,
            inventory_item_id: inventoryItemId,
            available_adjustment: item.quantity_ordered, // Add the received quantity
          }),
        });

        if (!adjustResponse.ok) {
          const errorText = await adjustResponse.text();
          throw new Error(`Failed to update inventory: ${adjustResponse.statusText} - ${errorText}`);
        }

        console.log(`[Inventory Sync] Updated ${item.product_name}: ${currentLevel} -> ${newLevel}`);

        results.push({
          item: item.product_name,
          sku: item.sku,
          status: 'success',
          previousLevel: currentLevel,
          newLevel: newLevel,
          adjustment: item.quantity_ordered
        });

      } catch (error) {
        console.error(`[Inventory Sync] Error processing item ${item.product_name}:`, error);
        results.push({
          item: item.product_name,
          sku: item.sku,
          status: 'error',
          error: error.message
        });
      }
    }

    // Update the PO with sync status
    await supabase
      .from('purchase_orders')
      .update({
        notes: (po.notes || '') + `\n\n[Auto] Inventory synced to Shopify on ${new Date().toISOString()}`
      })
      .eq('id', po_id);

    console.log('[Inventory Sync] Sync completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        po_id: po_id,
        synced_at: new Date().toISOString(),
        results: results,
        summary: {
          total: results.length,
          success: results.filter(r => r.status === 'success').length,
          skipped: results.filter(r => r.status === 'skipped').length,
          errors: results.filter(r => r.status === 'error').length,
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('[Inventory Sync] Error:', error);
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
