import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// --- Inlined encryption helpers ---
const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;

async function getEncryptionKey(): Promise<CryptoKey> {
  const secret = Deno.env.get('ENCRYPTION_SECRET');
  if (!secret) throw new Error('ENCRYPTION_SECRET environment variable not set');
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

const SHOPIFY_API_VERSION = '2024-01';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let body: any = {};
    try { const t = await req.text(); if (t) body = JSON.parse(t); } catch { /**/ }

    const { user_id, sku, source_platform_id, source_platform_type, triggered_by } = body;
    let { new_quantity } = body;

    if (!user_id || !sku) {
      throw new Error('Missing required fields: user_id, sku');
    }

    // Load ALL links for this SKU so we can resolve qty from source if needed
    const { data: allLinks, error: allLinksError } = await supabase
      .from('platform_product_links')
      .select('*, platforms(*)')
      .eq('user_id', user_id)
      .eq('sku', sku);

    if (allLinksError) throw new Error(`Failed to fetch product links: ${allLinksError.message}`);
    if (!allLinks || allLinks.length === 0) {
      return new Response(
        JSON.stringify({ success: true, synced: 0, message: 'No linked platforms for this SKU' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If no quantity provided, fetch current qty from the source platform (or first active platform)
    if (new_quantity === null || new_quantity === undefined) {
      const sourceLink = source_platform_id
        ? allLinks.find(l => l.platform_id === source_platform_id)
        : allLinks.find(l => l.platforms?.is_active);

      if (!sourceLink) throw new Error('No active source platform found to fetch current quantity');

      const sourcePlatform = sourceLink.platforms;
      let sourceToken = sourcePlatform?.access_token;
      if (sourceToken && isEncrypted(sourceToken)) sourceToken = await decrypt(sourceToken);
      if (!sourceToken) throw new Error('Source platform has no access token');

      new_quantity = await fetchCurrentQty(sourcePlatform, sourceLink, sourceToken);
      console.log(`[sync-inventory-levels] Resolved qty=${new_quantity} from source platform ${sourcePlatform.platform_type}`);
    }

    if (new_quantity === null || new_quantity === undefined) {
      throw new Error('Could not resolve inventory quantity from source platform');
    }

    console.log(`[sync-inventory-levels] SKU=${sku} qty=${new_quantity} user=${user_id}`);

    // Target links = all platforms except the source
    const targetLinks = source_platform_id
      ? allLinks.filter(l => l.platform_id !== source_platform_id)
      : allLinks.slice(1); // skip the first (used as source above)

    if (targetLinks.length === 0) {
      return new Response(
        JSON.stringify({ success: true, synced: 0, message: 'No other platforms to sync to' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const syncResults: any[] = [];

    for (const link of targetLinks) {
      const platform = link.platforms;
      if (!platform || !platform.is_active) continue;

      let token = platform.access_token;
      if (token && isEncrypted(token)) token = await decrypt(token);
      if (!token) continue;

      let result: any = { platform_type: link.platform_type, platform_id: link.platform_id, success: false };

      try {
        switch (link.platform_type) {
          case 'shopify':
            result = await syncShopify(platform, link, new_quantity, token, result);
            break;
          case 'woocommerce':
            result = await syncWooCommerce(platform, link, new_quantity, token, result);
            break;
          case 'ebay':
            result = await syncEbay(platform, link, new_quantity, supabase, result);
            break;
          case 'etsy':
            result = await syncEtsy(platform, link, new_quantity, result);
            break;
          default:
            result.skipped = true;
            result.reason = `${link.platform_type} sync not yet implemented`;
        }
      } catch (err) {
        result.error = err.message;
        console.error(`[sync-inventory-levels] Failed for ${link.platform_type}:`, err.message);
      }

      syncResults.push(result);

      if (result.success) {
        await supabase
          .from('platform_product_links')
          .update({ last_synced_at: new Date().toISOString() })
          .eq('id', link.id);
      }
    }

    const resolvedSourceType = source_platform_type
      ?? allLinks.find(l => l.platform_id === source_platform_id)?.platform_type
      ?? allLinks[0]?.platform_type;

    await supabase.from('inventory_sync_log').insert({
      user_id, sku,
      source_platform_type: resolvedSourceType,
      source_platform_id: source_platform_id ?? allLinks[0]?.platform_id ?? null,
      new_quantity, synced_platforms: syncResults,
      triggered_by: triggered_by ?? 'manual',
    });

    const succeeded = syncResults.filter(r => r.success).length;
    console.log(`[sync-inventory-levels] Synced ${succeeded}/${syncResults.length} platforms for SKU=${sku}`);

    return new Response(
      JSON.stringify({ success: true, synced: succeeded, total: syncResults.length, results: syncResults }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[sync-inventory-levels] Error:', error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});

async function fetchCurrentQty(platform: any, link: any, token: string): Promise<number> {
  switch (platform.platform_type) {
    case 'shopify': {
      const shopDomain = platform.shop_domain;
      const variantId = link.platform_variant_id;
      if (!variantId) throw new Error('Shopify source link requires a variant ID to fetch current quantity');
      const res = await fetch(
        `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/variants/${variantId}.json`,
        { headers: { 'X-Shopify-Access-Token': token } }
      );
      if (!res.ok) throw new Error(`Shopify variant fetch failed: ${res.status}`);
      const { variant } = await res.json();
      return variant.inventory_quantity ?? 0;
    }
    case 'woocommerce': {
      const storeUrl = platform.store_url || platform.shop_domain;
      const [ck, cs] = token.split(':');
      const credentials = btoa(`${ck}:${cs}`);
      const endpoint = link.platform_variant_id
        ? `${storeUrl}/wp-json/wc/v3/products/${link.platform_product_id}/variations/${link.platform_variant_id}`
        : `${storeUrl}/wp-json/wc/v3/products/${link.platform_product_id}`;
      const res = await fetch(endpoint, { headers: { 'Authorization': `Basic ${credentials}` } });
      if (!res.ok) throw new Error(`WooCommerce product fetch failed: ${res.status}`);
      const data = await res.json();
      return data.stock_quantity ?? 0;
    }
    case 'ebay': {
      const { accessToken, apiBase } = await resolveEbayToken(platform);
      const sku = link.sku;
      const res = await fetch(
        `${apiBase}/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`,
        { headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
      );
      if (!res.ok) throw new Error(`eBay inventory fetch failed: ${res.status}`);
      const data = await res.json();
      return data.availability?.shipToLocationAvailability?.quantity ?? 0;
    }
    case 'etsy': {
      const etsyTok = platform.credentials?.access_token;
      const etsyClientId = Deno.env.get('ETSY_CLIENT_ID');
      if (!etsyTok || !etsyClientId) throw new Error('Etsy credentials missing');
      const listingId = link.platform_product_id;
      const res = await fetch(
        `https://openapi.etsy.com/v3/application/listings/${listingId}/inventory`,
        { headers: { 'x-api-key': etsyClientId, 'Authorization': `Bearer ${etsyTok}` } }
      );
      if (!res.ok) throw new Error(`Etsy inventory fetch failed: ${res.status}`);
      const data = await res.json();
      // Sum quantities across all products/offerings
      let total = 0;
      for (const product of (data.products ?? [])) {
        for (const offering of (product.offerings ?? [])) {
          total += offering.quantity ?? 0;
        }
      }
      return total;
    }
    default:
      throw new Error(`Cannot fetch current quantity from ${platform.platform_type} — not supported as sync source`);
  }
}

async function syncShopify(platform: any, link: any, qty: number, token: string, result: any) {
  const shopDomain = platform.shop_domain;
  const variantRes = await fetch(
    `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/variants/${link.platform_variant_id}.json`,
    { headers: { 'X-Shopify-Access-Token': token } }
  );
  if (!variantRes.ok) throw new Error(`Shopify variant fetch failed: ${variantRes.status}`);
  const { variant } = await variantRes.json();

  const locRes = await fetch(
    `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/locations.json`,
    { headers: { 'X-Shopify-Access-Token': token } }
  );
  if (!locRes.ok) throw new Error(`Shopify locations fetch failed: ${locRes.status}`);
  const { locations } = await locRes.json();
  const locationId = locations?.[0]?.id;
  if (!locationId) throw new Error('No Shopify location found');

  const setRes = await fetch(
    `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/inventory_levels/set.json`,
    {
      method: 'POST',
      headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ location_id: locationId, inventory_item_id: variant.inventory_item_id, available: qty }),
    }
  );
  if (!setRes.ok) throw new Error(`Shopify inventory set failed: ${setRes.status}`);
  return { ...result, success: true };
}

async function syncWooCommerce(platform: any, link: any, qty: number, token: string, result: any) {
  const storeUrl = platform.store_url || platform.shop_domain;
  const [consumerKey, consumerSecret] = token.split(':');
  const credentials = btoa(`${consumerKey}:${consumerSecret}`);

  const endpoint = link.platform_variant_id
    ? `${storeUrl}/wp-json/wc/v3/products/${link.platform_product_id}/variations/${link.platform_variant_id}`
    : `${storeUrl}/wp-json/wc/v3/products/${link.platform_product_id}`;

  const res = await fetch(endpoint, {
    method: 'PUT',
    headers: { 'Authorization': `Basic ${credentials}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ stock_quantity: qty, manage_stock: true }),
  });
  if (!res.ok) throw new Error(`WooCommerce update failed: ${res.status}`);
  return { ...result, success: true };
}

async function resolveEbayToken(platform: any): Promise<{ accessToken: string; apiBase: string }> {
  const credentials = platform.credentials ?? {};
  const metadata = platform.metadata ?? {};
  const isSandbox = metadata.environment === 'sandbox';
  const apiBase = isSandbox ? 'https://api.sandbox.ebay.com' : 'https://api.ebay.com';
  let accessToken = credentials.access_token;

  const tokenExpiresAt = metadata.token_expires_at ? new Date(metadata.token_expires_at).getTime() : 0;
  const needsRefresh = !metadata.token_expires_at || Date.now() > tokenExpiresAt - 5 * 60 * 1000;

  if (needsRefresh && credentials.refresh_token) {
    const ebayClientId = Deno.env.get('EBAY_CLIENT_ID');
    const ebayClientSecret = Deno.env.get('EBAY_CLIENT_SECRET');
    if (ebayClientId && ebayClientSecret) {
      const tokenUrl = isSandbox
        ? 'https://api.sandbox.ebay.com/identity/v1/oauth2/token'
        : 'https://api.ebay.com/identity/v1/oauth2/token';
      const refreshRes = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${btoa(`${ebayClientId}:${ebayClientSecret}`)}`,
        },
        body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: credentials.refresh_token }).toString(),
      });
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        accessToken = refreshData.access_token;
      }
    }
  }

  if (!accessToken) throw new Error('eBay access token missing or could not be refreshed');
  return { accessToken, apiBase };
}

async function syncEbay(platform: any, link: any, qty: number, supabase: any, result: any) {
  const { accessToken, apiBase } = await resolveEbayToken(platform);
  const sku = link.sku;
  const headers = { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

  // Fetch current inventory item to preserve existing fields
  const getRes = await fetch(`${apiBase}/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`, { headers });
  if (!getRes.ok) throw new Error(`eBay inventory fetch failed: ${getRes.status}`);
  const item = await getRes.json();

  // Update quantity and PUT back
  const updated = {
    ...item,
    availability: {
      ...item.availability,
      shipToLocationAvailability: {
        ...(item.availability?.shipToLocationAvailability ?? {}),
        quantity: qty,
      },
    },
  };

  const putRes = await fetch(`${apiBase}/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(updated),
  });
  if (!putRes.ok) throw new Error(`eBay inventory update failed: ${putRes.status}`);
  return { ...result, success: true };
}

async function syncEtsy(platform: any, link: any, qty: number, result: any) {
  const etsyTok = platform.credentials?.access_token;
  const etsyClientId = Deno.env.get('ETSY_CLIENT_ID');
  if (!etsyTok || !etsyClientId) throw new Error('Etsy credentials missing');
  const listingId = link.platform_product_id;
  const headers = { 'x-api-key': etsyClientId, 'Authorization': `Bearer ${etsyTok}`, 'Content-Type': 'application/json' };

  // Fetch current inventory to preserve structure
  const getRes = await fetch(`https://openapi.etsy.com/v3/application/listings/${listingId}/inventory`, { headers });
  if (!getRes.ok) throw new Error(`Etsy inventory fetch failed: ${getRes.status}`);
  const inv = await getRes.json();

  const targetOfferingId = link.platform_variant_id ? String(link.platform_variant_id) : null;

  // If a specific offering (variant) is linked, only update that one; otherwise update all
  const updatedProducts = (inv.products ?? []).map((product: any) => ({
    ...product,
    offerings: (product.offerings ?? []).map((offering: any) => {
      if (targetOfferingId && String(offering.offering_id) !== targetOfferingId) return offering;
      return { ...offering, quantity: qty };
    }),
  }));

  const putRes = await fetch(`https://openapi.etsy.com/v3/application/listings/${listingId}/inventory`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ products: updatedProducts, price_on_property: inv.price_on_property, quantity_on_property: inv.quantity_on_property, sku_on_property: inv.sku_on_property }),
  });
  if (!putRes.ok) throw new Error(`Etsy inventory update failed: ${putRes.status}`);
  return { ...result, success: true };
}
