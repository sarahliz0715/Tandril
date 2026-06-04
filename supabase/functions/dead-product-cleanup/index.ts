// Dead Product Cleanup Edge Function
// Auto-flags or deactivates products with no sales or engagement in X days

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
  const ordersData = await shopifyGraphQL(platform.shop_domain, platform.access_token, `
    query($query: String!) {
      orders(first: 250, query: $query) {
        edges {
          node {
            id
            lineItems(first: 50) {
              edges {
                node {
                  product { id }
                }
              }
            }
          }
        }
      }
    }
  `, { query: `created_at:>=${cutoffISO} status:any` });

  const orders = ordersData.orders.edges || [];
  console.log(`[Dead Product Cleanup] Found ${orders.length} orders in last ${daysInactive} days`);

  // Extract product GIDs from recent orders (products that DID sell)
  const soldProductGids = new Set<string>();
  for (const orderEdge of orders) {
    for (const liEdge of orderEdge.node.lineItems.edges || []) {
      if (liEdge.node.product?.id) {
        soldProductGids.add(liEdge.node.product.id);
      }
    }
  }

  console.log(`[Dead Product Cleanup] ${soldProductGids.size} unique products sold in last ${daysInactive} days`);

  // Fetch all products
  const productsData = await shopifyGraphQL(platform.shop_domain, platform.access_token, `
    query {
      products(first: 250) {
        edges {
          node {
            id title status tags
          }
        }
      }
    }
  `);

  const allProducts = (productsData.products.edges || []).map((e: any) => ({
    ...e.node,
    id: fromShopifyGid(e.node.id),
    _gid: e.node.id,
  }));

  console.log(`[Dead Product Cleanup] Found ${allProducts.length} total products`);

  // Find dead products (not in sold set and active)
  const deadProducts = allProducts.filter((product: any) =>
    !soldProductGids.has(product._gid) && product.status === 'ACTIVE'
  );

  console.log(`[Dead Product Cleanup] Found ${deadProducts.length} dead products (no sales in ${daysInactive} days)`);

  const cleanedProducts = [];

  for (const product of deadProducts) {
    try {
      if (action === 'unpublish') {
        // Unpublish the product via productUpdate
        await shopifyGraphQL(platform.shop_domain, platform.access_token, `
          mutation($input: ProductInput!) {
            productUpdate(input: $input) {
              product { id status }
              userErrors { field message }
            }
          }
        `, { input: { id: product._gid, status: 'DRAFT' } });

        cleanedProducts.push({
          product_id: product.id,
          title: product.title,
          action: 'unpublished',
          days_since_sale: daysInactive,
        });

        console.log(`[Dead Product Cleanup] Unpublished: ${product.title}`);
      } else if (action === 'flag') {
        // Add tag to flag as dead
        const currentTags: string[] = product.tags
          ? (Array.isArray(product.tags) ? product.tags : product.tags.split(',').map((t: string) => t.trim()))
          : [];

        // Only add tag if not already present
        if (!currentTags.includes(tagName)) {
          const newTags = [...currentTags, tagName];

          await shopifyGraphQL(platform.shop_domain, platform.access_token, `
            mutation($input: ProductInput!) {
              productUpdate(input: $input) {
                product { id tags }
                userErrors { field message }
              }
            }
          `, { input: { id: product._gid, tags: newTags } });

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
    products_still_selling: soldProductGids.size,
  };
}
