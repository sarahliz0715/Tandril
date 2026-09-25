// check-platform-connections
//
// Scheduled job (pg_cron, daily — see migrations/20260925000003_platform_connection_check_cron.sql).
// Tests every active Shopify connection with a tiny read (shop name). If Shopify rejects
// the stored access token (app uninstalled, token revoked), the platform is flagged
// 'needs_reconnect' and a notification-bell alert is created — so a dead connection is
// caught even when nobody opens Tandril, instead of inventory sync silently stopping.
// A flagged store that works again is set back to 'connected'.
//
// Shopify only for now: its offline tokens never expire on their own, so a failure here
// always means the merchant must reconnect. (eBay/Etsy refresh their own tokens.)
//
// POST /functions/v1/check-platform-connections   (service-role bearer only)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { decrypt, isEncrypted } from '../_shared/encryption.ts';
import { isAuthFailure, markNeedsReconnect, markHealthy } from '../_shared/platformHealth.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200 });

  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if ((req.headers.get('Authorization') ?? '') !== `Bearer ${serviceKey}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', serviceKey);

  try {
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
      try {
        let token = platform.access_token;
        if (isEncrypted(token)) token = await decrypt(token);

        const res = await fetch(`https://${shop}/admin/api/2025-01/graphql.json`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
          body: JSON.stringify({ query: '{ shop { name } }' }),
        });
        if (!res.ok) throw new Error(`Shopify returned ${res.status}: ${(await res.text()).slice(0, 200)}`);

        await markHealthy(supabase, platform);
        results.push({ shop, ok: true });
      } catch (e: any) {
        if (!isAuthFailure(e)) {
          // Shopify outage, timeout, etc. — not the merchant's problem, try again tomorrow.
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
            message: `Shopify stopped accepting Tandril's connection to ${storeName}, so products can't load and inventory is no longer syncing to your other platforms. Go to Platforms, disconnect ${storeName}, and connect it again — it takes about a minute.`,
            priority: 'high',
            suggested_actions: [{ action: 'Reconnect store', page: 'Platforms' }],
          });
        }
        results.push({ shop, ok: false, needs_reconnect: true, newly_flagged: newlyFlagged });
      }
    }

    const flagged = results.filter((r) => r.needs_reconnect).length;
    console.log(`[check-platform-connections] Checked ${results.length} Shopify stores, ${flagged} need reconnect`);
    return new Response(JSON.stringify({ success: true, checked: results.length, needs_reconnect: flagged, results }), { status: 200 });
  } catch (e: any) {
    console.error('[check-platform-connections] Error:', e.message);
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500 });
  }
});
