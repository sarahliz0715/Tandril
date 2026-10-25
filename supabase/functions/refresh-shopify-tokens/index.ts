// refresh-shopify-tokens
//
// Keeps expiring Shopify tokens alive and switches stores over to them.
// Secret key only (isServiceRequest); deployed with --no-verify-jwt.
//
// POST {}                                      → (cron, every 10 min) renew every expiring token
//                                                with < 30 min left; tidy up stale state rows
// POST {"action":"status"}                     → which stores are on expiring tokens, expiry times
//                                                (never returns tokens)
// POST {"action":"migrate","shop_domain":"x.myshopify.com"}
//                                              → switch ONE store to an expiring token. No "all":
//                                                each store is switched deliberately.
// POST {"action":"refresh","shop_domain":"x.myshopify.com","force":true}
//                                              → renew one store now (testing)
//
// A store whose refresh token Shopify rejects (401) is flagged needs_reconnect, which sends
// the usual reconnect email/bell alert (check-platform-connections).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getSecretKey, isServiceRequest } from '../_shared/supabaseKeys.ts';
import { normalizeShopDomain } from '../_shared/shopifySecurity.ts';
import { markNeedsReconnect } from '../_shared/platformHealth.ts';
import { migrateShopifyToken, refreshShopifyToken } from '../_shared/shopifyToken.ts';

const RENEW_IF_LESS_THAN_MS = 30 * 60_000;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

async function shopifyRowsFor(supabase: any, shopDomain: string) {
  const { data, error } = await supabase
    .from('platforms')
    .select('id, user_id, shop_domain, status, is_active, metadata, platform_type')
    .eq('platform_type', 'shopify')
    .eq('shop_domain', shopDomain);
  if (error) throw new Error(error.message);
  return data || [];
}

serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (!isServiceRequest(req)) return json({ error: 'Unauthorized' }, 401);

  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', getSecretKey());
  const body = await req.json().catch(() => ({}));
  const action = body.action || 'refresh_due';

  try {
    if (action === 'status') {
      const { data: platforms } = await supabase
        .from('platforms')
        .select('id, shop_domain, status, is_active, access_token')
        .eq('platform_type', 'shopify');
      const { data: states } = await supabase
        .from('shopify_token_state')
        .select('platform_id, for_access_token, access_token_expires_at, refresh_token_expires_at, migrated_at, last_refreshed_at, last_error, lease_until');
      const byId = new Map((states || []).map((s: any) => [s.platform_id, s]));
      return json({
        stores: (platforms || []).map((p: any) => {
          const s: any = byId.get(p.id);
          const current = s && s.for_access_token === p.access_token;
          return {
            shop_domain: p.shop_domain,
            status: p.status,
            is_active: p.is_active,
            token: current ? 'expiring' : 'non-expiring',
            ...(current ? {
              access_token_expires_at: s.access_token_expires_at,
              refresh_token_expires_at: s.refresh_token_expires_at,
              migrated_at: s.migrated_at,
              last_refreshed_at: s.last_refreshed_at,
              last_error: s.last_error,
            } : {}),
          };
        }),
      });
    }

    if (action === 'migrate' || action === 'refresh') {
      const shop = normalizeShopDomain(body.shop_domain);
      if (!shop) return json({ error: 'shop_domain (x.myshopify.com) is required' }, 400);
      const rows = await shopifyRowsFor(supabase, shop);
      const active = rows.filter((r: any) => r.is_active);
      // One Shopify store = one offline token. If two Tandril rows shared it, switching one
      // would break the other, so refuse rather than guess.
      if (active.length !== 1) {
        return json({ error: `Expected exactly one active connection for ${shop}, found ${active.length}` }, 409);
      }
      const platform = active[0];

      if (action === 'migrate') {
        const result = await migrateShopifyToken(supabase, platform.id);
        console.log(`[refresh-shopify-tokens] migrate ${shop}: ${result.status}`);
        return json(result);
      }
      const result = await refreshShopifyToken(supabase, platform.id, { force: body.force === true });
      console.log(`[refresh-shopify-tokens] refresh ${shop}: ${result.status}`);
      if (result.status === 'dead') {
        await markNeedsReconnect(supabase, platform, `Shopify refresh token rejected: ${result.error}`);
      }
      const { access_token: _hidden, ...safe } = result as any;
      return json({ shop, ...safe });
    }

    if (action !== 'refresh_due') return json({ error: `Unknown action ${action}` }, 400);

    // ── Cron: renew everything that is due ──────────────────────────────────
    const { data: states, error } = await supabase
      .from('shopify_token_state')
      .select('platform_id, for_access_token, access_token_expires_at');
    if (error) throw new Error(error.message);

    const summary = { checked: 0, renewed: 0, not_due: 0, failed: 0, needs_reconnect: 0, cleaned_up: 0, errors: [] as string[] };
    for (const s of states || []) {
      const { data: platform } = await supabase
        .from('platforms')
        .select('id, user_id, shop_domain, status, metadata, platform_type, access_token, is_active')
        .eq('id', s.platform_id)
        .maybeSingle();

      // The store's token was replaced (reconnect with a non-expiring token, uninstall) —
      // this refresh token no longer belongs to it.
      if (!platform || platform.access_token !== s.for_access_token) {
        await supabase.from('shopify_token_state').delete().eq('platform_id', s.platform_id);
        summary.cleaned_up++;
        continue;
      }
      summary.checked++;
      if (new Date(s.access_token_expires_at).getTime() - Date.now() > RENEW_IF_LESS_THAN_MS) {
        summary.not_due++;
        continue;
      }
      const r = await refreshShopifyToken(supabase, platform.id, { minRemainingMs: RENEW_IF_LESS_THAN_MS });
      if (r.status === 'refreshed' || r.status === 'refreshed_elsewhere' || r.status === 'fresh') {
        summary.renewed++;
      } else if (r.status === 'dead') {
        summary.needs_reconnect++;
        summary.errors.push(`${platform.shop_domain}: ${r.error}`);
        await markNeedsReconnect(supabase, platform, `Shopify refresh token rejected: ${r.error}`);
      } else if (r.status !== 'not_expiring') {
        summary.failed++;
        summary.errors.push(`${platform.shop_domain}: ${'error' in r ? r.error : r.status}`);
      }
    }
    console.log('[refresh-shopify-tokens]', JSON.stringify(summary));
    return json({ success: true, ...summary });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[refresh-shopify-tokens] error:', msg);
    return json({ error: msg }, 500);
  }
});
