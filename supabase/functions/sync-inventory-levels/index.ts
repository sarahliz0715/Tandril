import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { decrypt, isEncrypted } from '../_shared/encryption.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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

    const { user_id, sku, new_quantity, source_platform_id, source_platform_type, triggered_by } = body;

    if (!user_id || !sku || new_quantity === undefined) {
      throw new Error('Missing required fields: user_id, sku, new_quantity');
    }

    console.log(`[sync-inventory-levels] SKU=${sku} qty=${new_quantity} user=${user_id}`);

    // Find all platform links for this SKU, excluding the source platform
    const { data: links, error: linksError } = await supabase
      .from('platform_product_links')
      .select('*, platforms(*)')
      .eq('user_id', user_id)
      .eq('sku', sku)
      .neq('platform_id', source_platform_id ?? '');

    if (linksError) throw new Error(`Failed to fetch product links: ${linksError.message}`);

    if (!links || links.length === 0) {
      console.log(`[sync-inventory-levels] No linked platforms found for SKU=${sku}`);
      return new Response(
        JSON.stringify({ success: true, synced: 0, message: 'No linked platforms for this SKU' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const syncResults: any[] = [];

    for (const link of links) {
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
          default:
            result.skipped = true;
            result.reason = `${link.platform_type} sync not yet implemented`;
        }
      } catch (err) {
        result.error = err.message;
        console.error(`[sync-inventory-levels] Failed for ${link.platform_type}:`, err.message);
      }

      syncResults.push(result);

      // Update last_synced_at
      if (result.success) {
        await supabase
          .from('platform_product_links')
          .update({ last_synced_at: new Date().toISOString() })
          .eq('id', link.id);
      }
    }

    // Write audit log
    await supabase.from('inventory_sync_log').insert({
      user_id,
      sku,
      source_platform_type,
      source_platform_id: source_platform_id ?? null,
      new_quantity,
      synced_platforms: syncResults,
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

async function syncShopify(platform: any, link: any, qty: number, token: string, result: any) {
  const shopDomain = platform.shop_domain;

  // Get the variant's inventory_item_id
  const variantRes = await fetch(
    `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/variants/${link.platform_variant_id}.json`,
    { headers: { 'X-Shopify-Access-Token': token } }
  );
  if (!variantRes.ok) throw new Error(`Shopify variant fetch failed: ${variantRes.status}`);
  const { variant } = await variantRes.json();

  // Get primary location
  const locRes = await fetch(
    `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/locations.json`,
    { headers: { 'X-Shopify-Access-Token': token } }
  );
  if (!locRes.ok) throw new Error(`Shopify locations fetch failed: ${locRes.status}`);
  const { locations } = await locRes.json();
  const locationId = locations?.[0]?.id;
  if (!locationId) throw new Error('No Shopify location found');

  // Set inventory level
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
