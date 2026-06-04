// Shopify Inventory Sync for Purchase Orders
// Triggered when a PO is marked as "received" to update Shopify inventory levels

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// --- Inlined from _shared/encryption.ts ---
const _ENC_ALGORITHM = 'AES-GCM';
const _ENC_IV_LENGTH = 12;
async function _getEncryptionKey(): Promise<CryptoKey> {
  const secret = Deno.env.get('ENCRYPTION_SECRET');
  if (!secret) throw new Error('ENCRYPTION_SECRET environment variable not set');
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(secret), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: encoder.encode('tandril-encryption-salt-v1'), iterations: 100000, hash: 'SHA-256' },
    keyMaterial, { name: _ENC_ALGORITHM, length: 256 }, false, ['encrypt', 'decrypt']
  );
}
async function decrypt(encrypted: string): Promise<string> {
  try {
    const key = await _getEncryptionKey();
    const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
    const iv = combined.slice(0, _ENC_IV_LENGTH);
    const ciphertext = combined.slice(_ENC_IV_LENGTH);
    const decrypted = await crypto.subtle.decrypt({ name: _ENC_ALGORITHM, iv }, key, ciphertext);
    return new TextDecoder().decode(decrypted);
  } catch { throw new Error('Failed to decrypt data'); }
}
function isEncrypted(value: string): boolean {
  try { return atob(value).length > _ENC_IV_LENGTH; } catch { return false; }
}

// --- Inlined from _shared/platformHelpers.ts ---
interface Platform {
  id: string;
  user_id: string;
  platform_type: string;
  shop_domain: string;
  shop_name?: string;
  access_token: string;
  access_scopes?: string[];
  is_active?: boolean;
  last_synced_at?: string;
  metadata?: any;
  created_at?: string;
  updated_at?: string;
}
async function getPlatformsByTypeWithDecryptedTokens(
  supabase: any,
  userId: string,
  platformType: string
): Promise<Platform[]> {
  const { data: platforms, error } = await supabase
    .from('platforms')
    .select('*')
    .eq('user_id', userId)
    .eq('platform_type', platformType)
    .eq('is_active', true);
  if (error || !platforms) return [];
  for (const platform of platforms) {
    if (platform.access_token && isEncrypted(platform.access_token)) {
      try { platform.access_token = await decrypt(platform.access_token); }
      catch (e) { console.error('[Platform] Failed to decrypt token for ' + platform.shop_domain + ':', e); }
    }
  }
  return platforms as Platform[];
}

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

async function shopifyGraphQL(domain: string, token: string, query: string, variables: Record<string, any> = {}) {
  const response = await fetch(`https://${domain}/admin/api/2025-01/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': token,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!response.ok) throw new Error(`Shopify GraphQL request failed: ${response.status}`);
  const result = await response.json();
  if (result.errors?.length) throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
  return result.data;
}

function toShopifyGid(type: string, id: string | number): string {
  return `gid://shopify/${type}/${id}`;
}

function fromShopifyGid(gid: string): string {
  return String(gid).split('/').pop() || String(gid);
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

    // Fetch all products/variants via GraphQL for SKU lookup
    const productsData = await shopifyGraphQL(shopDomain, accessToken, `
      query {
        products(first: 250) {
          edges {
            node {
              id
              variants(first: 100) {
                edges {
                  node { id sku inventoryItem { id } }
                }
              }
            }
          }
        }
      }
    `);
    const allVariants = productsData.products.edges.flatMap((p: any) =>
      p.node.variants.edges.map((v: any) => ({
        id: fromShopifyGid(v.node.id),
        sku: v.node.sku,
        inventory_item_id: fromShopifyGid(v.node.inventoryItem.id),
        product_id: fromShopifyGid(p.node.id),
      }))
    );

    // Fetch primary location via GraphQL
    const locData = await shopifyGraphQL(shopDomain, accessToken, `
      query { locations(first: 10) { edges { node { id name } } } }
    `);
    const locations = locData.locations.edges.map((e: any) => ({
      id: fromShopifyGid(e.node.id),
      name: e.node.name,
    }));
    const primaryLocationId = locations[0]?.id;

    // Process each item
    const results = [];
    for (const item of poItems as PurchaseOrderItem[]) {
      try {
        let inventoryItemId: string | null = null;
        const locationId: string | null = primaryLocationId ?? null;

        // Find variant by SKU
        if (item.sku) {
          const match = allVariants.find((v: any) => v.sku === item.sku);
          if (match) {
            inventoryItemId = match.inventory_item_id;
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

        if (!locationId) {
          throw new Error('No Shopify location found');
        }

        // Get current inventory level via GraphQL
        const invData = await shopifyGraphQL(shopDomain, accessToken, `
          query($id: ID!) {
            inventoryItem(id: $id) {
              inventoryLevels(first: 10) {
                edges {
                  node {
                    quantities(names: ["available"]) { name quantity }
                    location { id }
                  }
                }
              }
            }
          }
        `, { id: toShopifyGid('InventoryItem', inventoryItemId) });
        const level = invData.inventoryItem.inventoryLevels.edges.find((e: any) =>
          fromShopifyGid(e.node.location.id) === String(locationId)
        );
        const currentLevel = level?.node.quantities.find((q: any) => q.name === 'available')?.quantity ?? 0;

        // Calculate new inventory level (add received quantity)
        const newLevel = currentLevel + item.quantity_ordered;

        // Adjust inventory via GraphQL mutation
        await shopifyGraphQL(shopDomain, accessToken, `
          mutation($input: InventoryAdjustQuantitiesInput!) {
            inventoryAdjustQuantities(input: $input) {
              inventoryAdjustmentGroup { reason }
              userErrors { field message }
            }
          }
        `, {
          input: {
            reason: 'received',
            name: 'available',
            changes: [{
              inventoryItemId: toShopifyGid('InventoryItem', inventoryItemId),
              locationId: toShopifyGid('Location', locationId),
              delta: item.quantity_ordered,
            }],
          },
        });

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
