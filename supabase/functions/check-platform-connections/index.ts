// check-platform-connections
//
// Scheduled job (pg_cron, hourly — see migrations/20260925000003_platform_connection_check_cron.sql).
// Keeps store connections healthy so cross-platform inventory sync never silently stops.
// Covers every platform Tandril can sync inventory for: Shopify, WooCommerce, eBay, Etsy.
//
//   1. Checks each active connection's login with a tiny read. If the platform rejects it
//      (app uninstalled, token revoked/expired, API keys deleted) the connection is flagged
//      'needs_reconnect' and a notification-bell alert is created. A flagged connection that
//      works again is cleared. Non-auth failures (site down, platform outage) don't flag.
//   2. Repairs the order notifications that drive real-time sync:
//        - Shopify: re-registers any missing ORDERS_PAID / ORDERS_CANCELLED / REFUNDS_CREATE /
//          INVENTORY_LEVELS_UPDATE subscriptions (Shopify deletes them after repeated failures).
//        - WooCommerce: re-activates Tandril's order webhooks if WooCommerce disabled them
//          (it does after repeated delivery failures), or re-creates them if deleted.
//        - eBay / Etsy: login check only for now (see CLAUDE.md — eBay's notification setup
//          is unverified; Etsy's app is still pending approval).
//   3. Emails the seller about every broken connection (any platform) — immediately, then
//      reminders at 24h and 72h. See _shared/connectionAlerts.ts.
//
// POST /functions/v1/check-platform-connections   (service-role bearer only)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { decrypt, isEncrypted } from '../_shared/encryption.ts';
import { isAuthFailure, markNeedsReconnect, markHealthy } from '../_shared/platformHealth.ts';
import { reconnectEmailDue, sendReconnectEmail, PLATFORM_LABELS } from '../_shared/connectionAlerts.ts';
import { getEtsyAccessToken } from '../_shared/etsyAuth.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const CHECKED_PLATFORMS = ['shopify', 'woocommerce', 'ebay', 'etsy'];

type CheckResult = { repaired?: string[] };

// ─── Shopify ──────────────────────────────────────────────────────────────────

const SHOPIFY_API = '2025-01';
// Shop-specific webhooks Tandril registers on connect (app/uninstalled and
// app_subscriptions/update are app-level, declared in shopify.app.toml instead).
const SHOPIFY_WEBHOOK_TOPICS = ['ORDERS_PAID', 'ORDERS_CANCELLED', 'REFUNDS_CREATE', 'INVENTORY_LEVELS_UPDATE'];

