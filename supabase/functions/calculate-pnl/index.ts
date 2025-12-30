// P&L (Profit & Loss) Calculator Edge Function
// Aggregates financial data from connected platforms to calculate real-time profitability

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SHOPIFY_API_VERSION = '2024-01';

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
      }
      return acc;
    }, {
      revenue: 0,
      cogs: 0,
      shipping_costs: 0,
      platform_fees: 0,
      ad_spend: 0,
      refunds: 0,
      total_orders: 0
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

  // Fetch all orders in the date range
  const ordersResponse = await shopifyRequest(
    platform,
    `orders.json?status=any&created_at_min=${startISO}&created_at_max=${endISO}&limit=250&financial_status=paid`
  );
  const orders = ordersResponse.orders || [];

  console.log(`[P&L Calculator] Found ${orders.length} paid orders`);

  let revenue = 0;
  let cogs = 0;
  let shippingCosts = 0;
  let platformFees = 0;
  let refunds = 0;
  const productIds = new Set<number>();
  const variantCostMap = new Map<number, number>(); // Cache variant costs

  // Collect all unique variant IDs from orders
  const variantIds = new Set<number>();
  for (const order of orders) {
    for (const lineItem of order.line_items || []) {
      if (lineItem.variant_id) {
        variantIds.add(lineItem.variant_id);
      }
    }
  }

  console.log(`[P&L Calculator] Fetching costs for ${variantIds.size} unique variants`);

  // Fetch costs for all variants (batch process to avoid rate limits)
  const variantIdArray = Array.from(variantIds);
  const batchSize = 50;

  for (let i = 0; i < variantIdArray.length; i += batchSize) {
    const batchIds = variantIdArray.slice(i, i + batchSize);

    for (const variantId of batchIds) {
      try {
        // Fetch variant to get inventory_item_id
        const variantResponse = await shopifyRequest(
          platform,
          `variants/${variantId}.json`
        );
        const variant = variantResponse.variant;

        if (variant?.inventory_item_id) {
          // Fetch inventory item to get cost
          const inventoryResponse = await shopifyRequest(
            platform,
            `inventory_items/${variant.inventory_item_id}.json`
          );
          const cost = parseFloat(inventoryResponse.inventory_item?.cost || '0');
          variantCostMap.set(variantId, cost);

          console.log(`[P&L Calculator] Variant ${variantId}: cost = $${cost}`);
        }
      } catch (error) {
        console.error(`[P&L Calculator] Failed to fetch cost for variant ${variantId}:`, error.message);
        variantCostMap.set(variantId, 0); // Default to 0 if fetch fails
      }
    }

    // Small delay between batches to respect rate limits (2 calls per second)
    if (i + batchSize < variantIdArray.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

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
      if (lineItem.product_id) {
        productIds.add(lineItem.product_id);
      }

      // Calculate COGS using fetched costs
      const quantity = lineItem.quantity || 1;
      const variantId = lineItem.variant_id;

      if (variantId && variantCostMap.has(variantId)) {
        const cost = variantCostMap.get(variantId) || 0;
        const lineItemCogs = cost * quantity;
        cogs += lineItemCogs;

        console.log(`[P&L Calculator] Order ${order.order_number}: ${lineItem.name} x${quantity} @ $${cost} = $${lineItemCogs} COGS`);
      }
    }

    // Check for refunds
    if (order.refunds && order.refunds.length > 0) {
      for (const refund of order.refunds) {
        for (const transaction of refund.transactions || []) {
          if (transaction.kind === 'refund') {
            refunds += parseFloat(transaction.amount || '0');
          }
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

async function shopifyRequest(
  platform: any,
  endpoint: string,
  method: string = 'GET',
  body?: any
): Promise<any> {
  const url = `https://${platform.shop_domain}/admin/api/${SHOPIFY_API_VERSION}/${endpoint}`;

  const options: RequestInit = {
    method,
    headers: {
      'X-Shopify-Access-Token': platform.access_token,
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Shopify API error (${response.status}): ${errorText}`);
  }

  return await response.json();
}
