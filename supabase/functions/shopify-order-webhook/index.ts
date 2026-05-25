import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

async function decrypt(encrypted: string): Promise<string> {
  const key = await getEncryptionKey();
  const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
  const decrypted = await crypto.subtle.decrypt({ name: ALGORITHM, iv: combined.slice(0, IV_LENGTH) }, key, combined.slice(IV_LENGTH));
  return new TextDecoder().decode(decrypted);
}

function isEncrypted(value: string): boolean {
  try { return atob(value).length > IV_LENGTH; } catch { return false; }
}
// --- End encryption helpers ---

const SHOPIFY_API_VERSION = '2024-01';

async function verifyShopifyHmac(body: string, hmacHeader: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  const computed = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return computed === hmacHeader;
}

serve(async (req) => {
  try {
    const shopDomain = req.headers.get('x-shopify-shop-domain') ?? '';
    const hmacHeader = req.headers.get('x-shopify-hmac-sha256') ?? '';
    const topic = req.headers.get('x-shopify-topic') ?? '';

    const rawBody = await req.text();

    if (!['orders/create', 'orders/paid', 'orders/cancelled', 'refunds/create'].includes(topic)) {
      return new Response('ok', { status: 200 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: platform } = await supabase
      .from('platforms')
      .select('*')
      .eq('shop_domain', shopDomain)
      .eq('platform_type', 'shopify')
      .eq('is_active', true)
      .single();

    if (!platform) {
      console.warn(`[shopify-order-webhook] Unknown shop domain: ${shopDomain}`);
      return new Response('ok', { status: 200 });
    }

    let token = platform.access_token;
    if (token && isEncrypted(token)) token = await decrypt(token);

    const webhookSecret = platform.metadata?.webhook_secret;
    if (webhookSecret) {
      const valid = await verifyShopifyHmac(rawBody, hmacHeader, webhookSecret);
      if (!valid) {
        console.error('[shopify-order-webhook] HMAC verification failed');
        return new Response('Unauthorized', { status: 401 });
      }
    }

    const payload = JSON.parse(rawBody);
    console.log(`[shopify-order-webhook] topic=${topic} id=${payload.id} shop=${shopDomain}`);

    // For refunds, affected line items are nested under refund_line_items
    const lineItems = topic === 'refunds/create'
      ? (payload.refund_line_items ?? []).map((r: any) => r.line_item).filter(Boolean)
      : (payload.line_items ?? []);

    const skuUpdates: { sku: string; quantity: number }[] = [];

    for (const lineItem of lineItems) {
      const sku = lineItem.sku;
      if (!sku) continue;

      const variantRes = await fetch(
        `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/variants/${lineItem.variant_id}.json`,
        { headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' } }
      );
      if (!variantRes.ok) continue;
      const { variant } = await variantRes.json();

      const invRes = await fetch(
        `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/inventory_levels.json?inventory_item_ids=${variant.inventory_item_id}`,
        { headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' } }
      );
      if (!invRes.ok) continue;
      const { inventory_levels } = await invRes.json();
      const totalQty = (inventory_levels ?? []).reduce((sum: number, l: any) => sum + (l.available ?? 0), 0);

      skuUpdates.push({ sku, quantity: totalQty });
    }

    if (skuUpdates.length === 0) return new Response('ok', { status: 200 });

    const syncUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/sync-inventory-levels`;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    await Promise.all(skuUpdates.map(({ sku, quantity }) =>
      fetch(syncUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceRoleKey}` },
        body: JSON.stringify({
          user_id: platform.user_id, sku, new_quantity: quantity,
          source_platform_id: platform.id, source_platform_type: 'shopify', triggered_by: 'webhook',
        }),
      })
    ));

    return new Response('ok', { status: 200 });

  } catch (error) {
    console.error('[shopify-order-webhook] Error:', error.message);
    return new Response('ok', { status: 200 });
  }
});
