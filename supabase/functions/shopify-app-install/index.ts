// shopify-app-install
//
// Called by the Vercel shopify-callback function for App Store installs where
// no Tandril user was logged in during OAuth. Accepts a raw access token and
// user_id, encrypts the token, upserts the platforms row, and registers the
// required webhooks. Secured by service-role bearer only.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getSecretKey, isServiceRequest } from '../_shared/supabaseKeys.ts';
import { normalizeShopDomain } from '../_shared/shopifySecurity.ts';

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

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

async function emailSignInLink(adminClient: any, email: string, redirectTo: string | undefined, storeName: string): Promise<boolean> {
  const resendKey = Deno.env.get('RESEND_API_KEY');
  if (!resendKey) {
    console.warn('[shopify-app-install] RESEND_API_KEY not set — sign-in link not emailed');
    return false;
  }
  try {
    const { data, error } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: redirectTo ? { redirectTo } : undefined,
    });
    const link = data?.properties?.action_link;
    if (error || !link) throw new Error(error?.message || 'no action_link returned');

    const store = escapeHtml(storeName);
    const html = `
      <p>Hi,</p>
      <p>Tandril was just installed on your Shopify store <strong>${store}</strong>, and it's now connected to your Tandril account.</p>
      <p><a href="${escapeHtml(link)}" style="display:inline-block;padding:10px 18px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none">Sign in to Tandril</a></p>
      <p>This link works once and expires soon. If you didn't install Tandril, you can ignore this email — nobody can use it to get into your account without this link.</p>
      <p>— Tandril</p>`;
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Tandril <noreply@tandril.org>',
        to: [email],
        subject: 'Sign in to Tandril — your Shopify store is connected',
        html,
      }),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
    console.log('[shopify-app-install] Emailed sign-in link to the store owner');
    return true;
  } catch (e) {
    console.error('[shopify-app-install] Could not email sign-in link:', e.message);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' } });
  }

  try {
    // Called only by Vercel's api/shopify-callback.js with the secret key on the apikey
    // header. Deployed with --no-verify-jwt.
    const serviceRoleKey = getSecretKey();
    if (!isServiceRequest(req)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { user_id, shop: rawShop, shop_name, access_token, scope, email_sign_in_link } = await req.json();
    const shop = normalizeShopDomain(rawShop);
    if (!user_id || !shop || !access_token) {
      return new Response(JSON.stringify({ error: 'Missing or invalid fields: user_id, shop, access_token' }), { status: 400 });
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
        status: 'connected', // clears a 'needs_reconnect' flag on reconnect
        last_synced_at: new Date().toISOString(),
      }, { onConflict: 'user_id,shop_domain' });

    if (upsertError) throw new Error('Platform upsert failed: ' + upsertError.message);

    console.log(`[shopify-app-install] Platform upserted for user=${user_id} shop=${shop}`);

    // Register webhooks
    const webhooks = [
      { topic: 'orders/paid', address: `${supabaseUrl}/functions/v1/shopify-order-webhook` },
      { topic: 'orders/cancelled', address: `${supabaseUrl}/functions/v1/shopify-order-webhook` },
      { topic: 'refunds/create', address: `${supabaseUrl}/functions/v1/shopify-order-webhook` },
      { topic: 'inventory_levels/update', address: `${supabaseUrl}/functions/v1/shopify-order-webhook` },
      { topic: 'app/uninstalled', address: `${supabaseUrl}/functions/v1/app-uninstalled` },
      { topic: 'app_subscriptions/update', address: `${supabaseUrl}/functions/v1/app-subscription-update` },
    ];

    for (const wh of webhooks) {
      try {
        await fetch(`https://${shop}/admin/api/2026-01/webhooks.json`, {
          method: 'POST',
          headers: { 'X-Shopify-Access-Token': access_token, 'Content-Type': 'application/json' },
          body: JSON.stringify({ webhook: { topic: wh.topic, address: wh.address, format: 'json' } }),
        });
        console.log(`[shopify-app-install] Registered ${wh.topic} for ${shop}`);
      } catch (e) {
        console.warn(`[shopify-app-install] Webhook registration failed for ${wh.topic}:`, e.message);
      }
    }

    // Install for an EXISTING Tandril account: the browser is not signed in automatically
    // (the store's email is set by whoever owns the store, so it can't prove they own the
    // Tandril account). Email the sign-in link to that address instead.
    let signInEmailSent = false;
    if (email_sign_in_link?.email) {
      signInEmailSent = await emailSignInLink(adminClient, email_sign_in_link.email, email_sign_in_link.redirect_to, shop_name || shop);
    }

    return new Response(JSON.stringify({ success: true, sign_in_email_sent: signInEmailSent }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[shopify-app-install] Error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
});
