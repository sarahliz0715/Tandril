import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Etsy v3 webhook handler for RECEIPT events (order placed)
// Etsy sends POST with { subscription_id, trigger_event, shop_id, receipt_id }
// We fetch the receipt details, get listing IDs, look up linked products, sync inventory

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  // Etsy sends a test POST when registering the webhook — respond 200 immediately
  if (req.method !== 'POST') return new Response('ok', { status: 200 });

  try {
    const rawBody = await req.text();
    let payload: any = {};
    try { payload = JSON.parse(rawBody); } catch { return new Response('ok', { status: 200 }); }

    const { trigger_event, shop_id, receipt_id } = payload;

    // Only handle receipt (order) events
    if (trigger_event !== 'RECEIPT' || !shop_id || !receipt_id) {
      return new Response('ok', { status: 200 });
    }

    console.log(`[etsy-order-webhook] RECEIPT event shop_id=${shop_id} receipt_id=${receipt_id}`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find the Etsy platform by shop_id stored in metadata
    const { data: platform } = await supabase
      .from('platforms')
      .select('*')
      .eq('platform_type', 'etsy')
      .eq('is_active', true)
      .eq('metadata->>shop_id', String(shop_id))
      .single();

    if (!platform) {
      console.warn(`[etsy-order-webhook] No platform found for shop_id=${shop_id}`);
      return new Response('ok', { status: 200 });
    }

    const etsyToken = platform.credentials?.access_token;
    const etsyClientId = Deno.env.get('ETSY_CLIENT_ID');
    if (!etsyToken || !etsyClientId) {
      console.error('[etsy-order-webhook] Missing Etsy credentials');
      return new Response('ok', { status: 200 });
    }

    const etsyHeaders = { 'x-api-key': etsyClientId, 'Authorization': `Bearer ${etsyToken}` };

    // Fetch the receipt to get the purchased listings
    const receiptRes = await fetch(
      `https://openapi.etsy.com/v3/application/shops/${shop_id}/receipts/${receipt_id}`,
      { headers: etsyHeaders }
    );
    if (!receiptRes.ok) {
      console.error(`[etsy-order-webhook] Receipt fetch failed: ${receiptRes.status}`);
      return new Response('ok', { status: 200 });
    }
    const receipt = await receiptRes.json();

    const syncUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/sync-inventory-levels`;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // Each transaction in the receipt = one purchased listing
    const seenListings = new Set<string>();
    const syncs: Promise<any>[] = [];

    for (const txn of receipt.transactions ?? []) {
      const listingId = String(txn.listing_id ?? '');
      if (!listingId || seenListings.has(listingId)) continue;
      seenListings.add(listingId);

      // Find the platform_product_link for this listing to get the SKU
      const { data: link } = await supabase
        .from('platform_product_links')
        .select('sku, platform_variant_id')
        .eq('user_id', platform.user_id)
        .eq('platform_id', platform.id)
        .eq('platform_product_id', listingId)
        .maybeSingle();

      if (!link?.sku) {
        console.log(`[etsy-order-webhook] No link found for listing_id=${listingId} — skipping`);
        continue;
      }

      // Fetch current inventory for this listing from Etsy
      const invRes = await fetch(
        `https://openapi.etsy.com/v3/application/listings/${listingId}/inventory`,
        { headers: etsyHeaders }
      );
      if (!invRes.ok) continue;
      const inv = await invRes.json();

      // Sum total available across all offerings (or just the linked offering if variant_id set)
      const offeringId = link.platform_variant_id ? String(link.platform_variant_id) : null;
      let qty = 0;
      for (const product of inv.products ?? []) {
        for (const offering of product.offerings ?? []) {
          if (offeringId && String(offering.offering_id) !== offeringId) continue;
          qty += offering.quantity ?? 0;
        }
      }

      console.log(`[etsy-order-webhook] listing_id=${listingId} sku=${link.sku} qty=${qty}`);

      syncs.push(fetch(syncUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceKey}` },
        body: JSON.stringify({
          user_id: platform.user_id,
          sku: link.sku,
          new_quantity: qty,
          source_platform_id: platform.id,
          source_platform_type: 'etsy',
          triggered_by: 'webhook',
        }),
      }));
    }

    await Promise.all(syncs);
    console.log(`[etsy-order-webhook] Triggered ${syncs.length} sync(s) for receipt ${receipt_id}`);
    return new Response('ok', { status: 200 });

  } catch (error) {
    console.error('[etsy-order-webhook] Error:', error.message);
    return new Response('ok', { status: 200 }); // always 200 so Etsy doesn't disable the webhook
  }
});
