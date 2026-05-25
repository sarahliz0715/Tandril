import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

async function verifyWooHmac(body: string, signatureHeader: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  const computed = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return computed === signatureHeader;
}

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const platformId = url.searchParams.get('platform_id');
    if (!platformId) return new Response('ok', { status: 200 });

    const rawBody = await req.text();
    const topic = req.headers.get('x-wc-webhook-topic') ?? '';

    // Only handle order events
    if (!['order.created', 'order.updated'].includes(topic)) {
      return new Response('ok', { status: 200 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: platform } = await supabase
      .from('platforms')
      .select('*')
      .eq('id', platformId)
      .eq('platform_type', 'woocommerce')
      .eq('is_active', true)
      .single();

    if (!platform) {
      console.warn(`[woocommerce-order-webhook] Unknown platform_id: ${platformId}`);
      return new Response('ok', { status: 200 });
    }

    // Verify HMAC signature if secret is stored
    const webhookSecret = platform.metadata?.webhook_secret;
    if (webhookSecret) {
      const signature = req.headers.get('x-wc-webhook-signature') ?? '';
      const valid = await verifyWooHmac(rawBody, signature, webhookSecret);
      if (!valid) {
        console.error('[woocommerce-order-webhook] HMAC verification failed');
        return new Response('Unauthorized', { status: 401 });
      }
    }

    const order = JSON.parse(rawBody);
    console.log(`[woocommerce-order-webhook] Processing order ${order.id} for platform ${platformId}`);

    const storeUrl = platform.store_url || platform.shop_domain;
    const ck = platform.credentials?.consumer_key;
    const cs = platform.credentials?.consumer_secret;
    if (!storeUrl || !ck || !cs) {
      console.error('[woocommerce-order-webhook] Missing WooCommerce credentials');
      return new Response('ok', { status: 200 });
    }
    const auth = `Basic ${btoa(`${ck}:${cs}`)}`;

    const skuUpdates: { sku: string; quantity: number; productId: string; variationId?: string }[] = [];

    for (const lineItem of order.line_items ?? []) {
      const sku = lineItem.sku;
      if (!sku) continue;

      // Fetch current stock from WooCommerce (already decremented after the order)
      const variationId = lineItem.variation_id && lineItem.variation_id !== 0 ? String(lineItem.variation_id) : null;
      const endpoint = variationId
        ? `${storeUrl}/wp-json/wc/v3/products/${lineItem.product_id}/variations/${variationId}`
        : `${storeUrl}/wp-json/wc/v3/products/${lineItem.product_id}`;

      const stockRes = await fetch(endpoint, { headers: { 'Authorization': auth } });
      if (!stockRes.ok) {
        console.warn(`[woocommerce-order-webhook] Could not fetch stock for SKU ${sku}: ${stockRes.status}`);
        continue;
      }
      const product = await stockRes.json();
      if (!product.manage_stock) continue; // not tracking stock for this product

      skuUpdates.push({
        sku,
        quantity: product.stock_quantity ?? 0,
        productId: String(lineItem.product_id),
        variationId: variationId ?? undefined,
      });
    }

    if (skuUpdates.length === 0) return new Response('ok', { status: 200 });

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
          source_platform_type: 'woocommerce',
          triggered_by: 'webhook',
        }),
      })
    ));

    console.log(`[woocommerce-order-webhook] Triggered sync for ${skuUpdates.length} SKU(s)`);
    return new Response('ok', { status: 200 });

  } catch (error) {
    console.error('[woocommerce-order-webhook] Error:', error.message);
    return new Response('ok', { status: 200 }); // always 200 to WooCommerce
  }
});
