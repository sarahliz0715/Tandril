// Reorder Point Calculator Edge Function
// Fully deterministic — no AI/LLM calls. Same style as price-guardrail / inventory-protection.
//
// For each active Shopify product/variant with a SKU:
//   1. daily_velocity = units sold in a trailing window ÷ window length (days)
//   2. days_of_stock_remaining = current inventory ÷ daily_velocity (null if velocity is 0)
//   3. reorder_point = (supplier lead_time_days × daily_velocity) × (1 + safety_buffer_percent / 100)
//   4. needs_reorder = current inventory <= reorder_point
//
// A product is skipped (not silently defaulted) if it has no linked, active supplier
// in product_suppliers/suppliers — we never guess a lead time.
//
// Order history is fetched live from Shopify (same approach as calculate-pnl / check-alerts),
// not from the local orders/order_items tables — see CLAUDE.md for why.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// --- Inlined from _shared/encryption.ts ---
const _ENC_ALGORITHM = 'AES-GCM';
const _ENC_IV_LENGTH = 12;
async function _getEncryptionKey(): Promise<CryptoKey> {
  const secret = Deno.env.get('ENCRYPTION_SECRET');
  if (!secret) throw new Error('ENCRYPTION_SECRET environment variable not set');
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(secret), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: encoder.encode('tandril-encryption-salt-v1'), iterations: 100000, hash: 'SHA-256' },
    keyMaterial, { name: _ENC_ALGORITHM, length: 256 }, false, ['encrypt', 'decrypt']
  );
}
async function decrypt(encrypted: string): Promise<string> {
  try {
    const key = await _getEncryptionKey();
    const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
    const iv = combined.slice(0, _ENC_IV_LENGTH);
    const ciphertext = combined.slice(_ENC_IV_LENGTH);
    const decrypted = await crypto.subtle.decrypt({ name: _ENC_ALGORITHM, iv }, key, ciphertext);
    return new TextDecoder().decode(decrypted);
  } catch { throw new Error('Failed to decrypt data'); }
}
function isEncrypted(value: string): boolean {
  try { return atob(value).length > _ENC_IV_LENGTH; } catch { return false; }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Get configuration parameters
    const {
      trailing_window_days = 30,     // Sales velocity lookback window
      safety_buffer_percent = 20,    // Extra buffer on top of lead-time demand
      alert_cooldown_hours = 24,     // Don't re-fire a smart_alert for the same SKU within this window
      workflow_id = null,            // Optional workflow ID for tracking
    } = await req.json().catch(() => ({}));

    console.log(`[Reorder Point Calculator] Running for user ${user.id}, window: ${trailing_window_days}d, buffer: ${safety_buffer_percent}%`);

    // Get all active Shopify platforms for the user
    // (Same scope as price-guardrail/inventory-protection — Shopify is the only platform
    // this codebase can pull real order history from live. See CLAUDE.md for the (a) vs (b)
    // tradeoff on where sales-velocity data comes from.)
    const { data: platforms, error: platformsError } = await supabaseClient
      .from('platforms')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .eq('platform_type', 'shopify');

    if (platformsError) {
      throw new Error(`Failed to fetch platforms: ${platformsError.message}`);
    }

    if (!platforms || platforms.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No active Shopify stores found',
          data: { results: [] },
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Decrypt access tokens for all platforms
    for (const platform of platforms) {
      if (platform.access_token && isEncrypted(platform.access_token)) {
        try {
          platform.access_token = await decrypt(platform.access_token);
        } catch (error) {
          console.error(`Failed to decrypt token for ${platform.shop_domain}`);
          throw new Error('Failed to decrypt platform credentials');
        }
      }
    }

    // Load this user's supplier lead times once, keyed by trimmed SKU.
    // (product_suppliers.sku -> suppliers.lead_time_days, active suppliers only.)
    const skuToSupplier = await loadSkuSupplierMap(supabaseClient, user.id);

    // Process each platform
    const allResults = [];
    const needsReorderAcrossAccount: any[] = [];

    for (const platform of platforms) {
      console.log(`[Reorder Point Calculator] Processing ${platform.shop_domain}`);

      try {
        const platformResults = await calculateReorderPoints(
          platform,
          skuToSupplier,
          trailing_window_days,
          safety_buffer_percent
        );
        allResults.push({
          platform: platform.shop_name,
          platform_id: platform.id,
          success: true,
          ...platformResults,
        });

        for (const item of platformResults.needs_reorder) {
          needsReorderAcrossAccount.push({ ...item, platform_id: platform.id, platform_name: platform.shop_name });
        }
      } catch (error) {
        console.error(`[Reorder Point Calculator] Error on ${platform.shop_domain}:`, error);
        allResults.push({
          platform: platform.shop_name,
          platform_id: platform.id,
          success: false,
          error: error.message,
        });
      }
    }

    // Surface results as smart_alerts (the existing "flag this to the user" table —
    // same pattern check-alerts uses). Deduped so re-running this doesn't spam the
    // notification bell with the same SKU every time it's called.
    const alertsCreated = await createReorderAlerts(
      supabaseClient,
      user.id,
      needsReorderAcrossAccount,
      alert_cooldown_hours
    );

    // Log results to workflow_runs if workflow_id provided
    if (workflow_id) {
      await supabaseClient
        .from('workflow_runs')
        .insert({
          workflow_id,
          user_id: user.id,
          status: 'completed',
          results: { platforms: allResults, alerts_created: alertsCreated },
          executed_at: new Date().toISOString(),
        });
    }

    const totalSkusProcessed = allResults.reduce((sum, r: any) => sum + (r.skus_processed || 0), 0);
    const totalSkipped = allResults.reduce((sum, r: any) => sum + (r.skipped?.length || 0), 0);

    console.log(`[Reorder Point Calculator] Complete - ${needsReorderAcrossAccount.length} need reorder, ${alertsCreated} new alerts, ${totalSkipped} skipped (no supplier), across ${platforms.length} stores`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          trailing_window_days,
          safety_buffer_percent,
          platforms_processed: platforms.length,
          total_skus_processed: totalSkusProcessed,
          needs_reorder_count: needsReorderAcrossAccount.length,
          skipped_count: totalSkipped,
          alerts_created: alertsCreated,
          results: allResults,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[Reorder Point Calculator] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

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

function fromShopifyGid(gid: string): string {
  return String(gid).split('/').pop() || String(gid);
}

// ─── Supplier lookup ──────────────────────────────────────────────────────────

async function loadSkuSupplierMap(supabaseClient: any, userId: string): Promise<Map<string, any>> {
  const { data: rows, error } = await supabaseClient
    .from('product_suppliers')
    .select('sku, product_id, is_primary, suppliers(id, name, lead_time_days, is_active)')
    .eq('user_id', userId);

  if (error) {
    console.error('[Reorder Point Calculator] Failed to load product_suppliers:', error.message);
    return new Map();
  }

  const map = new Map<string, any>();
  for (const row of rows || []) {
    const sku = (row.sku || '').trim();
    const supplier = row.suppliers;
    if (!sku || !supplier || supplier.is_active === false) continue;

    const existing = map.get(sku);
    // Prefer the primary supplier if a SKU somehow has more than one row
    if (!existing || (row.is_primary && !existing.is_primary)) {
      map.set(sku, {
        supplier_id: supplier.id,
        supplier_name: supplier.name,
        lead_time_days: supplier.lead_time_days,
        is_primary: row.is_primary,
      });
    }
  }
  return map;
}

// ─── Core calculation ─────────────────────────────────────────────────────────

async function calculateReorderPoints(
  platform: any,
  skuToSupplier: Map<string, any>,
  trailingWindowDays: number,
  safetyBufferPercent: number
): Promise<any> {
  // Current inventory per active product/variant
  const productsData = await shopifyGraphQL(platform.shop_domain, platform.access_token, `
    query {
      products(first: 250, query: "status:active") {
        edges {
          node {
            id title
            variants(first: 100) {
              edges {
                node {
                  id title sku inventoryQuantity
                }
              }
            }
          }
        }
      }
    }
  `);

  const products = (productsData.products.edges || []).map((e: any) => ({
    ...e.node,
    id: fromShopifyGid(e.node.id),
    variants: e.node.variants.edges.map((v: any) => ({
      ...v.node,
      id: fromShopifyGid(v.node.id),
    })),
  }));

  // Units sold per SKU over the trailing window, from paid orders
  const cutoff = new Date(Date.now() - trailingWindowDays * 24 * 60 * 60 * 1000);
  const cutoffISO = cutoff.toISOString();

  const ordersData = await shopifyGraphQL(platform.shop_domain, platform.access_token, `
    query {
      orders(first: 250, query: "financial_status:paid created_at:>=${cutoffISO}") {
        edges {
          node {
            id
            lineItems(first: 50) {
              edges {
                node {
                  sku quantity
                }
              }
            }
          }
        }
      }
    }
  `);

  const unitsSoldBySku = new Map<string, number>();
  for (const orderEdge of ordersData.orders.edges || []) {
    for (const itemEdge of orderEdge.node.lineItems.edges || []) {
      const sku = (itemEdge.node.sku || '').trim();
      if (!sku) continue;
      unitsSoldBySku.set(sku, (unitsSoldBySku.get(sku) || 0) + (itemEdge.node.quantity || 0));
    }
  }

  console.log(`[Reorder Point Calculator] ${platform.shop_domain}: ${products.length} active products, sales data for ${unitsSoldBySku.size} SKUs over ${trailingWindowDays}d`);

  const results: any[] = [];
  const skipped: any[] = [];
  const needsReorder: any[] = [];

  for (const product of products) {
    for (const variant of product.variants || []) {
      const sku = (variant.sku || '').trim();
      const title = `${product.title}${variant.title && variant.title !== 'Default Title' ? ' - ' + variant.title : ''}`;

      if (!sku) {
        skipped.push({ product_id: product.id, variant_id: variant.id, title, reason: 'no SKU on file' });
        continue;
      }

      try {
        const supplier = skuToSupplier.get(sku);
        if (!supplier) {
          skipped.push({ sku, product_id: product.id, variant_id: variant.id, title, reason: 'no supplier lead time on file' });
          continue;
        }

        const currentInventory = variant.inventoryQuantity ?? 0;
        const unitsSold = unitsSoldBySku.get(sku) || 0;
        const dailyVelocity = unitsSold / trailingWindowDays;
        const daysOfStockRemaining = dailyVelocity > 0 ? currentInventory / dailyVelocity : null;

        const leadTimeDays = supplier.lead_time_days ?? 0;
        const leadTimeDemand = leadTimeDays * dailyVelocity;
        const reorderPoint = leadTimeDemand * (1 + safetyBufferPercent / 100);
        const needsReorderFlag = currentInventory <= reorderPoint;

        const row = {
          sku,
          product_id: product.id,
          variant_id: variant.id,
          title,
          current_inventory: currentInventory,
          daily_velocity: parseFloat(dailyVelocity.toFixed(3)),
          days_of_stock_remaining: daysOfStockRemaining !== null ? parseFloat(daysOfStockRemaining.toFixed(1)) : null,
          supplier_name: supplier.supplier_name,
          lead_time_days: leadTimeDays,
          reorder_point: parseFloat(reorderPoint.toFixed(2)),
          needs_reorder: needsReorderFlag,
        };

        results.push(row);
        if (needsReorderFlag) needsReorder.push(row);
      } catch (error) {
        console.error(`[Reorder Point Calculator] Error on SKU ${sku}:`, error.message);
        skipped.push({ sku, product_id: product.id, variant_id: variant.id, title, reason: `error: ${error.message}` });
      }
    }
  }

  return {
    products_checked: products.length,
    skus_processed: results.length,
    needs_reorder_count: needsReorder.length,
    needs_reorder: needsReorder,
    skipped,
    results,
  };
}

// ─── Alerts ───────────────────────────────────────────────────────────────────

async function createReorderAlerts(
  supabaseClient: any,
  userId: string,
  needsReorderItems: any[],
  cooldownHours: number
): Promise<number> {
  if (needsReorderItems.length === 0) return 0;

  // Avoid re-firing the same SKU+platform alert every time this runs (e.g. daily cron)
  const cooldownCutoff = new Date(Date.now() - cooldownHours * 60 * 60 * 1000).toISOString();
  const { data: recentAlerts } = await supabaseClient
    .from('smart_alerts')
    .select('suggested_actions')
    .eq('user_id', userId)
    .eq('is_dismissed', false)
    .gte('created_at', cooldownCutoff);

  const recentlyAlertedKeys = new Set<string>();
  for (const alert of recentAlerts || []) {
    for (const action of alert.suggested_actions || []) {
      if (action?.reorder_key) recentlyAlertedKeys.add(action.reorder_key);
    }
  }

  let created = 0;
  for (const item of needsReorderItems) {
    const reorderKey = `${item.platform_id}:${item.sku}`;
    if (recentlyAlertedKeys.has(reorderKey)) continue;

    const priority = item.days_of_stock_remaining === null || item.days_of_stock_remaining <= item.lead_time_days
      ? 'high'
      : 'medium';

    const { error } = await supabaseClient.from('smart_alerts').insert({
      user_id: userId,
      alert_type: 'maintenance',
      title: `Reorder point reached: ${item.title}`,
      message: item.days_of_stock_remaining !== null
        ? `${item.title} (${item.platform_name}) has ${item.current_inventory} units left, selling ~${item.daily_velocity}/day — about ${item.days_of_stock_remaining} days of stock. Supplier lead time is ${item.lead_time_days} days, so it's time to reorder.`
        : `${item.title} (${item.platform_name}) has ${item.current_inventory} units left and no recent sales data to estimate days of stock, but inventory has dropped to/below its reorder point. Supplier lead time is ${item.lead_time_days} days.`,
      priority,
      suggested_actions: [{
        action: 'Create purchase order',
        command: `Create a purchase order for ${item.title}`,
        reorder_key: reorderKey,
        sku: item.sku,
      }],
    });

    if (!error) created++;
    else console.error(`[Reorder Point Calculator] Failed to write smart_alert for ${item.sku}:`, error.message);
  }

  return created;
}
