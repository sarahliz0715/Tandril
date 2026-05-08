import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Returns a paginated, searchable product list for a given platform.
// Used by the visual product linker UI.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SHOPIFY_API_VERSION = '2024-01';

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;

async function getEncryptionKey(): Promise<CryptoKey> {
  const secret = Deno.env.get('ENCRYPTION_SECRET');
  if (!secret) throw new Error('ENCRYPTION_SECRET not set');
  const encoder = new TextEncoder();
  const km = await crypto.subtle.importKey('raw', encoder.encode(secret), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: encoder.encode('tandril-encryption-salt-v1'), iterations: 100000, hash: 'SHA-256' },
    km, { name: ALGORITHM, length: KEY_LENGTH }, false, ['encrypt', 'decrypt']
  );
}
async function decrypt(enc: string): Promise<string> {
  const key = await getEncryptionKey();
  const combined = Uint8Array.from(atob(enc), c => c.charCodeAt(0));
  const dec = await crypto.subtle.decrypt({ name: ALGORITHM, iv: combined.slice(0, IV_LENGTH) }, key, combined.slice(IV_LENGTH));
  return new TextDecoder().decode(dec);
}
function isEncrypted(v: string): boolean {
  try { return atob(v).length > IV_LENGTH; } catch { return false; }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let body: any = {};
    try { const t = await req.text(); if (t) body = JSON.parse(t); } catch { /**/ }

    const { user_id, platform_id, search = '', page = 1 } = body;
    if (!user_id || !platform_id) throw new Error('Missing user_id or platform_id');

    const { data: platform, error: platErr } = await supabase
      .from('platforms')
      .select('*')
      .eq('id', platform_id)
      .eq('user_id', user_id)
      .single();

    if (platErr || !platform) throw new Error('Platform not found');

    const products = await fetchProducts(platform, search, page);

    return new Response(JSON.stringify({ success: true, products }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[fetch-platform-products]', error.message);
    return new Response(JSON.stringify({ success: false, error: error.message, products: [] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
    });
  }
});

// Normalised product shape: { id, title, sku, quantity, image_url, variants: [{id, label}] }
async function fetchProducts(platform: any, search: string, page: number): Promise<any[]> {
  switch (platform.platform_type) {
    case 'shopify': return fetchShopifyProducts(platform, search, page);
    case 'woocommerce': return fetchWooProducts(platform, search, page);
    case 'etsy': return fetchEtsyProducts(platform, search, page);
    case 'ebay': return fetchEbayProducts(platform, search, page);
    default: return [];
  }
}

async function fetchShopifyProducts(platform: any, search: string, page: number) {
  let token = platform.access_token;
  if (token && isEncrypted(token)) token = await decrypt(token);
  if (!token) throw new Error('Shopify token missing');

  const limit = 20;
  const params = new URLSearchParams({ limit: String(limit), fields: 'id,title,variants,image' });
  if (search) params.set('title', search);
  // Shopify pagination uses page_info, so approximate with since_id for simplicity
  const res = await fetch(
    `https://${platform.shop_domain}/admin/api/${SHOPIFY_API_VERSION}/products.json?${params}`,
    { headers: { 'X-Shopify-Access-Token': token } }
  );
  if (!res.ok) throw new Error(`Shopify products fetch failed: ${res.status}`);
  const { products } = await res.json();

  return (products ?? []).map((p: any) => ({
    id: String(p.id),
    title: p.title,
    sku: p.variants?.[0]?.sku || '',
    quantity: p.variants?.[0]?.inventory_quantity ?? 0,
    image_url: p.image?.src ?? null,
    variants: (p.variants ?? []).map((v: any) => ({
      id: String(v.id),
      label: v.title === 'Default Title' ? 'Default' : `${v.title}${v.sku ? ` — ${v.sku}` : ''}`,
      sku: v.sku || '',
      quantity: v.inventory_quantity ?? 0,
    })),
  }));
}

async function fetchWooProducts(platform: any, search: string, page: number) {
  let token = platform.access_token;
  if (token && isEncrypted(token)) token = await decrypt(token);
  const ck = token ? token.split(':')[0] : platform.credentials?.consumer_key;
  const cs = token ? token.split(':')[1] : platform.credentials?.consumer_secret;
  if (!ck || !cs) throw new Error('WooCommerce credentials missing');

  const storeUrl = platform.store_url || platform.shop_domain;
  const auth = `Basic ${btoa(`${ck}:${cs}`)}`;
  const params = new URLSearchParams({ per_page: '20', page: String(page), status: 'publish' });
  if (search) params.set('search', search);

  const res = await fetch(`${storeUrl}/wp-json/wc/v3/products?${params}`, { headers: { Authorization: auth } });
  if (!res.ok) throw new Error(`WooCommerce products fetch failed: ${res.status}`);
  const products = await res.json();

  return (products ?? []).map((p: any) => ({
    id: String(p.id),
    title: p.name,
    sku: p.sku || '',
    quantity: p.stock_quantity ?? 0,
    image_url: p.images?.[0]?.src ?? null,
    variants: [], // loaded on demand via fetch-product-variants
  }));
}

async function fetchEtsyProducts(platform: any, search: string, page: number) {
  const token = platform.credentials?.access_token;
  const clientId = Deno.env.get('ETSY_CLIENT_ID');
  const shopId = platform.metadata?.shop_id;
  if (!token || !clientId || !shopId) throw new Error('Etsy credentials missing');

  const limit = 20;
  const offset = (page - 1) * limit;
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset), state: 'active' });
  if (search) params.set('keywords', search);

  const res = await fetch(
    `https://openapi.etsy.com/v3/application/shops/${shopId}/listings?${params}`,
    { headers: { 'x-api-key': clientId, Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(`Etsy listings fetch failed: ${res.status}`);
  const data = await res.json();

  return (data.results ?? []).map((l: any) => ({
    id: String(l.listing_id),
    title: l.title,
    sku: l.sku?.[0] || '',
    quantity: l.quantity ?? 0,
    image_url: l.images?.[0]?.url_570xN ?? null,
    variants: [], // loaded on demand
  }));
}

async function fetchEbayProducts(platform: any, search: string, page: number) {
  const creds = platform.credentials ?? {};
  const meta = platform.metadata ?? {};
  const isSandbox = meta.environment === 'sandbox';
  const apiBase = isSandbox ? 'https://api.sandbox.ebay.com' : 'https://api.ebay.com';
  let token = creds.access_token;

  // Refresh if needed
  const expiresAt = meta.token_expires_at ? new Date(meta.token_expires_at).getTime() : 0;
  if (!meta.token_expires_at || Date.now() > expiresAt - 5 * 60 * 1000) {
    const ck = Deno.env.get('EBAY_CLIENT_ID'), cs = Deno.env.get('EBAY_CLIENT_SECRET');
    if (ck && cs && creds.refresh_token) {
      const r = await fetch(
        isSandbox ? 'https://api.sandbox.ebay.com/identity/v1/oauth2/token' : 'https://api.ebay.com/identity/v1/oauth2/token',
        { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${btoa(`${ck}:${cs}`)}` },
          body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: creds.refresh_token }).toString() }
      );
      if (r.ok) token = (await r.json()).access_token;
    }
  }
  if (!token) throw new Error('eBay token missing');

  const limit = 20;
  const offset = (page - 1) * limit;
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (search) params.set('q', search);

  const res = await fetch(`${apiBase}/sell/inventory/v1/inventory_item?${params}`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`eBay inventory fetch failed: ${res.status}`);
  const data = await res.json();

  return (data.inventoryItems ?? []).map((item: any) => ({
    id: item.sku,
    title: item.product?.title || item.sku,
    sku: item.sku,
    quantity: item.availability?.shipToLocationAvailability?.quantity ?? 0,
    image_url: item.product?.imageUrls?.[0] ?? null,
    variants: [], // eBay is SKU-level, no sub-variants
  }));
}
