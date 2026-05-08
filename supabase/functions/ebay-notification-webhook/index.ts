import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// eBay Commerce Notification API endpoint
// GET  ?challenge_code=xxx  → respond with SHA256(challengeCode + verificationToken + endpointUrl)
// POST                      → process order event, trigger inventory sync

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  const url = new URL(req.url);
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // ── Challenge verification (eBay sends GET with challenge_code to activate endpoint) ──
  if (req.method === 'GET') {
    const challengeCode = url.searchParams.get('challenge_code');
    if (!challengeCode) return new Response('ok', { status: 200 });

    // Look up any eBay platform to get the verification token
    // (all eBay platforms for a given app share the same verification token stored in app config)
    const verificationToken = Deno.env.get('EBAY_NOTIFICATION_VERIFICATION_TOKEN');
    if (!verificationToken) {
      console.error('[ebay-notification-webhook] EBAY_NOTIFICATION_VERIFICATION_TOKEN not set');
      return new Response('Configuration error', { status: 500 });
    }

    const endpointUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/ebay-notification-webhook`;
    const challengeResponse = await sha256Hex(challengeCode + verificationToken + endpointUrl);

    return new Response(JSON.stringify({ challengeResponse }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ── Event notification (POST) ──
  if (req.method !== 'POST') return new Response('ok', { status: 200 });

  try {
    const rawBody = await req.text();
    let payload: any = {};
    try { payload = JSON.parse(rawBody); } catch { return new Response('ok', { status: 200 }); }

    const topic = payload?.metadata?.topic ?? '';
    const notifData = payload?.notification?.data ?? {};

    console.log(`[ebay-notification-webhook] Received topic=${topic}`);

    // We subscribe to marketplace.ORDER — fires when an order is created
    if (!topic.includes('ORDER') && !topic.includes('CHECKOUT')) {
      return new Response('ok', { status: 200 });
    }

    // eBay order notifications include orderId; fetch the full order from Fulfillment API
    const orderId = notifData.orderId ?? notifData.order_id;
    if (!orderId) return new Response('ok', { status: 200 });

    // Find the eBay platform — use seller_id or username from the notification if available,
    // otherwise iterate active eBay platforms and try each
    const { data: ebayPlatforms } = await supabase
      .from('platforms')
      .select('*')
      .eq('platform_type', 'ebay')
      .eq('is_active', true);

    if (!ebayPlatforms?.length) return new Response('ok', { status: 200 });

    // Try each eBay platform until we find the one that owns this order
    for (const platform of ebayPlatforms) {
      try {
        await processEbayOrder(platform, orderId, supabase);
      } catch (e: any) {
        console.warn(`[ebay-notification-webhook] Platform ${platform.id} order fetch failed: ${e.message}`);
      }
    }

    return new Response('ok', { status: 200 });

  } catch (error) {
    console.error('[ebay-notification-webhook] Error:', error.message);
    return new Response('ok', { status: 200 }); // always 200 so eBay doesn't disable the endpoint
  }
});

async function getEbayToken(platform: any): Promise<{ token: string; apiBase: string }> {
  const creds = platform.credentials ?? {};
  const meta = platform.metadata ?? {};
  const isSandbox = meta.environment === 'sandbox';
  const apiBase = isSandbox ? 'https://api.sandbox.ebay.com' : 'https://api.ebay.com';
  let token = creds.access_token;

  const expiresAt = meta.token_expires_at ? new Date(meta.token_expires_at).getTime() : 0;
  if (!meta.token_expires_at || Date.now() > expiresAt - 5 * 60 * 1000) {
    const clientId = Deno.env.get('EBAY_CLIENT_ID');
    const clientSecret = Deno.env.get('EBAY_CLIENT_SECRET');
    if (clientId && clientSecret && creds.refresh_token) {
      const tokenUrl = isSandbox
        ? 'https://api.sandbox.ebay.com/identity/v1/oauth2/token'
        : 'https://api.ebay.com/identity/v1/oauth2/token';
      const res = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        },
        body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: creds.refresh_token }).toString(),
      });
      if (res.ok) {
        const data = await res.json();
        token = data.access_token;
      }
    }
  }

  if (!token) throw new Error('No eBay access token available');
  return { token, apiBase };
}

async function processEbayOrder(platform: any, orderId: string, supabase: any) {
  const { token, apiBase } = await getEbayToken(platform);
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  // Fetch the order from eBay Fulfillment API
  const orderRes = await fetch(`${apiBase}/sell/fulfillment/v1/order/${encodeURIComponent(orderId)}`, { headers });
  if (!orderRes.ok) {
    // 404 means this platform doesn't own this order — expected when iterating all platforms
    if (orderRes.status === 404) return;
    throw new Error(`eBay order fetch failed: ${orderRes.status}`);
  }

  const order = await orderRes.json();
  const syncUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/sync-inventory-levels`;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  const syncs: Promise<any>[] = [];

  for (const lineItem of order.lineItems ?? []) {
    const sku = lineItem.sku;
    if (!sku) continue;

    // Fetch current inventory for this SKU from eBay Inventory API
    const invRes = await fetch(
      `${apiBase}/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`,
      { headers }
    );
    if (!invRes.ok) continue;
    const invData = await invRes.json();
    const qty = invData.availability?.shipToLocationAvailability?.quantity ?? 0;

    console.log(`[ebay-notification-webhook] SKU=${sku} current_qty=${qty}`);

    syncs.push(fetch(syncUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceKey}` },
      body: JSON.stringify({
        user_id: platform.user_id,
        sku,
        new_quantity: qty,
        source_platform_id: platform.id,
        source_platform_type: 'ebay',
        triggered_by: 'webhook',
      }),
    }));
  }

  await Promise.all(syncs);
  console.log(`[ebay-notification-webhook] Triggered ${syncs.length} sync(s) for order ${orderId}`);
}
