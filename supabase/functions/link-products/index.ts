// link-products edge function
// Scans each connected platform for products, matches by SKU across platforms,
// and upserts rows into platform_product_links so sync-inventory-levels can
// propagate quantity changes in real time.
//
// Called:
//   - automatically after shopify-auth-exchange / oauth-callback (service role)
//   - manually from the Platforms page (user JWT)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ─── Encryption helpers (same key as the rest of the functions) ────────────────
const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;

async function getEncryptionKey(): Promise<CryptoKey> {
  const secret = Deno.env.get('ENCRYPTION_SECRET');
  if (!secret) throw new Error('ENCRYPTION_SECRET not set');
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(secret), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: encoder.encode('tandril-encryption-salt-v1'), iterations: 100000, hash: 'SHA-256' },
    keyMaterial, { name: ALGORITHM, length: KEY_LENGTH }, false, ['encrypt', 'decrypt']
  );
}

async function decrypt(encrypted: string): Promise<string> {
  const key = await getEncryptionKey();
  const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
  const decrypted = await crypto.subtle.decrypt({ name: ALGORITHM, iv: combined.slice(0, IV_LENGTH) }, key, combined.slice(IV_LENGTH));
  return new TextDecoder().decode(decrypted);
}

function isEncrypted(value: string): boolean {
  try { return atob(value).length > IV_LENGTH; } catch { return false; }
}

// ─── Platform product fetchers ────────────────────────────────────────────────
// Each returns Map<sku, { productId, variantId }>

const SHOPIFY_API_VERSION = '2024-01';

async function fetchShopify(platform: any, token: string): Promise<Map<string, { productId: string; variantId: string }>> {
  const map = new Map<string, { productId: string; variantId: string }>();
  let url: string | null = `https://${platform.shop_domain}/admin/api/${SHOPIFY_API_VERSION}/products.json?limit=250&fields=id,variants`;

  while (url) {
    const res = await fetch(url, { headers: { 'X-Shopify-Access-Token': token } });
    if (!res.ok) { console.warn(`[link-products] Shopify products fetch failed: ${res.status}`); break; }
    const { products } = await res.json();

    for (const product of products ?? []) {
      for (const variant of product.variants ?? []) {
        const sku = variant.sku?.trim();
        if (sku) map.set(sku, { productId: String(product.id), variantId: String(variant.id) });
      }
    }

    // Cursor-based pagination via Link header
    const link = res.headers.get('Link') ?? '';
    const next = link.match(/<([^>]+)>;\s*rel="next"/);
    url = next ? next[1] : null;
  }

  return map;
}

async function fetchEbay(platform: any): Promise<Map<string, { productId: string; variantId: string }>> {
  const map = new Map<string, { productId: string; variantId: string }>();
  const creds = platform.credentials ?? {};
  const token = creds.access_token;
  if (!token) return map;

  const apiBase = creds.is_sandbox ? 'https://api.sandbox.ebay.com' : 'https://api.ebay.com';
  const marketplaceId = creds.marketplace_id || 'EBAY_US';

  let offset = 0;
  const limit = 100;

  while (true) {
    const res = await fetch(
      `${apiBase}/sell/inventory/v1/inventory_item?limit=${limit}&offset=${offset}`,
      { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'X-EBAY-C-MARKETPLACE-ID': marketplaceId } }
    );
    if (!res.ok) { console.warn(`[link-products] eBay fetch failed: ${res.status}`); break; }
    const data = await res.json();

    for (const item of data.inventoryItems ?? []) {
      const sku = item.sku?.trim();
      if (sku) {
        // For eBay Inventory API, SKU is the native key — use it as both productId and the lookup key
        map.set(sku, { productId: sku, variantId: '' });
      }
    }

    if (!data.inventoryItems?.length || data.inventoryItems.length < limit) break;
    offset += limit;
  }

  return map;
}

