// Risk Alert Analyzer Edge Function
// AI detects potential problems before they become serious issues

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { decrypt, isEncrypted } from '../_shared/encryption.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SHOPIFY_API_VERSION = '2024-01';

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

    console.log(`[Risk Alerts] Analyzing for user ${user.id}`);

    // Get platforms
    const { data: platforms } = await supabaseClient
      .from('platforms')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (!platforms || platforms.length === 0) {
      throw new Error('No active platforms found');
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

    // Analyze store for risks
    const risks = await detectRisks(platforms[0]);

    // Save to database
    await supabaseClient.from('business_coaching').insert({
      user_id: user.id,
      coaching_type: 'risk_alert',
      content: { risks },
      metadata: {
        risks_count: risks.length,
        critical_count: risks.filter((r) => r.severity === 'critical').length,
      },
    });

    console.log(`[Risk Alerts] Found ${risks.length} risks`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          risks,
          summary: {
            total: risks.length,
            critical: risks.filter((r) => r.severity === 'critical').length,
            high: risks.filter((r) => r.severity === 'high').length,
            medium: risks.filter((r) => r.severity === 'medium').length,
          },
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[Risk Alerts] Error:', error);
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

async function detectRisks(platform: any): Promise<any[]> {
  try {
    // Fetch store data
    const productsResponse = await shopifyRequest(platform, 'products.json?limit=250');
    const products = productsResponse.products || [];

    const ordersResponse = await shopifyRequest(platform, 'orders.json?limit=250&status=any');
    const orders = ordersResponse.orders || [];

    // Calculate time-based metrics
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last14Days = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const ordersLast7d = orders.filter((o) => new Date(o.created_at) > last7Days);
    const ordersLast14d = orders.filter((o) => new Date(o.created_at) > last14Days);
    const ordersLast30d = orders.filter((o) => new Date(o.created_at) > last30Days);

    // AI analysis
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');

    if (!anthropicApiKey) {
      return detectBasicRisks(products, orders, ordersLast7d, ordersLast14d, ordersLast30d);
    }

    return await detectRisksWithAI(
      products,
      orders,
      ordersLast7d,
      ordersLast14d,
      ordersLast30d,
      platform.shop_name,
      anthropicApiKey
    );
  } catch (error) {
    console.error('[Risk Alerts] Detection error:', error);
    return [];
  }
}

async function detectRisksWithAI(
  products: any[],
  allOrders: any[],
  ordersLast7d: any[],
  ordersLast14d: any[],
  ordersLast30d: any[],
  shopName: string,
  apiKey: string
): Promise<any[]> {
  const revenue7d = ordersLast7d.reduce((sum, o) => sum + parseFloat(o.total_price || '0'), 0);
  const revenue14d = ordersLast14d.reduce((sum, o) => sum + parseFloat(o.total_price || '0'), 0);
  const revenue30d = ordersLast30d.reduce((sum, o) => sum + parseFloat(o.total_price || '0'), 0);

  // Unfulfilled orders older than 3 days
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const stuckOrders = ordersLast30d.filter(
    (o) =>
      (o.fulfillment_status === null || o.fulfillment_status === 'unfulfilled') &&
      new Date(o.created_at) < threeDaysAgo
  );

  const systemPrompt = `You are a risk management expert analyzing an e-commerce store to identify potential problems BEFORE they become serious.

Focus on detecting:
1. **Revenue Decline**: Significant drops in sales
2. **Fulfillment Issues**: Delayed orders, unhappy customers
3. **Inventory Risks**: Stockouts of bestsellers, overstock of slow movers
4. **Cash Flow**: Low revenue periods, high refund rates
5. **Operational**: Stuck orders, processing bottlenecks
6. **Competitive**: Sudden drops that might indicate market changes

Store: ${shopName}

Metrics:
- Orders last 7 days: ${ordersLast7d.length}
- Orders last 14 days: ${ordersLast14d.length}
- Orders last 30 days: ${ordersLast30d.length}
- Revenue last 7 days: $${revenue7d.toFixed(2)}
- Revenue last 14 days: $${revenue14d.toFixed(2)}
- Revenue last 30 days: $${revenue30d.toFixed(2)}
- Stuck orders (3+ days unfulfilled): ${stuckOrders.length}
- Out of stock products: ${products.filter((p) => p.variants?.every((v: any) => v.inventory_quantity === 0)).length}

Respond in JSON format:
{
  "risks": [
    {
      "type": "revenue_decline" | "fulfillment" | "inventory" | "cash_flow" | "operational" | "competitive",
      "severity": "critical" | "high" | "medium" | "low",
      "title": "Brief title",
      "description": "What's the problem and why it matters",
      "impact": "Potential negative outcome if not addressed",
      "action": "Specific steps to mitigate this risk",
      "timeframe": "how_soon_to_act" (e.g., "immediate", "this_week", "this_month")
    }
  ]
}

Severity guidelines:
- CRITICAL: Immediate action required, significant revenue/reputation at risk
- HIGH: Action needed this week, moderate impact
- MEDIUM: Should address soon, minor impact
- LOW: Monitor, minimal current impact`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: 'Analyze this store data and identify any risks or potential problems.',
        },
      ],
    }),
  });

  if (!response.ok) {
    return detectBasicRisks(products, allOrders, ordersLast7d, ordersLast14d, ordersLast30d);
  }

  const result = await response.json();
  const contentText = result.content[0].text;

  const jsonMatch = contentText.match(/```json\n([\s\S]*?)\n```/) || contentText.match(/({[\s\S]*})/);
  const jsonText = jsonMatch ? jsonMatch[1] : contentText;

  const parsed = JSON.parse(jsonText);
  return parsed.risks || [];
}

