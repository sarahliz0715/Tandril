// Inventory Protection Edge Function
// Auto-unpublishes products when inventory hits zero (0-Stock Protection)

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

// ─── GraphQL helpers ──────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────

async function protectInventory(platform: any, threshold: number, action: string): Promise<any> {
  // Fetch all products via GraphQL
  const data = await shopifyGraphQL(platform.shop_domain, platform.access_token, `
    query {
      products(first: 250) {
        edges {
          node {
            id title status
            variants(first: 100) {
              edges {
                node {
                  id inventoryQuantity inventoryPolicy
                }
              }
            }
          }
        }
      }
    }
  `);

  const products = (data.products.edges || []).map((e: any) => ({
    ...e.node,
    id: fromShopifyGid(e.node.id),
    _gid: e.node.id,
    variants: e.node.variants.edges.map((v: any) => ({
      ...v.node,
      id: fromShopifyGid(v.node.id),
      _gid: v.node.id,
      inventory_quantity: v.node.inventoryQuantity,
      inventory_policy: v.node.inventoryPolicy,
    })),
  }));

  console.log(`[Inventory Protection] Found ${products.length} products on ${platform.shop_domain}`);

  const protectedProducts = [];

  for (const product of products) {
    // Check if product is published (status: 'ACTIVE')
    if (product.status !== 'ACTIVE') {
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
          // Unpublish the product via productUpdate mutation
          await shopifyGraphQL(platform.shop_domain, platform.access_token, `
            mutation($input: ProductInput!) {
              productUpdate(input: $input) {
                product { id status }
                userErrors { field message }
              }
            }
          `, { input: { id: product._gid, status: 'DRAFT' } });

          protectedProducts.push({
            product_id: product.id,
            title: product.title,
            action: 'unpublished',
            inventory: product.variants?.[0]?.inventory_quantity || 0,
          });

          console.log(`[Inventory Protection] Unpublished: ${product.title} (${product.id})`);
        } else if (action === 'preorder') {
          // Convert to preorder via productVariantsBulkUpdate
          await shopifyGraphQL(platform.shop_domain, platform.access_token, `
            mutation($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
              productVariantsBulkUpdate(productId: $productId, variants: $variants) {
                userErrors { field message }
              }
            }
          `, {
            productId: product._gid,
            variants: product.variants.map((v: any) => ({
              id: v._gid,
              inventoryPolicy: 'CONTINUE',
            })),
          });

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
