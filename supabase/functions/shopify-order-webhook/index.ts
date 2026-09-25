import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { isExternallyManagedLocation } from '../_shared/shopifyStock.ts';

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

// ─── GraphQL helpers ──────────────────────────────────────────────────────────

async function shopifyGraphQL(domain: string, token: string, query: string, variables: Record<string, any> = {}) {
  const response = await fetch(`https://${domain}/admin/api/2025-01/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': token,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!response.ok) throw new Error(`Shopify GraphQL request failed: ${response.status}`);
  const result = await response.json();
  if (result.errors?.length) throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
  return result.data;
}

function toShopifyGid(type: string, id: string | number): string {
  return `gid://shopify/${type}/${id}`;
}

function fromShopifyGid(gid: string): string {
  return String(gid).split('/').pop() || String(gid);
}

// ─────────────────────────────────────────────────────────────────────────────

async function verifyShopifyHmac(body: string, hmacHeader: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  const computed = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return computed === hmacHeader;
}

// Sum "available" stock over the locations the store itself manages. Returns null when
// every level belongs to a fulfillment app (e.g. Printful's 9999 = made to order), whose
// number must never be copied to other stores.
async function storeManagedQty(shopDomain: string, token: string, inventoryItemGid: string, edges: any[]): Promise<number | null> {
  let total = 0, counted = 0;
  for (const e of edges) {
    const qty = e.node.quantities?.find((q: any) => q.name === 'available')?.quantity ?? 0;
    if (e.node.location?.id && await isExternallyManagedLocation(shopDomain, token, e.node.location.id, inventoryItemGid, qty)) continue;
    total += qty;
    counted++;
  }
  return counted === 0 && edges.length > 0 ? null : total;
}

serve(async (req) => {
  try {
    const shopDomain = req.headers.get('x-shopify-shop-domain') ?? '';
    const hmacHeader = req.headers.get('x-shopify-hmac-sha256') ?? '';
    const topic = req.headers.get('x-shopify-topic') ?? '';

    const rawBody = await req.text();

    // Every webhook Shopify sends for this app is signed with the app's own
    // client secret (the same SHOPIFY_API_SECRET already used by
    // app-subscription-update/app-uninstalled) — not a per-shop secret.
    // Verify this before doing anything else, so an unsigned/forged request
    // never reaches the database lookups below.
    const shopifyApiSecret = Deno.env.get('SHOPIFY_API_SECRET');
    if (!shopifyApiSecret) {
      console.error('[shopify-order-webhook] SHOPIFY_API_SECRET not configured');
      return new Response('Server configuration error', { status: 500 });
    }
    const validSignature = await verifyShopifyHmac(rawBody, hmacHeader, shopifyApiSecret);
    if (!validSignature) {
      console.error('[shopify-order-webhook] HMAC verification failed — rejecting request');
      return new Response('Unauthorized', { status: 401 });
    }

    if (!['orders/create', 'orders/paid', 'orders/cancelled', 'refunds/create', 'inventory_levels/update'].includes(topic)) {
      return new Response('ok', { status: 200 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // A shop can have more than one platforms row (reconnects) — take the most recently updated
    const { data: platform } = await supabase
      .from('platforms')
      .select('*')
      .eq('shop_domain', shopDomain.toLowerCase())
      .eq('platform_type', 'shopify')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!platform) {
      console.warn(`[shopify-order-webhook] Unknown shop domain: ${shopDomain}`);
      return new Response('ok', { status: 200 });
    }

    let token = platform.access_token;
    if (token && isEncrypted(token)) token = await decrypt(token);

    const payload = JSON.parse(rawBody);
    console.log(`[shopify-order-webhook] topic=${topic} id=${payload.id ?? payload.inventory_item_id} shop=${shopDomain}`);

    const skuUpdates: { sku: string; quantity: number }[] = [];

    if (topic === 'inventory_levels/update') {
      // Fires on ANY stock change at a location — manual edits in Shopify admin, orders,
      // apps, and Tandril's own writes from sync-inventory-levels. Payload only has the
      // inventory item + location, so look up the SKU and the total across locations.
      if (!payload.inventory_item_id) return new Response('ok', { status: 200 });
      const invData = await shopifyGraphQL(shopDomain, token, `
        query($id: ID!) {
          inventoryItem(id: $id) {
            sku
            inventoryLevels(first: 10) {
              edges { node { location { id } quantities(names: ["available"]) { name quantity } } }
            }
          }
        }
      `, { id: toShopifyGid('InventoryItem', payload.inventory_item_id) }).catch(() => null);

      const sku = invData?.inventoryItem?.sku;
      if (!sku) return new Response('ok', { status: 200 });
      const totalQty = await storeManagedQty(shopDomain, token, toShopifyGid('InventoryItem', payload.inventory_item_id), invData.inventoryItem.inventoryLevels.edges || []);
      if (totalQty === null) {
        console.log(`[shopify-order-webhook] SKU=${sku} stock is managed by a fulfillment app (e.g. Printful) — not syncing`);
        return new Response('ok', { status: 200 });
      }

      // Only linked SKUs sync anywhere. If the link already holds this quantity, the change
      // is either Tandril's own write echoing back or already propagated (e.g. by the
      // orders/paid webhook for the same sale) — skip it so nothing ping-pongs.
      const { data: link } = await supabase
        .from('platform_product_links')
        .select('id, last_synced_quantity')
        .eq('platform_id', platform.id)
        .eq('sku', sku)
        .limit(1)
        .maybeSingle();
      if (!link) return new Response('ok', { status: 200 });
      if (link.last_synced_quantity === totalQty) {
        console.log(`[shopify-order-webhook] SKU=${sku} qty=${totalQty} unchanged since last sync — skipping`);
        return new Response('ok', { status: 200 });
      }

      skuUpdates.push({ sku, quantity: totalQty });
    }

    // For refunds, affected line items are nested under refund_line_items
    const lineItems = topic === 'inventory_levels/update' ? []
      : topic === 'refunds/create'
      ? (payload.refund_line_items ?? []).map((r: any) => r.line_item).filter(Boolean)
      : (payload.line_items ?? []);

    for (const lineItem of lineItems) {
      const sku = lineItem.sku;
      if (!sku || !lineItem.variant_id) continue;

      // Fetch variant via GraphQL to get inventoryItem id
      const variantData = await shopifyGraphQL(shopDomain, token, `
        query($id: ID!) {
          productVariant(id: $id) {
            id sku
            inventoryItem { id }
          }
        }
      `, { id: toShopifyGid('ProductVariant', lineItem.variant_id) }).catch(() => null);

      if (!variantData?.productVariant) continue;

      const inventoryItemId = variantData.productVariant.inventoryItem?.id;
      if (!inventoryItemId) continue;

      // Fetch inventory levels via GraphQL
      const invData = await shopifyGraphQL(shopDomain, token, `
        query($id: ID!) {
          inventoryItem(id: $id) {
            inventoryLevels(first: 10) {
              edges {
                node {
                  location { id }
                  quantities(names: ["available"]) { name quantity }
                }
              }
            }
          }
        }
      `, { id: inventoryItemId }).catch(() => null);

      if (!invData?.inventoryItem) continue;

      const totalQty = await storeManagedQty(shopDomain, token, inventoryItemId, invData.inventoryItem.inventoryLevels.edges || []);
      if (totalQty === null) {
        console.log(`[shopify-order-webhook] SKU=${sku} stock is managed by a fulfillment app (e.g. Printful) — not syncing`);
        continue;
      }

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
