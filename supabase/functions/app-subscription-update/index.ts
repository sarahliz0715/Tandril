// app-subscription-update
//
// Handles the Shopify app_subscriptions/update webhook.
// Fires whenever a merchant changes, cancels, or renews their subscription
// inside the Shopify admin — keeping Tandril's tier in sync with Shopify's truth.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const NAME_TO_TIER: Record<string, string> = {
  'tandril starter':      'starter',
  'tandril professional': 'professional',
  'tandril enterprise':   'enterprise',
};

const TIER_LIMITS: Record<string, { api_usage_limit: number; platforms_limit: number }> = {
  starter:      { api_usage_limit: 500,   platforms_limit: 4  },
  professional: { api_usage_limit: 2000,  platforms_limit: 10 },
  enterprise:   { api_usage_limit: 10000, platforms_limit: 50 },
  free:         { api_usage_limit: 50,    platforms_limit: 2  },
};

async function verifyHmac(body: string, hmacHeader: string | null, secret: string): Promise<boolean> {
  if (!hmacHeader) return false;
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  const digest = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return digest === hmacHeader;
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const hmacHeader  = req.headers.get('X-Shopify-Hmac-Sha256');
    const shopDomain  = req.headers.get('X-Shopify-Shop-Domain');
    const rawBody     = await req.text();

    const secret = Deno.env.get('SHOPIFY_API_SECRET');
    if (!secret) {
      console.error('[app-subscription-update] SHOPIFY_API_SECRET not set');
      return new Response('ok', { status: 200 });
    }

    const valid = await verifyHmac(rawBody, hmacHeader, secret);
    if (!valid) {
      // Never trust an unverified payload — ack with 200 so Shopify doesn't
      // retry-storm us, but do not touch any tier/entitlement state.
      console.error('[app-subscription-update] HMAC verification failed — payload rejected, not processed');
      return new Response(JSON.stringify({ received: true, error: 'invalid_hmac' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const payload = JSON.parse(rawBody);
    // Shopify nests webhook data under app_subscription key
    const sub = payload.app_subscription ?? payload;
    const { name, status, admin_graphql_api_id } = sub;
    const domain = shopDomain ?? '';

    console.log(`[app-subscription-update] shop=${domain} name="${name}" status=${status}`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find the user who owns this shop. A shop_domain can end up matched by
    // more than one row (a Tandril account reconnecting, or a stale row left
    // from an earlier install/review cycle that was never cleaned up), so
    // this can't be .maybeSingle() — that throws on >1 row and the update
    // is silently dropped, leaving the merchant's tier out of sync even
    // though the webhook fired correctly. Prefer the active, most recently
    // updated connection for this shop.
    const { data: platformRows } = await supabase
      .from('platforms')
      .select('user_id')
      .eq('platform_type', 'shopify')
      .or(`shop_domain.eq.${domain},shop_domain.eq.${domain.replace('.myshopify.com', '')}`)
      .order('is_active', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(1);

    const platform = platformRows?.[0];
    if (!platform?.user_id) {
      console.warn('[app-subscription-update] No platform found for shop:', domain);
      return new Response('ok', { status: 200 });
    }

    const userId = platform.user_id;

    const { data: userRecord } = await supabase.auth.admin.getUserById(userId);
    const meta = userRecord?.user?.user_metadata ?? {};

    if (status === 'ACTIVE') {
      // Determine tier from subscription name
      const n = (name || '').toLowerCase();
      const tier = n.includes('enterprise') ? 'enterprise' : n.includes('professional') || n.includes('pro') ? 'professional' : 'starter';
      const limits = TIER_LIMITS[tier];
      await supabase.auth.admin.updateUserById(userId, {
        user_metadata: {
          ...meta,
          subscription_tier: tier,
          shopify_subscription_id: admin_graphql_api_id,
          ...limits,
        },
      });
      console.log(`[app-subscription-update] Upgraded user ${userId} to ${tier}`);

    } else if (['DECLINED', 'EXPIRED', 'CANCELLED', 'FROZEN'].includes(status)) {
      // If the cancelled sub isn't the one we have on record, a plan switch
      // is in progress — Shopify cancels the old sub then activates the new one.
      // Ignore the cancellation so it doesn't overwrite the new plan with free.
      if (meta.shopify_subscription_id && meta.shopify_subscription_id !== admin_graphql_api_id) {
        console.log(`[app-subscription-update] Cancelled sub ${admin_graphql_api_id} is not the active one (${meta.shopify_subscription_id}) — ignoring`);
        return new Response(JSON.stringify({ received: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      const limits = TIER_LIMITS.free;
      await supabase.auth.admin.updateUserById(userId, {
        user_metadata: {
          ...meta,
          subscription_tier: 'free',
          shopify_subscription_id: null,
          ...limits,
        },
      });
      console.log(`[app-subscription-update] Downgraded user ${userId} to free (status=${status})`);
    }

    // Always 200 — Shopify retries on non-2xx
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[app-subscription-update] Error:', err.message);
    return new Response(JSON.stringify({ received: true, error: err.message }), { status: 200 });
  }
});
