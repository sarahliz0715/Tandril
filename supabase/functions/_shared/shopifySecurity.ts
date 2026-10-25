// Shopify security helpers shared by the connect flows and webhooks.
//
// normalizeShopDomain: every place that builds `https://${shop}/...` and sends
// it our client secret or a store token must only ever talk to a real
// *.myshopify.com store. Without this, a signed-in user (or anyone, on the App
// Store install path) could pass shop=attacker.example and Tandril would POST
// SHOPIFY_API_SECRET to that server during the "code → token" exchange.
//
// verifyShopifyWebhookHmac: checks X-Shopify-Hmac-Sha256 (base64 HMAC-SHA256 of
// the raw body with the app's client secret) with a constant-time compare, as
// Shopify recommends.

const SHOP_DOMAIN_RE = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/;

// Accepts "my-store", "my-store.myshopify.com", "https://my-store.myshopify.com/admin".
// Returns "my-store.myshopify.com", or null if it isn't a myshopify.com store address.
export function normalizeShopDomain(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  let s = input.trim().toLowerCase().replace(/^https?:\/\//, '');
  s = s.split(/[/?#]/)[0];
  if (s && !s.includes('.')) s = `${s}.myshopify.com`;
  return SHOP_DOMAIN_RE.test(s) ? s : null;
}

function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

export async function verifyShopifyWebhookHmac(rawBody: string, hmacHeader: string | null, secret: string): Promise<boolean> {
  if (!hmacHeader || !secret) return false;
  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(rawBody)));
    let bin = '';
    for (const b of sig) bin += String.fromCharCode(b);
    return timingSafeEqual(btoa(bin), hmacHeader.trim());
  } catch (err) {
    console.error('[shopify webhook] HMAC verification error:', err);
    return false;
  }
}
