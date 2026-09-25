// check-platform-connections
//
// Scheduled job (pg_cron, hourly — see migrations/20260925000003_platform_connection_check_cron.sql).
// Keeps store connections healthy so cross-platform inventory sync never silently stops:
//
//   1. Pings every active Shopify store with a tiny read (shop name). If Shopify rejects the
//      stored token (app uninstalled, token revoked) the store is flagged 'needs_reconnect'
//      and a notification-bell alert is created. A flagged store that works again is cleared.
//   2. For every healthy Shopify store, confirms the order/refund/inventory webhooks that
//      drive real-time sync are still registered, and re-registers any that are missing.
//      (Shopify deletes a subscription after repeated delivery failures, which would otherwise
//      stop instant sync with no visible error.)
//   3. Emails the seller about every broken connection (any platform) — immediately, then
//      reminders at 24h and 72h. See _shared/connectionAlerts.ts.
//
// POST /functions/v1/check-platform-connections   (service-role bearer only)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { decrypt, isEncrypted } from '../_shared/encryption.ts';
import { isAuthFailure, markNeedsReconnect, markHealthy } from '../_shared/platformHealth.ts';
import { reconnectEmailDue, sendReconnectEmail } from '../_shared/connectionAlerts.ts';

const SHOPIFY_API = '2025-01';
// Shop-specific webhooks Tandril registers on connect (app/uninstalled and
// app_subscriptions/update are app-level, declared in shopify.app.toml instead).
const REQUIRED_WEBHOOK_TOPICS = ['ORDERS_PAID', 'ORDERS_CANCELLED', 'REFUNDS_CREATE', 'INVENTORY_LEVELS_UPDATE'];

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

// Returns the topics that were missing and have now been re-registered.
async function repairWebhooks(shop: string, token: string, callbackUrl: string): Promise<string[]> {
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
  for (const topic of REQUIRED_WEBHOOK_TOPICS.filter((t) => !registered.has(t))) {
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
  return repaired;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200 });

  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if ((req.headers.get('Authorization') ?? '') !== `Bearer ${serviceKey}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabase = createClient(supabaseUrl, serviceKey);
  const orderWebhookUrl = `${supabaseUrl}/functions/v1/shopify-order-webhook`;

  try {
    // ── 1 + 2: Shopify health + webhook repair ────────────────────────────────
    const { data: platforms, error } = await supabase
      .from('platforms')
      .select('*')
      .eq('platform_type', 'shopify')
      .eq('is_active', true)
      .not('access_token', 'is', null);
    if (error) throw new Error(`Failed to load platforms: ${error.message}`);

    const results: Record<string, unknown>[] = [];

    for (const platform of platforms || []) {
      const shop = platform.shop_domain;
      let token = platform.access_token;
      try {
        if (isEncrypted(token)) token = await decrypt(token);
        await shopifyGraphQL(shop, token, '{ shop { name } }');
        await markHealthy(supabase, platform);
      } catch (e: any) {
        if (!isAuthFailure(e)) {
          // Shopify outage, timeout, etc. — not the merchant's problem, try again next hour.
          results.push({ shop, ok: false, error: e.message });
          continue;
        }
        const newlyFlagged = await markNeedsReconnect(supabase, platform, `Shopify rejected Tandril's access: ${e.message}`);
        if (newlyFlagged) {
          const storeName = platform.shop_name || shop;
          await supabase.from('smart_alerts').insert({
            user_id: platform.user_id,
            alert_type: 'connection',
            title: `Reconnect your Shopify store: ${storeName}`,
            message: `Shopify stopped accepting Tandril's connection to ${storeName}, so products can't load and inventory is no longer syncing to your other platforms. Go to Platforms and click Reconnect Store — it takes about a minute.`,
            priority: 'high',
            suggested_actions: [{ action: 'Reconnect store', page: 'Platforms' }],
          });
        }
        results.push({ shop, ok: false, needs_reconnect: true, newly_flagged: newlyFlagged });
        continue;
      }

      try {
        const repaired = await repairWebhooks(shop, token, orderWebhookUrl);
        if (repaired.length) console.log(`[check-platform-connections] ${shop}: re-registered missing webhooks ${repaired.join(', ')}`);
        results.push({ shop, ok: true, webhooks_repaired: repaired });
      } catch (e: any) {
        results.push({ shop, ok: true, webhook_check_error: e.message });
      }
    }

    // ── 3: Seller emails for every broken connection, any platform ────────────
    const { data: broken } = await supabase.from('platforms').select('*').eq('status', 'needs_reconnect');
    let emailsSent = 0;
    for (const platform of broken || []) {
      if (reconnectEmailDue(platform) && await sendReconnectEmail(supabase, platform)) emailsSent++;
    }

    const flagged = results.filter((r) => r.needs_reconnect).length;
    console.log(`[check-platform-connections] Checked ${results.length} Shopify stores, ${flagged} need reconnect, ${emailsSent} emails sent`);
    return new Response(JSON.stringify({
      success: true, checked: results.length, needs_reconnect: flagged, emails_sent: emailsSent, results,
    }), { status: 200 });
  } catch (e: any) {
    console.error('[check-platform-connections] Error:', e.message);
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500 });
  }
});
