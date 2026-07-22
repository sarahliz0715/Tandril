// Vercel Serverless Function: shopify-sync-plan
//
// Queries Shopify's GraphQL API for the merchant's active app subscription
// and returns the current tier. Called from the frontend on Pricing/Settings
// page load so the UI always reflects Shopify's truth without waiting for
// the app_subscriptions/update webhook.

import { createClient } from '@supabase/supabase-js';

function supabaseUrl() { return process.env.SUPABASE_URL; }
function serviceKey()  { return process.env.SUPABASE_SERVICE_ROLE_KEY; }

const ALGORITHM  = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH  = 12;

async function getEncryptionKey() {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret) throw new Error('ENCRYPTION_SECRET not set');
  const enc = new TextEncoder();
  const km  = await crypto.subtle.importKey('raw', enc.encode(secret), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: enc.encode('tandril-encryption-salt-v1'), iterations: 100000, hash: 'SHA-256' },
    km, { name: ALGORITHM, length: KEY_LENGTH }, false, ['encrypt', 'decrypt']
  );
}

async function decrypt(ciphertext) {
  const key      = await getEncryptionKey();
  const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
  const iv       = combined.slice(0, IV_LENGTH);
  const ct       = combined.slice(IV_LENGTH);
  const plain    = await crypto.subtle.decrypt({ name: ALGORITHM, iv }, key, ct);
  return new TextDecoder().decode(plain);
}

const NAME_TO_TIER = {
  'starter plan':      'starter',
  'professional plan': 'professional',
  'enterprise plan':   'enterprise',
  'just free':         'free',
  // Also handle names without " plan" suffix
  'starter':      'starter',
  'professional': 'professional',
  'enterprise':   'enterprise',
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });

  const jwt = authHeader.slice(7);

  try {
    // Verify JWT and get user
    const supabase = createClient(supabaseUrl(), serviceKey());
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
    if (userError || !user) return res.status(401).json({ error: 'Unauthorized' });

    // Find the user's Shopify platform. A user can accumulate more than one
    // row here (reconnects to a different store, stale rows from an old
    // review cycle that were never fully cleaned up), so this can't be
    // .single()/.maybeSingle() — that throws on >1 row and silently reports
    // "no store connected" even though one is clearly connected. Always take
    // the most recently updated active row as the current one.
    const { data: platforms, error: platformError } = await supabase
      .from('platforms')
      .select('shop_domain, access_token')
      .eq('user_id', user.id)
      .eq('platform_type', 'shopify')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1);

    const platform = platforms?.[0];
    if (platformError || !platform) {
      return res.status(200).json({ tier: null, reason: 'no_shopify_store' });
    }

    let token = platform.access_token;
    try { token = await decrypt(token); } catch (_) { /* use as-is */ }

    // Query Shopify for active app subscriptions
    const gqlRes = await fetch(`https://${platform.shop_domain}/admin/api/2025-10/graphql.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
      body: JSON.stringify({
        query: `{ currentAppInstallation { activeSubscriptions { name status } } }`,
      }),
    });

    if (!gqlRes.ok) {
      console.error('[shopify-sync-plan] Shopify API error:', gqlRes.status);
      return res.status(200).json({ tier: null, reason: 'shopify_api_error' });
    }

    const gqlData = await gqlRes.json();
    const subs = gqlData?.data?.currentAppInstallation?.activeSubscriptions ?? [];

    // Find the first ACTIVE paid subscription
    let tier = null;
    for (const sub of subs) {
      if (sub.status === 'ACTIVE') {
        const mapped = NAME_TO_TIER[sub.name?.toLowerCase()];
        if (mapped && mapped !== 'free') {
          tier = mapped;
          break;
        }
      }
    }

    // If no active paid sub, return 'free'
    if (!tier) tier = 'free';

    // Sync to user metadata if different
    const currentTier = user.user_metadata?.subscription_tier;
    if (tier !== currentTier) {
      const TIER_LIMITS = {
        starter:      { api_usage_limit: 500,   platforms_limit: 4  },
        professional: { api_usage_limit: 2000,  platforms_limit: 10 },
        enterprise:   { api_usage_limit: 10000, platforms_limit: 50 },
        free:         { api_usage_limit: 50,    platforms_limit: 2  },
      };
      const limits = TIER_LIMITS[tier] ?? TIER_LIMITS.free;
      await supabase.auth.admin.updateUserById(user.id, {
        user_metadata: { ...user.user_metadata, subscription_tier: tier, ...limits },
      });
      console.log(`[shopify-sync-plan] Updated ${user.email} tier: ${currentTier} → ${tier}`);
    }

    return res.status(200).json({ tier });
  } catch (err) {
    console.error('[shopify-sync-plan] Error:', err.message);
    return res.status(200).json({ tier: null, reason: 'error', detail: err.message });
  }
}
