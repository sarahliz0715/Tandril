// P&L (Profit & Loss) Calculator Edge Function
// Aggregates financial data from connected platforms to calculate real-time profitability

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

// SHOPIFY_API_VERSION removed — now using GraphQL 2025-01

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify the user is authenticated
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Get configuration parameters
    const {
      start_date = null,     // ISO date string
      end_date = null,       // ISO date string
      platform_id = null     // Optional: filter by specific platform
    } = await req.json().catch(() => ({}));

    // Default to last 30 days if no dates provided
    const endDate = end_date ? new Date(end_date) : new Date();
    const startDate = start_date ? new Date(start_date) : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    console.log(`[P&L Calculator] Running for user ${user.id} from ${startDate.toISOString()} to ${endDate.toISOString()}`);

    // Get all active Shopify platforms for the user
    let platformsQuery = supabaseClient
      .from('platforms')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .eq('platform_type', 'shopify');

    if (platform_id) {
      platformsQuery = platformsQuery.eq('id', platform_id);
    }

    const { data: platforms, error: platformsError } = await platformsQuery;

    if (platformsError) {
      throw new Error(`Failed to fetch platforms: ${platformsError.message}`);
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

    if (!platforms || platforms.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No active Shopify stores found',
          data: {
            revenue: 0,
            cogs: 0,
            shipping_costs: 0,
            platform_fees: 0,
            ad_spend: 0,
            net_profit: 0,
            platforms: []
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Process each platform
    const platformResults = [];
    for (const platform of platforms) {
      console.log(`[P&L Calculator] Processing ${platform.shop_domain}`);

      try {
        const pnlData = await calculatePlatformPnL(
          platform,
          startDate,
          endDate
        );
        platformResults.push({
          platform_id: platform.id,
          platform_name: platform.shop_name,
          success: true,
          ...pnlData,
        });
      } catch (error) {
        console.error(`[P&L Calculator] Error on ${platform.shop_domain}:`, error);
        platformResults.push({
          platform_id: platform.id,
          platform_name: platform.shop_name,
          success: false,
          error: error.message,
        });
      }
    }

    // Aggregate totals across all platforms
    const totals = platformResults.reduce((acc, result) => {
      if (result.success) {
        acc.revenue += result.revenue || 0;
        acc.cogs += result.cogs || 0;
        acc.shipping_costs += result.shipping_costs || 0;
        acc.platform_fees += result.platform_fees || 0;
        acc.ad_spend += result.ad_spend || 0;
        acc.refunds += result.refunds || 0;
        acc.total_orders += result.total_orders || 0;
        acc.needs_cogs_data = acc.needs_cogs_data || result.needs_cogs_data || false;
      }
      return acc;
    }, {
      revenue: 0,
      cogs: 0,
      shipping_costs: 0,
      platform_fees: 0,
      ad_spend: 0,
      refunds: 0,
      total_orders: 0,
      needs_cogs_data: false,
    });

    // Calculate net profit
    const netProfit = totals.revenue - totals.cogs - totals.shipping_costs - totals.platform_fees - totals.ad_spend - totals.refunds;
    const profitMargin = totals.revenue > 0 ? (netProfit / totals.revenue) * 100 : 0;

    console.log(`[P&L Calculator] Complete - Revenue: $${totals.revenue.toFixed(2)}, Net Profit: $${netProfit.toFixed(2)} (${profitMargin.toFixed(1)}% margin)`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          ...totals,
          net_profit: netProfit,
          profit_margin: profitMargin,
          date_range: {
            start: startDate.toISOString(),
            end: endDate.toISOString()
          },
          platforms: platformResults,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[P&L Calculator] Error:', error);
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

async function calculatePlatformPnL(
  platform: any,
  startDate: Date,
  endDate: Date
): Promise<any> {
  const startISO = startDate.toISOString();
  const endISO = endDate.toISOString();

  console.log(`[P&L Calculator] Fetching orders from ${startISO} to ${endISO}`);

  // Fetch paid orders in the date range via GraphQL
  const ordersData = await shopifyGraphQL(platform.shop_domain, platform.access_token, `
    query {
      orders(first: 250, query: "financial_status:paid created_at:>=${startISO} created_at:<=${endISO}") {
        edges {
          node {
            id name createdAt
            totalPriceSet { shopMoney { amount currencyCode } }
            refunds {
              transactions(first: 10) {
                edges { node { kind amount } }
              }
            }
            lineItems(first: 50) {
              edges {
                node {
                  title quantity
                  product { id }
                  variant {
                    id price
                    inventoryItem { unitCost { amount } }
                  }
                }
              }
            }
          }
        }
      }
    }
  `);
  const orders = ordersData.orders.edges.map((e: any) => ({
    ...e.node,
    id: fromShopifyGid(e.node.id),
    created_at: e.node.createdAt,
    total_price: e.node.totalPriceSet?.shopMoney?.amount,
    refunds: (e.node.refunds || []).map((r: any) => ({
      transactions: r.transactions.edges.map((t: any) => ({ kind: t.node.kind, amount: t.node.amount }))
    })),
    line_items: e.node.lineItems.edges.map((li: any) => ({
      ...li.node,
      product_id: li.node.product ? fromShopifyGid(li.node.product.id) : null,
      variant_id: li.node.variant ? fromShopifyGid(li.node.variant.id) : null,
      price: li.node.variant?.price,
      _unit_cost: li.node.variant?.inventoryItem?.unitCost?.amount ?? null,
    }))
  }));

  console.log(`[P&L Calculator] Found ${orders.length} paid orders`);

  let revenue = 0;
  let cogs = 0;
  let platformFees = 0;
  let refunds = 0;
  const productIds = new Set<string>();
  const variantIds = new Set<string>();

  // Process each order
  for (const order of orders) {
    // Revenue = total price (includes shipping, taxes, etc)
    const orderTotal = parseFloat(order.total_price || '0');
    revenue += orderTotal;

    // Transaction fees (payment gateway fees)
    // Shopify's transaction fees vary by plan, default to 2.9% + $0.30 for basic
    const transactionFee = orderTotal * 0.029 + 0.30;
    platformFees += transactionFee;

    // Process line items for COGS
    for (const lineItem of order.line_items || []) {
      if (lineItem.product_id) productIds.add(lineItem.product_id);
      if (lineItem.variant_id) variantIds.add(lineItem.variant_id);

      // Calculate COGS using cost fetched inline with the order query
      const quantity = lineItem.quantity || 1;
      const cost = lineItem._unit_cost !== null ? parseFloat(lineItem._unit_cost || '0') : 0;
      if (cost > 0) {
        const lineItemCogs = cost * quantity;
        cogs += lineItemCogs;
        console.log(`[P&L Calculator] Order ${order.name}: ${lineItem.title} x${quantity} @ $${cost} = $${lineItemCogs} COGS`);
      }
    }

    // Check for refunds
    for (const refund of order.refunds || []) {
      for (const transaction of refund.transactions || []) {
        if (transaction.kind === 'refund') {
          refunds += parseFloat(transaction.amount || '0');
        }
      }
    }
  }

  // Shipping costs (what we pay to ship, not what customer pays)
  // This requires integration with shipping providers or manual input
  // For MVP, set to 0 - will add proper tracking later
  const estimatedShippingCost = 0;

  const needsCogsData = cogs === 0 && orders.length > 0 && variantIds.size > 0;

  console.log(`[P&L Calculator] Platform totals - Revenue: $${revenue}, COGS: $${cogs}, Fees: $${platformFees}, Refunds: $${refunds}`);

  return {
    revenue,
    cogs,
    shipping_costs: estimatedShippingCost,
    platform_fees: platformFees,
    ad_spend: 0, // Requires Meta/Google Ads API integration
    refunds,
    total_orders: orders.length,
    unique_products: productIds.size,
    needs_cogs_data: needsCogsData,
  };
}

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
