// shopify-app-install
//
// Called by the Vercel shopify-callback function for App Store installs where
// no Tandril user was logged in during OAuth. Accepts a raw access token and
// user_id, encrypts the token, upserts the platforms row, and registers the
// required webhooks. Secured by service-role bearer only.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

async function encrypt(plaintext: string): Promise<string> {
  const key = await getEncryptionKey();
  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const ct = await crypto.subtle.encrypt({ name: ALGORITHM, iv }, key, enc.encode(plaintext));
  const combined = new Uint8Array(iv.length + ct.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ct), iv.length);
  return btoa(String.fromCharCode(...combined));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' } });
  }

  try {
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const authHeader = req.headers.get('Authorization') ?? '';
    const bearer = authHeader.replace('Bearer ', '');

    if (bearer !== serviceRoleKey) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { user_id, shop, shop_name, access_token, scope } = await req.json();
    if (!user_id || !shop || !access_token) {
      return new Response(JSON.stringify({ error: 'Missing required fields: user_id, shop, access_token' }), { status: 400 });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const encryptedToken = await encrypt(access_token);

    const { error: upsertError } = await adminClient
      .from('platforms')
      .upsert({
        user_id,
        platform_type: 'shopify',
        shop_domain: shop,
        shop_name: shop_name || shop,
        access_token: encryptedToken,
        access_scopes: scope ? scope.split(',').map((s: string) => s.trim()) : [],
        is_active: true,
        last_synced_at: new Date().toISOString(),
      }, { onConflict: 'user_id,shop_domain' });

    if (upsertError) throw new Error('Platform upsert failed: ' + upsertError.message);

    console.log(`[shopify-app-install] Platform upserted for user=${user_id} shop=${shop}`);

    // Register webhooks
    const webhooks = [
      { topic: 'orders/paid', address: `${supabaseUrl}/functions/v1/shopify-order-webhook` },
      { topic: 'app/uninstalled', address: `${supabaseUrl}/functions/v1/app-uninstalled` },
      { topic: 'app_subscriptions/update', address: `${supabaseUrl}/functions/v1/app-subscription-update` },
    ];

    for (const wh of webhooks) {
      try {
        await fetch(`https://${shop}/admin/api/2024-01/webhooks.json`, {
          method: 'POST',
          headers: { 'X-Shopify-Access-Token': access_token, 'Content-Type': 'application/json' },
          body: JSON.stringify({ webhook: { topic: wh.topic, address: wh.address, format: 'json' } }),
        });
        console.log(`[shopify-app-install] Registered ${wh.topic} for ${shop}`);
      } catch (e) {
        console.warn(`[shopify-app-install] Webhook registration failed for ${wh.topic}:`, e.message);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[shopify-app-install] Error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
});