async function fetchEtsy(platform: any): Promise<Map<string, { productId: string; variantId: string }>> {
  const map = new Map<string, { productId: string; variantId: string }>();
  const creds = platform.credentials ?? {};
  const token = creds.access_token;
  const shopId = platform.metadata?.shop_id;
  const clientId = Deno.env.get('ETSY_CLIENT_ID');
  if (!token || !shopId || !clientId) return map;

  // Etsy paginates by offset; fetch up to 500 listings
  for (let offset = 0; offset < 500; offset += 100) {
    const res = await fetch(
      `https://openapi.etsy.com/v3/application/shops/${shopId}/listings/active?limit=100&offset=${offset}&fields=listing_id,skus`,
      { headers: { 'x-api-key': clientId, 'Authorization': `Bearer ${token}` } }
    );
    if (!res.ok) break;
    const data = await res.json();
    const results = data.results ?? [];

    for (const listing of results) {
      for (const sku of listing.skus ?? []) {
        const s = sku?.trim();
        if (s) map.set(s, { productId: String(listing.listing_id), variantId: '' });
      }
    }

    if (results.length < 100) break;
  }

  return map;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const isServiceCall = serviceRoleKey && authHeader === `Bearer ${serviceRoleKey}`;

    const adminClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', serviceRoleKey);

    let userId: string;
    if (isServiceCall) {
      const body = await req.json();
      userId = body.user_id;
      if (!userId) throw new Error('user_id required for service-role calls');
    } else {
      const userClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: { user }, error } = await userClient.auth.getUser();
      if (error || !user) throw new Error('Unauthorized');
      userId = user.id;
    }

    // Load all active platforms
    const { data: platforms, error: platErr } = await adminClient
      .from('platforms')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (platErr) throw new Error(`Failed to load platforms: ${platErr.message}`);
    if (!platforms?.length) {
      return new Response(
        JSON.stringify({ success: true, linked: 0, message: 'No active platforms' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch products from each supported platform
    const platformProducts: Array<{
      platformId: string;
      platformType: string;
      products: Map<string, { productId: string; variantId: string }>;
    }> = [];

    for (const platform of platforms) {
      let products = new Map<string, { productId: string; variantId: string }>();
      try {
        switch (platform.platform_type) {
          case 'shopify': {
            let token = platform.access_token ?? '';
            if (token && isEncrypted(token)) token = await decrypt(token);
            if (token) products = await fetchShopify(platform, token);
            break;
          }
          case 'ebay':
            products = await fetchEbay(platform);
            break;
          case 'etsy':
            products = await fetchEtsy(platform);
            break;
          // Additional platforms can be added here
        }
      } catch (e: any) {
        console.warn(`[link-products] ${platform.platform_type} fetch failed:`, e.message);
      }

      if (products.size > 0) {
        platformProducts.push({ platformId: platform.id, platformType: platform.platform_type, products });
        console.log(`[link-products] ${platform.platform_type}: ${products.size} products with SKUs`);
      }
    }

    if (platformProducts.length < 2) {
      return new Response(
        JSON.stringify({ success: true, linked: 0, message: 'Need 2+ platforms with SKU-matched products to create links' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build SKU → [{platformId, platformType, productId, variantId}] index
    const skuIndex = new Map<string, Array<{ platformId: string; platformType: string; productId: string; variantId: string }>>();
    for (const { platformId, platformType, products } of platformProducts) {
      for (const [sku, { productId, variantId }] of products) {
        if (!skuIndex.has(sku)) skuIndex.set(sku, []);
        skuIndex.get(sku)!.push({ platformId, platformType, productId, variantId });
      }
    }

    // Collect rows for SKUs that appear on 2+ platforms
    const rows: any[] = [];
    const linkedSkus = new Set<string>();
    for (const [sku, entries] of skuIndex) {
      if (entries.length < 2) continue;
      linkedSkus.add(sku);
      for (const e of entries) {
        rows.push({
          user_id: userId,
          sku,
          platform_id: e.platformId,
          platform_type: e.platformType,
          platform_product_id: e.productId,
          platform_variant_id: e.variantId || null,
          last_synced_at: new Date().toISOString(),
        });
      }
    }

    if (rows.length > 0) {
      const { error: upsertErr } = await adminClient
        .from('platform_product_links')
        .upsert(rows, { onConflict: 'user_id,sku,platform_id', ignoreDuplicates: false });
      if (upsertErr) throw new Error(`Failed to save product links: ${upsertErr.message}`);
    }

    console.log(`[link-products] Linked ${linkedSkus.size} SKUs (${rows.length} rows) for user ${userId}`);

    return new Response(
      JSON.stringify({ success: true, linked: rows.length, skus_linked: linkedSkus.size }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[link-products] Error:', error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
