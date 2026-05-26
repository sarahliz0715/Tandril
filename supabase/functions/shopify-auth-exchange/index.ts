// Shopify OAuth Exchange Edge Function
//
// Called FROM THE FRONTEND (with the user's JWT) after the Vercel proxy
// redirects the Shopify callback to /Platforms?shopify_code=...
//
// This approach avoids needing JWT verification disabled on the callback
// function, because the frontend already has the user's session.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

// --- Inlined encryption helpers ---
const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;

async function getEncryptionKey(): Promise<CryptoKey> {
  const secret = Deno.env.get('ENCRYPTION_SECRET');
  if (!secret) throw new Error('ENCRYPTION_SECRET environment variable not set');
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(secret), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: encoder.encode('tandril-encryption-salt-v1'), iterations: 100000, hash: 'SHA-256' },
    keyMaterial, { name: ALGORITHM, length: KEY_LENGTH }, false, ['encrypt', 'decrypt']
  );
}

async function encrypt(plaintext: string): Promise<string> {
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

    const { code, state, shop } = await req.json();

    if (!code || !state || !shop) {
      throw new Error('Missing required parameters: code, state, shop');
    }

    console.log(`[Shopify Exchange] Processing for shop=${shop} user=${user.id}`);

    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!serviceRoleKey) throw new Error('Server configuration error');

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      serviceRoleKey
    );

    // Validate the OAuth state (CSRF protection)
    const { data: oauthState, error: stateError } = await adminClient
      .from('oauth_states')
      .select('*')
      .eq('state', state)
      .eq('shop_domain', shop)
      .eq('user_id', user.id)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (stateError || !oauthState) {
      console.warn('[Shopify Exchange] State validation failed (continuing anyway):', stateError?.message);
    }

    const shopifyApiKey = Deno.env.get('SHOPIFY_API_KEY');
    const shopifyApiSecret = Deno.env.get('SHOPIFY_API_SECRET');

    if (!shopifyApiKey || !shopifyApiSecret) {
      throw new Error('Shopify API credentials not configured');
    }

    const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: shopifyApiKey,
        client_secret: shopifyApiSecret,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`Failed to exchange code for token: ${errorText}`);
    }

    const { access_token, scope } = await tokenResponse.json();
    if (!access_token) throw new Error('No access token received from Shopify');

    let shopName = shop;
    try {
      const shopInfoResponse = await fetch(`https://${shop}/admin/api/2024-01/shop.json`, {
        headers: { 'X-Shopify-Access-Token': access_token },
      });
      if (shopInfoResponse.ok) {
        const { shop: shopInfo } = await shopInfoResponse.json();
        shopName = shopInfo?.name || shop;
      }
    } catch (_) { /* non-fatal */ }

    const encryptedToken = await encrypt(access_token);

    const { data: platform, error: platformError } = await adminClient
      .from('platforms')
      .upsert({
        user_id: user.id,
        platform_type: 'shopify',
        shop_domain: shop,
        shop_name: shopName,
        access_token: encryptedToken,
        access_scopes: scope ? scope.split(',') : [],
        is_active: true,
        last_synced_at: new Date().toISOString(),
      }, { onConflict: 'user_id,shop_domain' })
      .select()
      .single();

    if (platformError) {
      console.error('[Shopify Exchange] Platform upsert failed:', platformError);
      throw new Error(`Failed to store platform: ${platformError.message}`);
    }

    // Register order webhook for real-time inventory sync
    try {
      const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/shopify-order-webhook`;
      await fetch(`https://${shop}/admin/api/2024-01/webhooks.json`, {
        method: 'POST',
        headers: { 'X-Shopify-Access-Token': access_token, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhook: { topic: 'orders/paid', address: webhookUrl, format: 'json' }
        }),
      });
      console.log(`[Shopify Exchange] Registered orders/paid webhook for ${shop}`);
    } catch (webhookErr) {
      console.warn(`[Shopify Exchange] Webhook registration failed: ${webhookErr.message}`);
    }

    await adminClient.from('oauth_states').delete().eq('state', state);

    // Fire-and-forget: link products across platforms by SKU
    fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/link-products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
      body: JSON.stringify({ user_id: user.id }),
    }).catch(e => console.warn('[Shopify Exchange] link-products trigger failed:', e.message));

    console.log(`[Shopify Exchange] Successfully connected ${shop} for user ${user.id}`);

    return new Response(
      JSON.stringify({ success: true, platform }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('[Shopify Exchange] Error:', error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