async function shopifyGraphQL(shop: string, token: string, query: string, variables: Record<string, unknown> = {}) {
  const res = await fetch(`https://${shop}/admin/api/${SHOPIFY_API}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`Shopify returned ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();
  if (json.errors?.length) throw new Error(`GraphQL errors: ${JSON.stringify(json.errors).slice(0, 300)}`);
  return json.data;
}

async function checkShopify(_supabase: any, platform: any): Promise<CheckResult> {
  const shop = platform.shop_domain;
  let token = platform.access_token;
  if (!token) throw new Error('401 no access token stored');
  if (isEncrypted(token)) token = await decrypt(token);
  await shopifyGraphQL(shop, token, '{ shop { name } }');

  // Login works — make sure the sync webhooks are still registered.
  const callbackUrl = `${SUPABASE_URL}/functions/v1/shopify-order-webhook`;
  const data = await shopifyGraphQL(shop, token, `{
    webhookSubscriptions(first: 100) {
      edges { node { topic endpoint { __typename ... on WebhookHttpEndpoint { callbackUrl } } } }
    }
  }`);
  const registered = new Set(
    (data.webhookSubscriptions?.edges || [])
      .filter((e: any) => e.node.endpoint?.callbackUrl === callbackUrl)
      .map((e: any) => e.node.topic),
  );
  const repaired: string[] = [];
  for (const topic of SHOPIFY_WEBHOOK_TOPICS.filter((t) => !registered.has(t))) {
    const result = await shopifyGraphQL(shop, token, `
      mutation($topic: WebhookSubscriptionTopic!, $sub: WebhookSubscriptionInput!) {
        webhookSubscriptionCreate(topic: $topic, webhookSubscription: $sub) {
          userErrors { message }
          webhookSubscription { id }
        }
      }`, { topic, sub: { callbackUrl, format: 'JSON' } });
    const errs = result.webhookSubscriptionCreate?.userErrors || [];
    if (errs.length) console.warn(`[check-platform-connections] ${shop}: could not register ${topic}: ${errs.map((e: any) => e.message).join('; ')}`);
    else repaired.push(topic);
  }
  return { repaired };
}

// ─── WooCommerce ──────────────────────────────────────────────────────────────

const WOO_WEBHOOK_TOPICS = ['order.created', 'order.updated'];

async function checkWooCommerce(supabase: any, platform: any): Promise<CheckResult> {
  const storeUrl = String(platform.store_url || platform.shop_domain || '').replace(/\/$/, '');
  const { consumer_key, consumer_secret } = platform.credentials || {};
  if (!storeUrl) throw new Error('No WooCommerce store URL stored');
  if (!consumer_key || !consumer_secret) throw new Error('401 no WooCommerce API keys stored');
  const headers = { 'Authorization': `Basic ${btoa(`${consumer_key}:${consumer_secret}`)}`, 'Content-Type': 'application/json' };

  // Listing webhooks doubles as the login check (401 when the API keys were revoked).
  const listRes = await fetch(`${storeUrl}/wp-json/wc/v3/webhooks?per_page=100`, { headers });
  if (!listRes.ok) throw new Error(`WooCommerce returned ${listRes.status}: ${(await listRes.text()).slice(0, 200)}`);
  const webhooks: any[] = await listRes.json();

  const deliveryUrl = `${SUPABASE_URL}/functions/v1/woocommerce-order-webhook?platform_id=${platform.id}`;
  let secret = platform.metadata?.webhook_secret;
  const repaired: string[] = [];

  for (const topic of WOO_WEBHOOK_TOPICS) {
    const existing = webhooks.find((w) => w.topic === topic && w.delivery_url === deliveryUrl);
    if (existing && existing.status === 'active') continue;

    if (existing) {
      // WooCommerce disables a webhook after repeated delivery failures — switch it back on.
      const res = await fetch(`${storeUrl}/wp-json/wc/v3/webhooks/${existing.id}`, {
        method: 'PUT', headers, body: JSON.stringify({ status: 'active' }),
      });
      if (res.ok) repaired.push(`${topic} (re-activated)`);
      else console.warn(`[check-platform-connections] ${storeUrl}: could not re-activate ${topic}: ${res.status}`);
      continue;
    }

    if (!secret) {
      secret = crypto.randomUUID().replace(/-/g, '');
      platform.metadata = { ...(platform.metadata || {}), webhook_secret: secret, webhook_url: deliveryUrl };
      await supabase.from('platforms').update({ metadata: platform.metadata }).eq('id', platform.id);
    }
    const res = await fetch(`${storeUrl}/wp-json/wc/v3/webhooks`, {
      method: 'POST', headers,
      body: JSON.stringify({ name: `Tandril ${topic}`, status: 'active', topic, delivery_url: deliveryUrl, secret }),
    });
    if (res.ok) repaired.push(`${topic} (re-created)`);
    else console.warn(`[check-platform-connections] ${storeUrl}: could not create ${topic}: ${res.status}`);
  }
  return { repaired };
}

// ─── eBay ─────────────────────────────────────────────────────────────────────

async function checkEbay(supabase: any, platform: any): Promise<CheckResult> {
  const creds = platform.credentials || {};
  const meta = platform.metadata || {};
  const sandbox = meta.environment === 'sandbox';
  let token = creds.access_token;
  if (!token) throw new Error('401 no eBay access token stored');

  // Refresh if expired or within 5 min — a failed refresh means the long-lived
  // refresh token itself is dead (expired after ~18 months, or revoked).
  const expiresAt = meta.token_expires_at ? new Date(meta.token_expires_at).getTime() : 0;
  if (!expiresAt || Date.now() > expiresAt - 5 * 60 * 1000) {
    const clientId = Deno.env.get('EBAY_CLIENT_ID');
    const clientSecret = Deno.env.get('EBAY_CLIENT_SECRET');
    if (clientId && clientSecret && creds.refresh_token) {
      const res = await fetch(sandbox ? 'https://api.sandbox.ebay.com/identity/v1/oauth2/token' : 'https://api.ebay.com/identity/v1/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}` },
        body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: creds.refresh_token }).toString(),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = `eBay token refresh failed (${res.status}): ${body.error_description || body.error || 'unknown'}`;
        // invalid_grant = refresh token expired/revoked → seller must reconnect
        throw new Error(body.error === 'invalid_grant' ? `401 ${msg}` : msg);
      }
      token = body.access_token;
      platform.credentials = { ...creds, access_token: token, refresh_token: body.refresh_token || creds.refresh_token };
      platform.metadata = { ...meta, token_expires_at: new Date(Date.now() + (body.expires_in || 7200) * 1000).toISOString() };
      await supabase.from('platforms').update({ credentials: platform.credentials, metadata: platform.metadata }).eq('id', platform.id);
    }
  }

  // Commerce Identity lives on apiz.ebay.com, not api.ebay.com (see CLAUDE.md, Aug 29 fix).
  const res = await fetch(`${sandbox ? 'https://apiz.sandbox.ebay.com' : 'https://apiz.ebay.com'}/commerce/identity/v1/user/`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`eBay returned ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return {};
}

// ─── Etsy ─────────────────────────────────────────────────────────────────────

async function checkEtsy(supabase: any, platform: any): Promise<CheckResult> {
  const clientId = Deno.env.get('ETSY_CLIENT_ID');
  const shopId = platform.metadata?.shop_id;
  if (!clientId || !shopId) throw new Error('Etsy client ID or shop_id missing — skipping');
  const token = await getEtsyAccessToken(supabase, platform); // refreshes if needed
  if (!token) throw new Error('401 no Etsy access token stored');
  const res = await fetch(`https://openapi.etsy.com/v3/application/shops/${shopId}`, {
    headers: { 'x-api-key': clientId, 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Etsy returned ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return {};
}

const CHECKERS: Record<string, (supabase: any, platform: any) => Promise<CheckResult>> = {
  shopify: checkShopify,
  woocommerce: checkWooCommerce,
  ebay: checkEbay,
  etsy: checkEtsy,
};

// ─── Job ──────────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200 });

  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if ((req.headers.get('Authorization') ?? '') !== `Bearer ${serviceKey}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL, serviceKey);

  try {
    // ── 1 + 2: login checks + notification repair ─────────────────────────────
    const { data: platforms, error } = await supabase
      .from('platforms')
      .select('*')
      .in('platform_type', CHECKED_PLATFORMS)
      .eq('is_active', true);
    if (error) throw new Error(`Failed to load platforms: ${error.message}`);

    const results: Record<string, unknown>[] = [];

    for (const platform of platforms || []) {
      const label = PLATFORM_LABELS[platform.platform_type] || platform.platform_type;
      const store = platform.shop_name || platform.shop_domain || platform.store_url || platform.name || platform.id;
      try {
        const { repaired = [] } = await CHECKERS[platform.platform_type](supabase, platform);
        await markHealthy(supabase, platform);
        if (repaired.length) console.log(`[check-platform-connections] ${label} ${store}: repaired ${repaired.join(', ')}`);
        results.push({ platform: platform.platform_type, store, ok: true, repaired });
      } catch (e: any) {
        if (!isAuthFailure(e)) {
          // Site down, platform outage, missing config — not the merchant's problem, retry next hour.
          results.push({ platform: platform.platform_type, store, ok: false, error: e.message });
          continue;
        }
        const newlyFlagged = await markNeedsReconnect(supabase, platform, `${label} rejected Tandril's access: ${e.message}`);
        if (newlyFlagged) {
          await supabase.from('smart_alerts').insert({
            user_id: platform.user_id,
            alert_type: 'connection',
            title: `Reconnect your ${label} store: ${store}`,
            message: `${label} stopped accepting Tandril's connection to ${store}, so its products can't load and inventory is no longer syncing with your other platforms. Go to Platforms and reconnect it — it takes about a minute.`,
            priority: 'high',
            suggested_actions: [{ action: 'Reconnect store', page: 'Platforms' }],
          });
        }
        results.push({ platform: platform.platform_type, store, ok: false, needs_reconnect: true, newly_flagged: newlyFlagged });
      }
    }

    // ── 3: Seller emails for every broken connection, any platform ────────────
    const { data: broken } = await supabase.from('platforms').select('*').eq('status', 'needs_reconnect');
    let emailsSent = 0;
    for (const platform of broken || []) {
      if (reconnectEmailDue(platform) && await sendReconnectEmail(supabase, platform)) emailsSent++;
    }

    // ── 4: Catch-up sync for stores whose saved product links were restored on
    // reconnect (migration 20260925000004). The Platforms page normally does this
    // right away; this covers a seller who reconnected and closed the tab. Waits
    // 10 minutes so it doesn't race the page.
    const { data: restoredRows } = await supabase
      .from('platforms')
      .select('id, user_id, metadata')
      .eq('metadata->links_restored->>pending', 'true');
    let caughtUp = 0;
    for (const platform of restoredRows || []) {
      const restored = platform.metadata.links_restored;
      if (Date.now() - new Date(restored.at).getTime() < 10 * 60 * 1000) continue;
      let failed = 0;
      for (const sku of restored.skus || []) {
        try {
          const res = await fetch(`${SUPABASE_URL}/functions/v1/sync-inventory-levels`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: platform.user_id, sku, mode: 'lowest', triggered_by: 'reconnect_catchup' }),
          });
          if (!res.ok) failed++;
        } catch { failed++; }
      }
      // Leave pending set if anything failed, so the next hourly run tries again.
      if (failed === 0) {
        await supabase.from('platforms').update({
          metadata: { ...platform.metadata, links_restored: { ...restored, pending: false, caught_up_at: new Date().toISOString() } },
        }).eq('id', platform.id);
        caughtUp++;
      }
    }

    // ── 5: Made-to-order (e.g. Printful) products: top the other stores back up to
    // keep_stocked_at after sales. Their instant sale alerts can't be relied on
    // (eBay's in particular), so this hourly pass is what guarantees it.
    const { data: motLinks } = await supabase
      .from('platform_product_links')
      .select('user_id, sku')
      .eq('made_to_order', true);
    const motSkus = [...new Map((motLinks || []).map((l: any) => [`${l.user_id}|${l.sku}`, l])).values()];
    let toppedUp = 0;
    for (const l of motSkus as any[]) {
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/sync-inventory-levels`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: l.user_id, sku: l.sku, mode: 'lowest', triggered_by: 'keep_stocked' }),
        });
        const out = await res.json().catch(() => ({}));
        if ((out?.synced ?? 0) > 0) toppedUp++;
      } catch (err: any) {
        console.warn(`[check-platform-connections] top-up failed for SKU=${l.sku}: ${err.message}`);
      }
    }

    const flagged = results.filter((r) => r.needs_reconnect).length;
    console.log(`[check-platform-connections] Checked ${results.length} connections, ${flagged} need reconnect, ${emailsSent} emails sent, ${caughtUp} restored stores caught up`);
    return new Response(JSON.stringify({
      success: true, checked: results.length, needs_reconnect: flagged, emails_sent: emailsSent, restored_caught_up: caughtUp, made_to_order_topped_up: toppedUp, results,
    }), { status: 200 });
  } catch (e: any) {
    console.error('[check-platform-connections] Error:', e.message);
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500 });
  }
});
