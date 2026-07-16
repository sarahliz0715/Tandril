// register-shopify-webhooks
//
// One-time utility: (re-)registers all required Shopify webhooks for every
// active platform row. Call with service-role bearer to fix stores that
// connected before app_subscriptions/update was added to shopify-auth-exchange.
//
// POST /functions/v1/register-shopify-webhooks
// Body: { "shop_domain": "omhbridge-dev.myshopify.com" }  (optional — omit to do all shops)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH  = 12;

async function getEncryptionKey(): Promise<CryptoKey> {
  const secret = Deno.env.get('ENCRYPTION_SECRET');
  if (!secret) throw new Error('ENCRYPTION_SECRET not set');
  const enc = new TextEncoder();
  const km  = await crypto.subtle.importKey('raw', enc.encode(secret), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: enc.encode('tandril-encryption-salt-v1'), iterations: 100000, hash: 'SHA-256' },
    km, { name: ALGORITHM, length: KEY_LENGTH }, false, ['encrypt', 'decrypt']
  );
}

async function decrypt(ciphertext: string): Promise<string> {
  const key      = await getEncryptionKey();
  const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
  const iv       = combined.slice(0, IV_LENGTH);
  const ct       = combined.slice(IV_LENGTH);
  const plain    = await crypto.subtle.decrypt({ name: ALGORITHM, iv }, key, ct);
  return new TextDecoder().decode(plain);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200 });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  // Require service-role bearer
  const auth = req.headers.get('Authorization') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!auth.includes(serviceKey)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const filterDomain: string | null = body.shop_domain ?? null;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      serviceKey
    );

    // Fetch active Shopify platforms
    let query = supabase
      .from('platforms')
      .select('shop_domain, access_token')
      .eq('platform_type', 'shopify')
      .eq('is_active', true)
      .not('access_token', 'is', null);

    if (filterDomain) {
      query = query.ilike('shop_domain', `%${filterDomain.replace('.myshopify.com', '')}%`);
    }

    const { data: platforms, error } = await query;
    if (error) throw error;

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const webhooks = [
      { topic: 'orders/paid',              address: `${supabaseUrl}/functions/v1/shopify-order-webhook` },
      { topic: 'app/uninstalled',          address: `${supabaseUrl}/functions/v1/app-uninstalled` },
      { topic: 'app_subscriptions/update', address: `${supabaseUrl}/functions/v1/app-subscription-update` },
    ];

    const results: Record<string, unknown>[] = [];

    for (const platform of (platforms ?? [])) {
      let token = platform.access_token;
      try { token = await decrypt(token); } catch (_) { /* use as-is */ }

      const shop    = platform.shop_domain;
      const shopRow: Record<string, unknown> = { shop, registered: [], failed: [] };

      for (const wh of webhooks) {
        try {
          const res = await fetch(`https://${shop}/admin/api/2024-01/webhooks.json`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
            body:    JSON.stringify({ webhook: { topic: wh.topic, address: wh.address, format: 'json' } }),
          });
          const json = await res.json();
          if (res.ok || json.errors?.base?.includes('for this topic has already been taken')) {
            (shopRow.registered as string[]).push(wh.topic);
            console.log(`[register-webhooks] ${shop} ✓ ${wh.topic}`);
          } else {
            (shopRow.failed as string[]).push(wh.topic);
            console.warn(`[register-webhooks] ${shop} ✗ ${wh.topic}:`, JSON.stringify(json.errors));
          }
        } catch (err) {
          (shopRow.failed as string[]).push(wh.topic);
          console.warn(`[register-webhooks] ${shop} ✗ ${wh.topic}:`, (err as Error).message);
        }
      }

      results.push(shopRow);
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[register-webhooks] Error:', (err as Error).message);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
  }
});
