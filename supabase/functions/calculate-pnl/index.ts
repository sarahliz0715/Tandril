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

  // Process each order
  for (const order of orders) {
    // Revenue = total price (includes shipping, taxes, etc)
    const orderTotal = parseFloat(order.total_price || '0');
    revenue += orderTotal;

    // Shipping charged to customer (part of revenue, tracked separately for analysis)
    const shippingPrice = parseFloat(order.total_shipping_price_set?.shop_money?.amount || '0');

    // Transaction fees (payment gateway fees)
    // Shopify's transaction fees vary by plan, default to 2.9% + $0.30 for basic
    const transactionFee = orderTotal * 0.029 + 0.30;
    platformFees += transactionFee;

    // Process line items for COGS
    for (const lineItem of order.line_items || []) {
      if (lineItem.product_id) {
        productIds.add(lineItem.product_id);
      }

      // Quantity ordered
      const quantity = lineItem.quantity || 1;

      // Try to get cost from variant
      // Note: Shopify doesn't include cost in order API, need to fetch separately
      // For MVP, we'll estimate or mark as 0 if not available
      // In production, you'd fetch inventory_item.cost for each variant

      // Track that we need COGS data
      // For now, COGS will be 0 unless we enhance this later
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

  // TODO: Fetch actual COGS by getting inventory_items for all products
  // For MVP, this requires additional API calls per product which is slow
  // Better approach: Store COGS in our database when products sync

  // Shipping costs (what we pay to ship, not what customer pays)
  // This requires integration with shipping providers or manual input
  // For MVP, estimate as 50% of customer shipping charges as rough approximation
  const estimatedShippingCost = 0; // Set to 0 for now, will add proper tracking later

  return {
    revenue,
    cogs, // Currently 0, needs product cost data
    shipping_costs: estimatedShippingCost,
    platform_fees: platformFees,
    ad_spend: 0, // Requires Meta/Google Ads API integration
    refunds,
    total_orders: orders.length,
    unique_products: productIds.size,
    needs_cogs_data: cogs === 0 && orders.length > 0, // Flag to indicate COGS missing
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
