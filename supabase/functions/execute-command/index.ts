// Execute Command Edge Function
// This function executes interpreted commands against Shopify stores

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Decrypt access tokens for all platforms
    for (const platform of platforms) {
      if (platform.access_token && isEncrypted(platform.access_token)) {
        try {
          platform.access_token = await decrypt(platform.access_token);
        } catch (error) {
          console.error(`[Execute Command] Failed to decrypt token for ${platform.shop_domain}`);
          throw new Error('Failed to decrypt platform credentials');
        }
      }
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


async function fetchAllProductsGraphQL(platform: any): Promise<any[]> {
  const data = await shopifyGraphQL(platform.shop_domain, platform.access_token, `
    query {
      products(first: 250) {
        edges {
          node {
            id title handle status vendor productType tags
            images(first: 1) { edges { node { url } } }
            variants(first: 100) {
              edges {
                node {
                  id price sku inventoryQuantity
                  inventoryItem { id }
                }
              }
            }
          }
        }
      }
    }
  `);
  return data.products.edges.map((e: any) => ({
    ...e.node,
    id: fromShopifyGid(e.node.id),
    product_type: e.node.productType,
    images: e.node.images.edges.map((i: any) => ({ src: i.node.url })),
    variants: e.node.variants.edges.map((v: any) => ({
      ...v.node,
      id: fromShopifyGid(v.node.id),
      inventory_quantity: v.node.inventoryQuantity,
      inventory_item_id: v.node.inventoryItem ? fromShopifyGid(v.node.inventoryItem.id) : null,
    })),
  }));
}

async function getProducts(platform: any, parameters: any): Promise<any> {
  const { filter, operator, value } = parameters;

  const products = await fetchAllProductsGraphQL(platform);

  // For inventory filtering
  if (filter === 'inventory_quantity') {
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

  return {
    count: products.length,
    products,
  };
}

async function updateProducts(platform: any, parameters: any): Promise<any> {
  const { product_ids, product_name, updates, price_adjustment, new_price } = parameters;

  // Fetch products — either specific IDs or all products
  let products: any[] = await fetchAllProductsGraphQL(platform);

  if (product_ids && Array.isArray(product_ids) && product_ids.length > 0) {
    const idSet = new Set(product_ids.map(String));
    products = products.filter(p => idSet.has(String(p.id)));
  } else if (product_name && typeof product_name === 'string') {
    const lowerName = product_name.toLowerCase().trim();
    const filtered = products.filter(p => p.title?.toLowerCase().includes(lowerName));
    if (filtered.length > 0) {
      products = filtered;
      console.log(`[updateProducts] Filtered to ${filtered.length} product(s) matching "${product_name}"`);
    } else {
      console.warn(`[updateProducts] No products matched "${product_name}" — updating all ${products.length} (no filter applied)`);
    }
  }

  if (products.length === 0) {
    return { updated: 0, failed: 0, results: [] };
  }

  const results = [];

  for (const product of products) {
    for (const variant of product.variants || []) {
      try {
        let newVariantPrice: string | null = null;

        if (price_adjustment !== undefined) {
          const currentPrice = parseFloat(variant.price || '0');
          newVariantPrice = Math.max(0, currentPrice + price_adjustment).toFixed(2);
        } else if (new_price !== undefined) {
          newVariantPrice = parseFloat(new_price).toFixed(2);
        } else if (updates?.price !== undefined) {
          newVariantPrice = parseFloat(updates.price).toFixed(2);
        }

        if (newVariantPrice === null) continue;

        // Get the product GID for this variant
        const varData = await shopifyGraphQL(platform.shop_domain, platform.access_token, `
          query($id: ID!) { productVariant(id: $id) { product { id } } }
        `, { id: toShopifyGid('ProductVariant', variant.id) });

        await shopifyGraphQL(platform.shop_domain, platform.access_token, `
          mutation($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
            productVariantsBulkUpdate(productId: $productId, variants: $variants) {
              userErrors { field message }
            }
          }
        `, {
          productId: varData.productVariant.product.id,
          variants: [{ id: toShopifyGid('ProductVariant', variant.id), price: newVariantPrice }],
        });

        results.push({ product_id: product.id, variant_id: variant.id, success: true });
      } catch (error) {
        results.push({ product_id: product.id, variant_id: variant.id, success: false, error: error.message });
      }
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

  // Shopify price rules API (no GraphQL equivalent — using REST)
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

  const res = await fetch(`https://${platform.shop_domain}/admin/api/2025-01/price_rules.json`, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': platform.access_token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(priceRule),
  });
  if (!res.ok) throw new Error(`Shopify API error (${res.status}): ${await res.text()}`);
  const response = await res.json();

  return {
    price_rule_id: response.price_rule?.id,
    message: `Created price rule: ${response.price_rule?.title}`,
  };
}

async function updateInventory(platform: any, parameters: any): Promise<any> {
  const { inventory_item_id, location_id, available } = parameters;

  await shopifyGraphQL(platform.shop_domain, platform.access_token, `
    mutation($input: InventorySetQuantitiesInput!) {
      inventorySetQuantities(input: $input) {
        userErrors { field message }
      }
    }
  `, {
    input: {
      reason: 'correction',
      name: 'available',
      quantities: [{
        inventoryItemId: toShopifyGid('InventoryItem', inventory_item_id),
        locationId: toShopifyGid('Location', location_id),
        quantity: available,
      }],
    },
  });

  return {
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
        const mfRes = await fetch(`https://${platform.shop_domain}/admin/api/2025-01/products/${productId}/metafields.json`, {
          method: 'POST',
          headers: {
            'X-Shopify-Access-Token': platform.access_token,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ metafield }),
        });
        if (!mfRes.ok) throw new Error(`Shopify API error (${mfRes.status}): ${await mfRes.text()}`);
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