function detectBasicRisks(
  products: any[],
  allOrders: any[],
  ordersLast7d: any[],
  ordersLast14d: any[],
  ordersLast30d: any[]
): any[] {
  const risks = [];

  // Revenue decline
  const avgOrdersPerWeek = ordersLast30d.length / 4;
  if (ordersLast7d.length < avgOrdersPerWeek * 0.5) {
    risks.push({
      type: 'revenue_decline',
      severity: 'high',
      title: 'Significant Drop in Orders',
      description: `Orders this week (${ordersLast7d.length}) are 50%+ below your 30-day average (${avgOrdersPerWeek.toFixed(0)}/week)`,
      impact: 'Continued decline could seriously impact cash flow and business viability',
      action: 'Review marketing channels, consider running a promotion, check for technical issues',
      timeframe: 'immediate',
    });
  }

  // Stuck orders
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const stuckOrders = ordersLast30d.filter(
    (o) =>
      (o.fulfillment_status === null || o.fulfillment_status === 'unfulfilled') &&
      new Date(o.created_at) < threeDaysAgo
  );

  if (stuckOrders.length > 5) {
    risks.push({
      type: 'fulfillment',
      severity: 'critical',
      title: 'Fulfillment Delays',
      description: `${stuckOrders.length} orders are 3+ days old and still unfulfilled`,
      impact: 'Delayed fulfillment leads to customer complaints, refunds, and bad reviews',
      action: 'Process these orders immediately and review your fulfillment workflow',
      timeframe: 'immediate',
    });
  }

  // Out of stock bestsellers
  const productSales = new Map();
  ordersLast30d.forEach((order) => {
    order.line_items?.forEach((item: any) => {
      const current = productSales.get(item.product_id) || 0;
      productSales.set(item.product_id, current + item.quantity);
    });
  });

  const topSellers = Array.from(productSales.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([productId]) => productId);

  const outOfStockBestsellers = products.filter(
    (p) =>
      topSellers.includes(p.id) &&
      p.variants?.every((v: any) => v.inventory_quantity === 0)
  );

  if (outOfStockBestsellers.length > 0) {
    risks.push({
      type: 'inventory',
      severity: 'critical',
      title: 'Bestsellers Out of Stock',
      description: `${outOfStockBestsellers.length} of your top-selling products are completely out of stock`,
      impact: 'Losing sales on your best products every single day',
      action: 'Restock these items immediately - they are proven sellers',
      timeframe: 'immediate',
    });
  }

  // No sales in 7 days
  if (ordersLast7d.length === 0) {
    risks.push({
      type: 'revenue_decline',
      severity: 'critical',
      title: 'No Sales in 7 Days',
      description: 'Your store has had zero orders in the past week',
      impact: 'Without immediate action, your business could fail',
      action: 'Check store functionality, run ads, reach out to past customers, offer a promotion',
      timeframe: 'immediate',
    });
  }

  return risks;
}

async function shopifyRequest(platform: any, endpoint: string): Promise<any> {
  const url = `https://${platform.shop_domain}/admin/api/${SHOPIFY_API_VERSION}/${endpoint}`;

  const response = await fetch(url, {
    headers: {
      'X-Shopify-Access-Token': platform.access_token,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Shopify API error: ${response.status}`);
  }

  return await response.json();
}
