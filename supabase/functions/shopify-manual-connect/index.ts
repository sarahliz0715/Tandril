// Shopify Manual Connect Edge Function
//
// Alternate, non-OAuth path for connecting a Shopify store to Tandril.
// Used when a Partner-dashboard app (OAuth) is blocked by Shopify's app
// review process. Instead of OAuth, the merchant creates a "custom app"
// directly in their own Shopify admin (Settings > Apps and sales channels
// > Develop apps), which issues an Admin API access token with no Shopify
// review required. This function takes that token, verifies it actually
// works against the merchant's store, and stores it in the exact same
// `platforms` row shape that the OAuth flow (shopify-auth-exchange) uses,
// so the rest of the app can't tell which method was used to connect.
//
// This function is intentionally separate from shopify-auth-init /
// shopify-auth-callback / shopify-auth-exchange so the normal OAuth path
// is untouched for everyone else.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

// --- Inlined encryption helpers (kept identical to shopify-auth-exchange) ---
const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;

async function getEncryptionKey() {
  const secret = Deno.env.get('ENCRYPTION_SECRET');
  if (!secret) throw new Error('ENCRYPTION_SECRET environment variable not set');
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(secret), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: encoder.encode('tandril-encryption-salt-v1'), iterations: 100000, hash: 'SHA-256' },
    keyMaterial, { name: ALGORITHM, length: KEY_LENGTH }, false, ['encrypt', 'decrypt']
  );
}

async function encrypt(plaintext) {
  const key = await getEncryptionKey();
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const ciphertext = await crypto.subtle.encrypt({ name: ALGORITHM, iv }, key, encoder.encode(plaintext));
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return btoa(String.fromCharCode(...combined));
}
// --- End encryption helpers ---

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    let { shop_domain, access_token } = await req.json();
    if (!shop_domain || !access_token) {
      throw new Error('Missing required fields: shop_domain, access_token');
    }

    shop_domain = shop_domain.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (!shop_domain.includes('.myshopify.com')) {
      shop_domain = `${shop_domain}.myshopify.com`;
    }
    access_token = access_token.trim();

    console.log(`[Shopify Manual Connect] Verifying token for shop=${shop_domain} user=${user.id}`);

    // Verify the token actually works against this shop before saving anything
    const shopInfoResponse = await fetch(`https://${shop_domain}/admin/api/2024-01/shop.json`, {
      headers: { 'X-Shopify-Access-Token': access_token },
    });

    if (!shopInfoResponse.ok) {
      const errorText = await shopInfoResponse.text();
      throw new Error(
        shopInfoResponse.status === 401 || shopInfoResponse.status === 403
          ? 'Shopify rejected this access token. Double-check you copied the full token from your custom app and that the app has the required scopes.'
          : `Shopify returned an error verifying the token: ${errorText}`
      );
    }

    const { shop: shopInfo } = await shopInfoResponse.json();
    const shopName = shopInfo?.name || shop_domain;

    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!serviceRoleKey) throw new Error('Server configuration error');

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      serviceRoleKey
    );

    const encryptedToken = await encrypt(access_token);

    const { data: platform, error: platformError } = await adminClient
      .from('platforms')
      .upsert({
        user_id: user.id,
        platform_type: 'shopify',
        shop_domain,
        shop_name: shopName,
        access_token: encryptedToken,
        access_scopes: [],
        is_active: true,
        last_synced_at: new Date().toISOString(),
      }, { onConflict: 'user_id,shop_domain' })
      .select()
      .single();

    if (platformError) {
      console.error('[Shopify Manual Connect] Platform upsert failed:', platformError);
      throw new Error(`Failed to store platform: ${platformError.message}`);
    }

    // Register order webhook for real-time inventory sync (best-effort, same as OAuth path)
    try {
      const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/shopify-order-webhook`;
      await fetch(`https://${shop_domain}/admin/api/2024-01/webhooks.json`, {
        method: 'POST',
        headers: { 'X-Shopify-Access-Token': access_token, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhook: { topic: 'orders/paid', address: webhookUrl, format: 'json' }
        }),
      });
      console.log(`[Shopify Manual Connect] Registered orders/paid webhook for ${shop_domain}`);
    } catch (webhookErr) {
      console.warn(`[Shopify Manual Connect] Webhook registration failed: ${webhookErr.message}`);
    }

    // Fire-and-forget: link products across platforms by SKU (same as OAuth path)
    fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/link-products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
      body: JSON.stringify({ user_id: user.id }),
    }).catch(e => console.warn('[Shopify Manual Connect] link-products trigger failed:', e.message));

    console.log(`[Shopify Manual Connect] Successfully connected ${shop_domain} for user ${user.id}`);

    return new Response(
      JSON.stringify({ success: true, platform }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('[Shopify Manual Connect] Error:', error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
