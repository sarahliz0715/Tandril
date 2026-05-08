import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SHOPIFY_API_VERSION = '2024-01';

// --- Inlined encryption helpers ---
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
// --- End encryption helpers ---

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let body: any = {};
    try { const t = await req.text(); if (t) body = JSON.parse(t); } catch { /**/ }

    const { user_id, platform_id, product_id } = body;
    if (!user_id || !platform_id || !product_id) {
      throw new Error('Missing required fields: user_id, platform_id, product_id');
    }

    const { data: platform, error: platErr } = await supabase
      .from('platforms')
      .select('*')
      .eq('id', platform_id)
      .eq('user_id', user_id)
      .single();

    if (platErr || !platform) throw new Error('Platform not found');

    const variants = await fetchVariants(platform, product_id);

    return new Response(
      JSON.stringify({ success: true, variants }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[fetch-product-variants]', error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message, variants: [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});

async function fetchVariants(platform: any, productId: string): Promise<{ id: string; label: string }[]> {
  switch (platform.platform_type) {
    case 'shopify':
      return fetchShopifyVariants(platform, productId);
    case 'woocommerce':
      return fetchWooVariants(platform, productId);
    case 'etsy':
      return fetchEtsyOfferings(platform, productId);
    case 'ebay':
      // eBay uses SKU as the product identifier — no sub-variant concept in the link modal
      return [];
    default:
      return [];
  }
}

async function fetchShopifyVariants(platform: any, productId: string): Promise<{ id: string; label: string }[]> {
  let token = platform.access_token;
  if (token && isEncrypted(token)) token = await decrypt(token);
  if (!token) throw new Error('Shopify access token missing');

  const res = await fetch(
    `https://${platform.shop_domain}/admin/api/${SHOPIFY_API_VERSION}/products/${productId}.json?fields=id,variants`,
    { headers: { 'X-Shopify-Access-Token': token } }
  );
  if (!res.ok) throw new Error(`Shopify product fetch failed: ${res.status}`);
  const { product } = await res.json();

  return (product?.variants ?? []).map((v: any) => ({
    id: String(v.id),
    label: v.title === 'Default Title' ? 'Default (no variants)' : `${v.title}${v.sku ? ` — SKU: ${v.sku}` : ''}`,
  }));
}

async function fetchWooVariants(platform: any, productId: string): Promise<{ id: string; label: string }[]> {
  let token = platform.access_token;
  if (token && isEncrypted(token)) token = await decrypt(token);
  if (!token) throw new Error('WooCommerce access token missing');

  const storeUrl = platform.store_url || platform.shop_domain;
  const [ck, cs] = token.split(':');
  const auth = btoa(`${ck}:${cs}`);

  const res = await fetch(
    `${storeUrl}/wp-json/wc/v3/products/${productId}/variations?per_page=100`,
    { headers: { 'Authorization': `Basic ${auth}` } }
  );
  if (!res.ok) {
    // Product may be simple (no variations) — return empty so modal falls back to plain input
    return [];
  }
  const variations = await res.json();
  if (!Array.isArray(variations) || variations.length === 0) return [];

  return variations.map((v: any) => ({
    id: String(v.id),
    label: (v.attributes ?? []).map((a: any) => a.option).join(' / ') || `Variation #${v.id}`,
  }));
}

async function fetchEtsyOfferings(platform: any, listingId: string): Promise<{ id: string; label: string }[]> {
  const token = platform.credentials?.access_token;
  const clientId = Deno.env.get('ETSY_CLIENT_ID');
  if (!token || !clientId) throw new Error('Etsy credentials missing');

  const res = await fetch(
    `https://openapi.etsy.com/v3/application/listings/${listingId}/inventory`,
    { headers: { 'x-api-key': clientId, 'Authorization': `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(`Etsy inventory fetch failed: ${res.status}`);
  const inv = await res.json();

  const variants: { id: string; label: string }[] = [];
  for (const product of (inv.products ?? [])) {
    for (const offering of (product.offerings ?? [])) {
      const label = (product.property_values ?? [])
        .map((pv: any) => `${pv.property_name}: ${(pv.values ?? []).join(', ')}`)
        .join(' / ') || `Offering #${offering.offering_id}`;
      variants.push({ id: String(offering.offering_id), label });
    }
  }
  return variants;
}
