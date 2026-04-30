import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { decrypt, isEncrypted } from '../_shared/encryption.ts';

const SHOPIFY_API_VERSION = '2024-01';

// Verify the request genuinely came from Shopify
async function verifyShopifyHmac(body: string, hmacHeader: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  const computed = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return computed === hmacHeader;
}

serve(async (req) => {
  try {
    const shopDomain = req.headers.get('x-shopify-shop-domain') ?? '';
    const hmacHeader = req.headers.get('x-shopify-hmac-sha256') ?? '';
    const topic = req.headers.get('x-shopify-topic') ?? '';

    const rawBody = await req.text();

    // Only handle order creation/payment topics
    if (!['orders/create', 'orders/paid'].includes(topic)) {
      return new Response('ok', { status: 200 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Look up the platform by shop domain to get the user and webhook secret
    const { data: platform } = await supabase
      .from('platforms')
      .select('*')
      .eq('shop_domain', shopDomain)
      .eq('platform_type', 'shopify')
      .eq('is_active', true)
      .single();

    if (!platform) {
      console.warn(`[shopify-order-webhook] Unknown shop domain: ${shopDomain}`);
      return new Response('ok', { status: 200 });
    }

    // Verify HMAC using the platform's access token as the secret (Shopify standard)
    let token = platform.access_token;
    if (token && isEncrypted(token)) token = await decrypt(token);

    const webhookSecret = platform.metadata?.webhook_secret;
    if (webhookSecret) {
      const valid = await verifyShopifyHmac(rawBody, hmacHeader, webhookSecret);
      if (!valid) {
        console.error('[shopify-order-webhook] HMAC verification failed');
        return new Response('Unauthorized', { status: 401 });
      }
    }

    const order = JSON.parse(rawBody);
    console.log(`[shopify-order-webhook] Processing order ${order.id} for ${shopDomain}`);

    // Collect all line items with SKUs and their final quantities
    const skuUpdates: { sku: string; quantity: number }[] = [];

    for (const lineItem of order.line_items ?? []) {
      const sku = lineItem.sku;
      if (!sku) continue;

      // Fetch current inventory from Shopify for this variant
      const variantRes = await fetch(
        `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/variants/${lineItem.variant_id}.json`,
        { headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' } }
      );

      if (!variantRes.ok) continue;
      const { variant } = await variantRes.json();

      // Get inventory level
      const invRes = await fetch(
        `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/inventory_levels.json?inventory_item_ids=${variant.inventory_item_id}`,
        { headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' } }
      );

      if (!invRes.ok) continue;
      const { inventory_levels } = await invRes.json();
      const totalQty = (inventory_levels ?? []).reduce((sum: number, l: any) => sum + (l.available ?? 0), 0);

      skuUpdates.push({ sku, quantity: totalQty });
    }

    if (skuUpdates.length === 0) {
      return new Response('ok', { status: 200 });
    }

    // Trigger cross-platform sync for each SKU
    const syncUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/sync-inventory-levels`;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    await Promise.all(skuUpdates.map(({ sku, quantity }) =>
      fetch(syncUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceRoleKey}` },
        body: JSON.stringify({
          user_id: platform.user_id,
          sku,
          new_quantity: quantity,
          source_platform_id: platform.id,
          source_platform_type: 'shopify',
          triggered_by: 'webhook',
        }),
      })
    ));

    return new Response('ok', { status: 200 });

  } catch (error) {
    console.error('[shopify-order-webhook] Error:', error.message);
    // Always return 200 to Shopify to prevent retries on our own errors
    return new Response('ok', { status: 200 });
  }
});
