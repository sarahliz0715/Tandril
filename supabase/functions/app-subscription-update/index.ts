// app-subscription-update
//
// Handles the Shopify app_subscriptions/update webhook.
// Fires whenever a merchant changes, cancels, or renews their subscription
// inside the Shopify admin — keeping Tandril's tier in sync with Shopify's truth.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// --- Decryption helpers (mirrors shopify-billing/shopify-auth-exchange) ---
const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;

async function getEncryptionKey(): Promise<CryptoKey> {
  const secret = Deno.env.get('ENCRYPTION_SECRET');
  if (!secret) throw new Error('ENCRYPTION_SECRET not set');
  const enc = new TextEncoder();
  const km = await crypto.subtle.importKey('raw', enc.encode(secret), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: enc.encode('tandril-encryption-salt-v1'), iterations: 100000, hash: 'SHA-256' },
    km, { name: ALGORITHM, length: KEY_LENGTH }, false, ['encrypt', 'decrypt']
  );
}

async function decrypt(ciphertext: string): Promise<string> {
  const key = await getEncryptionKey();
  const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
  const iv = combined.slice(0, IV_LENGTH);
  const ct = combined.slice(IV_LENGTH);
  const plain = await crypto.subtle.decrypt({ name: ALGORITHM, iv }, key, ct);
  return new TextDecoder().decode(plain);
}
// --- End decryption helpers ---

// Name-based matching is a fallback only — Managed Pricing plan display
// names are configured in the Partner Dashboard and can be anything.
// An exact-string dictionary silently mismatches (previously defaulted
// straight to 'starter') the moment the configured name doesn't match one
// of these keys exactly. Price is the one thing that can't drift out of
// sync with what's actually being billed, so it's tried first.
const PLAN_PRICES: Record<string, number> = {
  starter:      39.99,
  professional: 129.99,
  enterprise:   299.99,
};
const PRICE_TOLERANCE = 0.01;

const NAME_TO_TIER: Record<string, string> = {
  'tandril starter':      'starter',
  'tandril professional': 'professional',
  'tandril enterprise':   'enterprise',
  'starter plan':         'starter',
  'professional plan':    'professional',
  'enterprise plan':      'enterprise',
  'starter':              'starter',
  'professional':         'professional',
  'enterprise':           'enterprise',
};

function tierFromName(name: string | undefined): string | null {
  const n = (name || '').toLowerCase();
  if (NAME_TO_TIER[n]) return NAME_TO_TIER[n];
  if (n.includes('enterprise')) return 'enterprise';
  if (n.includes('professional') || n.includes('pro')) return 'professional';
  if (n.includes('starter')) return 'starter';
  return null;
}

function tierFromPrice(amount: unknown): string | null {
  if (amount == null) return null;
  const numeric = Number(amount);
  if (Number.isNaN(numeric)) return null;
  for (const [tier, price] of Object.entries(PLAN_PRICES)) {
    if (Math.abs(numeric - price) < PRICE_TOLERANCE) return tier;
  }
  return null;
}

// Query Shopify for the subscription's actual line-item price so tier
// resolution doesn't depend solely on the plan's display name.
async function fetchSubscriptionPrice(shopDomain: string, accessToken: string, subscriptionGid: string): Promise<number | null> {
  try {
    const res = await fetch(`https://${shopDomain}/admin/api/2025-10/graphql.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': accessToken },
      body: JSON.stringify({
        query: `query($id: ID!) {
          node(id: $id) {
            ... on AppSubscription {
              lineItems {
                plan {
                  pricingDetails {
                    __typename
                    ... on AppRecurringPricing { price { amount } }
                  }
                }
              }
            }
          }
        }`,
        variables: { id: subscriptionGid },
      }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const amount = json?.data?.node?.lineItems?.[0]?.plan?.pricingDetails?.price?.amount;
    return amount != null ? Number(amount) : null;
  } catch (err) {
    console.warn('[app-subscription-update] Could not fetch subscription price:', (err as Error).message);
    return null;
  }
}

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
      .select('user_id, shop_domain, access_token')
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
      // Determine tier — price first (can't drift out of sync with what's
      // actually being billed), subscription name as fallback.
      let tier: string | null = null;
      let token = platform.access_token as string | null;
      if (token) {
        try { token = await decrypt(token); } catch (_) { /* use as-is */ }
        if (admin_graphql_api_id && token) {
          const price = await fetchSubscriptionPrice(platform.shop_domain, token, admin_graphql_api_id);
          tier = tierFromPrice(price);
        }
      }
      if (!tier) tier = tierFromName(name);

      if (!tier) {
        // Never guess — an unrecognized name/price used to silently default
        // to 'starter', which is exactly how a Professional subscription
        // could end up showing as Starter in the app. Leave the existing
        // tier untouched and log loudly so it's diagnosable.
        console.error(`[app-subscription-update] Could not resolve tier for shop=${domain} name="${name}" id=${admin_graphql_api_id} — leaving subscription_tier unchanged (${meta.subscription_tier ?? 'unset'})`);
      } else {
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
      }

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
