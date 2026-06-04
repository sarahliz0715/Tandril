// Order Monitor Edge Function
// Detects stuck orders, tracks fulfillment status, and audits returns/refunds

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
      stuck_days = 3,              // Orders unfulfilled for X days are "stuck"
      lookback_days = 30,           // Check orders from last X days
      include_returns = true        // Include return/refund analysis
    } = await req.json().catch(() => ({}));

    console.log(`[Order Monitor] Running for user ${user.id}, stuck_days: ${stuck_days}, lookback: ${lookback_days} days`);

    // Get all active Shopify platforms for the user
    const { data: platforms, error: platformsError } = await supabaseClient
      .from('platforms')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .eq('platform_type', 'shopify');

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
            stuck_orders: [],
            fulfillment_summary: {},
            returns_summary: {}
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Process each platform
    const allResults = [];
    for (const platform of platforms) {
      console.log(`[Order Monitor] Processing ${platform.shop_domain}`);

      try {
        const monitorData = await monitorOrders(
          platform,
          stuck_days,
          lookback_days,
          include_returns
        );
        allResults.push({
          platform: platform.shop_name,
          platform_id: platform.id,
          success: true,
          ...monitorData,
        });
      } catch (error) {
        console.error(`[Order Monitor] Error on ${platform.shop_domain}:`, error);
        allResults.push({
          platform: platform.shop_name,
          platform_id: platform.id,
          success: false,
          error: error.message,
        });
      }
    }

    // Aggregate results
    const stuckOrders = [];
    const fulfillmentSummary = {
      total_orders: 0,
      fulfilled: 0,
      partially_fulfilled: 0,
      unfulfilled: 0,
      stuck: 0
    };
    const returnsSummary = {
      total_returns: 0,
      total_refund_amount: 0,
      return_rate: 0
    };

    for (const result of allResults) {
      if (result.success) {
        stuckOrders.push(...(result.stuck_orders || []));

        fulfillmentSummary.total_orders += result.fulfillment_summary?.total_orders || 0;
        fulfillmentSummary.fulfilled += result.fulfillment_summary?.fulfilled || 0;
        fulfillmentSummary.partially_fulfilled += result.fulfillment_summary?.partially_fulfilled || 0;
        fulfillmentSummary.unfulfilled += result.fulfillment_summary?.unfulfilled || 0;
        fulfillmentSummary.stuck += result.fulfillment_summary?.stuck || 0;

        returnsSummary.total_returns += result.returns_summary?.total_returns || 0;
        returnsSummary.total_refund_amount += result.returns_summary?.total_refund_amount || 0;
      }
    }

    // Calculate return rate
    if (fulfillmentSummary.total_orders > 0) {
      returnsSummary.return_rate = (returnsSummary.total_returns / fulfillmentSummary.total_orders) * 100;
    }

    console.log(`[Order Monitor] Complete - Found ${stuckOrders.length} stuck orders across ${platforms.length} stores`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          stuck_orders: stuckOrders,
          fulfillment_summary: fulfillmentSummary,
          returns_summary: returnsSummary,
          platforms: allResults,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[Order Monitor] Error:', error);
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

// ─────────────────────────────────────────────────────────────────────────────

async function monitorOrders(
  platform: any,
  stuckDays: number,
  lookbackDays: number,
  includeReturns: boolean
): Promise<any> {
  // Calculate date range
  const now = new Date();
  const lookbackDate = new Date(now.getTime() - lookbackDays * 24 * 60 * 60 * 1000);
  const stuckThreshold = new Date(now.getTime() - stuckDays * 24 * 60 * 60 * 1000);

  const lookbackISO = lookbackDate.toISOString();
  console.log(`[Order Monitor] Fetching orders since ${lookbackISO}`);

  // Fetch orders via GraphQL
  const data = await shopifyGraphQL(platform.shop_domain, platform.access_token, `
    query($query: String!) {
      orders(first: 250, query: $query) {
        edges {
          node {
            id name createdAt
            displayFulfillmentStatus
            displayFinancialStatus
            totalPriceSet { shopMoney { amount } }
            customer { firstName lastName email }
            lineItems(first: 50) {
              edges { node { title quantity } }
            }
            refunds {
              transactions(first: 10) {
                kind
                amountSet { shopMoney { amount } }
              }
            }
          }
        }
      }
    }
  `, { query: `created_at:>=${lookbackISO} status:any` });

  const orders = (data.orders.edges || []).map((e: any) => ({
    ...e.node,
    id: fromShopifyGid(e.node.id),
    created_at: e.node.createdAt,
    order_number: e.node.name,
    total_price: parseFloat(e.node.totalPriceSet?.shopMoney?.amount || '0'),
    fulfillment_status: (e.node.displayFulfillmentStatus || '').toLowerCase().replace('_', ' '),
    financial_status: (e.node.displayFinancialStatus || '').toLowerCase(),
    customer: e.node.customer,
    line_items: e.node.lineItems.edges.map((li: any) => li.node),
    refunds: e.node.refunds || [],
  }));

  console.log(`[Order Monitor] Found ${orders.length} orders`);

  // Analyze orders
  const stuckOrders = [];
  const fulfillmentSummary = {
    total_orders: orders.length,
    fulfilled: 0,
    partially_fulfilled: 0,
    unfulfilled: 0,
    stuck: 0
  };
  const returnsSummary = {
    total_returns: 0,
    total_refund_amount: 0,
    orders_with_returns: []
  };

  for (const order of orders) {
    const createdAt = new Date(order.created_at);
    // GraphQL displayFulfillmentStatus: FULFILLED, PARTIALLY_FULFILLED, UNFULFILLED, IN_PROGRESS, etc.
    const fulfillmentStatus = order.fulfillment_status;

    // Track fulfillment status
    if (fulfillmentStatus === 'fulfilled') {
      fulfillmentSummary.fulfilled++;
    } else if (fulfillmentStatus === 'partially fulfilled') {
      fulfillmentSummary.partially_fulfilled++;
    } else {
      fulfillmentSummary.unfulfilled++;
    }

    // Detect stuck orders (unfulfilled and older than threshold)
    if (fulfillmentStatus !== 'fulfilled' && createdAt < stuckThreshold) {
      fulfillmentSummary.stuck++;

      const daysStuck = Math.floor((now.getTime() - createdAt.getTime()) / (24 * 60 * 60 * 1000));

      stuckOrders.push({
        order_id: order.id,
        order_number: order.order_number,
        order_name: order.name,
        customer_name: `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim() || 'Unknown',
        customer_email: order.customer?.email,
        total_price: order.total_price,
        fulfillment_status: fulfillmentStatus || 'unfulfilled',
        financial_status: order.financial_status,
        created_at: order.created_at,
        days_stuck: daysStuck,
        line_items_count: order.line_items?.length || 0,
        platform: platform.shop_name
      });
    }

    // Analyze returns/refunds
    if (includeReturns && order.refunds && order.refunds.length > 0) {
      returnsSummary.total_returns++;
      let refundAmount = 0;

      for (const refund of order.refunds) {
        for (const transaction of refund.transactions || []) {
          if (transaction.kind === 'REFUND') {
            refundAmount += parseFloat(transaction.amountSet?.shopMoney?.amount || '0');
          }
        }
      }

      returnsSummary.total_refund_amount += refundAmount;
      returnsSummary.orders_with_returns.push({
        order_id: order.id,
        order_number: order.order_number,
        order_name: order.name,
        refund_amount: refundAmount,
        refund_count: order.refunds.length,
        created_at: order.created_at
      });
    }
  }

  // Sort stuck orders by days stuck (most urgent first)
  stuckOrders.sort((a, b) => b.days_stuck - a.days_stuck);

  console.log(`[Order Monitor] ${platform.shop_name} - ${stuckOrders.length} stuck orders, ${returnsSummary.total_returns} returns`);

  return {
    stuck_orders: stuckOrders,
    fulfillment_summary: fulfillmentSummary,
    returns_summary: returnsSummary,
  };
}
