// AI Insights Engine
// Analyzes Shopify store data and generates actionable AI-powered recommendations

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
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    console.log(`[AI Insights] Generating insights for user ${user.id}`);

    // Get active Shopify platforms
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
          data: { insights: [], summary: { total: 0, critical: 0, high: 0, medium: 0 } }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Generate insights for each platform
    const allInsights = [];
    for (const platform of platforms) {
      console.log(`[AI Insights] Analyzing ${platform.shop_domain}`);

      try {
        const platformInsights = await generateInsights(platform);
        allInsights.push(...platformInsights);
      } catch (error) {
        console.error(`[AI Insights] Error analyzing ${platform.shop_domain}:`, error);
      }
    }

    // Sort by severity (critical > high > medium > low)
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    allInsights.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    // Generate summary
    const summary = {
      total: allInsights.length,
      critical: allInsights.filter(i => i.severity === 'critical').length,
      high: allInsights.filter(i => i.severity === 'high').length,
      medium: allInsights.filter(i => i.severity === 'medium').length,
      low: allInsights.filter(i => i.severity === 'low').length
    };

    console.log(`[AI Insights] Generated ${allInsights.length} insights - ${summary.critical} critical, ${summary.high} high priority`);

    return new Response(
      JSON.stringify({ success: true, data: { insights: allInsights, summary } }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('[AI Insights] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});

async function generateInsights(platform: any): Promise<any[]> {
  const insights = [];

  // Fetch products for analysis
  const productsResponse = await shopifyRequest(platform, 'products.json?limit=250');
  const products = productsResponse.products || [];

  // Fetch recent orders
  const lookbackDate = new Date();
  lookbackDate.setDate(lookbackDate.getDate() - 7);
  const ordersResponse = await shopifyRequest(
    platform,
    `orders.json?status=any&created_at_min=${lookbackDate.toISOString()}&limit=100`
  );
  const orders = ordersResponse.orders || [];

  // INSIGHT 1: SEO Issues
  const seoInsights = analyzeSEO(products, platform.shop_name);
  insights.push(...seoInsights);

  // INSIGHT 2: Stuck Orders
  const stuckThreshold = new Date();
  stuckThreshold.setDate(stuckThreshold.getDate() - 3);
  const stuckOrders = orders.filter(order =>
    (!order.fulfillment_status || order.fulfillment_status === 'unfulfilled') &&
    new Date(order.created_at) < stuckThreshold
  );

  if (stuckOrders.length > 0) {
    insights.push({
      type: 'orders',
      severity: stuckOrders.length > 5 ? 'critical' : 'high',
      title: `${stuckOrders.length} Orders Stuck in Fulfillment`,
      description: `You have ${stuckOrders.length} orders that haven't been fulfilled for 3+ days. Delayed shipments can lead to customer complaints and refund requests.`,
      action: 'Review stuck orders and contact customers with updates',
      command_suggestion: 'Show me stuck orders and draft customer update emails',
      data: {
        stuck_count: stuckOrders.length,
        oldest_days: Math.floor((Date.now() - new Date(stuckOrders[0].created_at).getTime()) / (1000 * 60 * 60 * 24))
      },
      platform: platform.shop_name
    });
  }

  // INSIGHT 3: Low Margin Products
  const lowMarginInsights = await analyzeLowMargins(products, platform);
  insights.push(...lowMarginInsights);

  // INSIGHT 4: Inventory Alerts
  const inventoryInsights = analyzeInventory(products, orders, platform.shop_name);
  insights.push(...inventoryInsights);

  // INSIGHT 5: Sales Trends
  const trendInsights = analyzeTrends(products, orders, platform.shop_name);
  insights.push(...trendInsights);

  return insights;
}

function analyzeSEO(products: any[], platformName: string): any[] {
  const insights = [];
  const poorSEOProducts = [];

  for (const product of products) {
    const titleLength = product.title?.length || 0;
    const descriptionText = (product.body_html || '').replace(/<[^>]*>/g, '');
    const descriptionLength = descriptionText.length;
    const imagesWithoutAlt = (product.images || []).filter((img: any) => !img.alt);

    let score = 100;
    const issues = [];

    if (titleLength < 30) {
      score -= 20;
      issues.push('title too short');
    }
    if (titleLength > 70) {
      score -= 10;
      issues.push('title too long');
    }
    if (descriptionLength < 100) {
      score -= 25;
      issues.push('description too short');
    }
    if (imagesWithoutAlt.length > 0) {
      score -= 15;
      issues.push(`${imagesWithoutAlt.length} images without alt text`);
    }

    if (score < 70) {
      poorSEOProducts.push({ ...product, score, issues });
    }
  }

  if (poorSEOProducts.length > 0) {
    const avgScore = Math.round(poorSEOProducts.reduce((sum, p) => sum + p.score, 0) / poorSEOProducts.length);

    insights.push({
      type: 'seo',
      severity: avgScore < 50 ? 'high' : 'medium',
      title: `${poorSEOProducts.length} Products Need SEO Optimization`,
      description: `${poorSEOProducts.length} products have poor SEO scores (avg: ${avgScore}/100). Better SEO can increase organic search traffic by 20-50%.`,
      action: 'Run AI SEO optimization to improve titles, descriptions, and alt text',
      command_suggestion: `Optimize SEO for my ${poorSEOProducts.length} lowest-scoring products`,
      data: {
        product_count: poorSEOProducts.length,
        avg_score: avgScore,
        top_issues: poorSEOProducts.slice(0, 5).map(p => ({
          title: p.title,
          score: p.score,
          issues: p.issues
        }))
      },
      platform: platformName
    });
  }

  return insights;
}

async function analyzeLowMargins(products: any[], platform: any): Promise<any[]> {
  const insights = [];
  const lowMarginProducts = [];

  for (const product of products.slice(0, 50)) {
    for (const variant of product.variants || []) {
      try {
        const price = parseFloat(variant.price || '0');
        const inventoryItemId = variant.inventory_item_id;

        if (!inventoryItemId) continue;

        const inventoryResponse = await shopifyRequest(
          platform,
          `inventory_items/${inventoryItemId}.json`
        );
        const cost = parseFloat(inventoryResponse.inventory_item?.cost || '0');

        if (cost > 0 && price > 0) {
          const margin = ((price - cost) / price) * 100;

          if (margin < 30) {
            lowMarginProducts.push({
              title: product.title,
              variant: variant.title,
              price,
              cost,
              margin: margin.toFixed(1)
            });
          }
        }
      } catch (error) {
        // Skip if can't fetch cost
        continue;
      }
    }

    // Rate limit protection
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  if (lowMarginProducts.length > 0) {
    const avgMargin = lowMarginProducts.reduce((sum, p) => sum + parseFloat(p.margin), 0) / lowMarginProducts.length;

    insights.push({
      type: 'pricing',
      severity: avgMargin < 15 ? 'critical' : 'high',
      title: `${lowMarginProducts.length} Products Have Low Profit Margins`,
      description: `${lowMarginProducts.length} products have margins below 30% (avg: ${avgMargin.toFixed(1)}%). Recommended minimum is 30-35% for sustainable profitability.`,
      action: 'Review pricing strategy or reduce costs',
      command_suggestion: 'Show me low margin products and suggest price adjustments',
      data: {
        product_count: lowMarginProducts.length,
        avg_margin: avgMargin.toFixed(1),
        products: lowMarginProducts.slice(0, 5)
      },
      platform: platform.shop_name
    });
  }

  return insights;
}

function analyzeInventory(products: any[], orders: any[], platformName: string): any[] {
  const insights = [];

  // Find best sellers from recent orders
  const productSales = new Map();
  for (const order of orders) {
    for (const lineItem of order.line_items || []) {
      const productId = lineItem.product_id;
      productSales.set(productId, (productSales.get(productId) || 0) + lineItem.quantity);
    }
  }

  // Check inventory for best sellers
  const lowStockBestSellers = [];
  for (const product of products) {
    const totalSales = productSales.get(product.id) || 0;

    if (totalSales > 3) { // Sold 3+ in last week = best seller
      for (const variant of product.variants || []) {
        const inventory = variant.inventory_quantity || 0;

        if (inventory < 10 && inventory > 0) {
          lowStockBestSellers.push({
            title: product.title,
            variant: variant.title,
            inventory,
            recent_sales: totalSales
          });
        }
      }
    }
  }

  if (lowStockBestSellers.length > 0) {
    insights.push({
      type: 'inventory',
      severity: 'high',
      title: `${lowStockBestSellers.length} Best Sellers Running Low on Stock`,
      description: `Popular products are running low on inventory. Stock out = lost sales. Average time to restock is 2-3 weeks.`,
      action: 'Reorder inventory for best-selling items',
      command_suggestion: 'Show me products that need restocking and calculate reorder quantities',
      data: {
        product_count: lowStockBestSellers.length,
        products: lowStockBestSellers.slice(0, 5)
      },
      platform: platformName
    });
  }

  return insights;
}

function analyzeTrends(products: any[], orders: any[], platformName: string): any[] {
  const insights = [];

  // Calculate revenue trend
  const last7Days = orders.filter(o => {
    const orderDate = new Date(o.created_at);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    return orderDate > cutoff;
  });

  const previous7Days = orders.filter(o => {
    const orderDate = new Date(o.created_at);
    const cutoff1 = new Date();
    cutoff1.setDate(cutoff1.getDate() - 14);
    const cutoff2 = new Date();
    cutoff2.setDate(cutoff2.getDate() - 7);
    return orderDate > cutoff1 && orderDate <= cutoff2;
  });

  const last7Revenue = last7Days.reduce((sum, o) => sum + parseFloat(o.total_price || '0'), 0);
  const prev7Revenue = previous7Days.reduce((sum, o) => sum + parseFloat(o.total_price || '0'), 0);

  if (prev7Revenue > 0) {
    const growthRate = ((last7Revenue - prev7Revenue) / prev7Revenue) * 100;

    if (Math.abs(growthRate) > 20) {
      insights.push({
        type: 'trend',
        severity: growthRate < -20 ? 'high' : 'medium',
        title: growthRate > 0
          ? `Sales Up ${growthRate.toFixed(1)}% This Week!`
          : `Sales Down ${Math.abs(growthRate).toFixed(1)}% This Week`,
        description: growthRate > 0
          ? `Revenue increased from $${prev7Revenue.toFixed(2)} to $${last7Revenue.toFixed(2)} week-over-week. Capitalize on this momentum!`
          : `Revenue decreased from $${prev7Revenue.toFixed(2)} to $${last7Revenue.toFixed(2)}. Time to adjust strategy.`,
        action: growthRate > 0
          ? 'Increase ad spend and promote best sellers'
          : 'Run promotions or investigate cause of decline',
        command_suggestion: growthRate > 0
          ? 'Show me best performing products this week'
          : 'Analyze what caused the sales decline',
        data: {
          current_revenue: last7Revenue,
          previous_revenue: prev7Revenue,
          growth_rate: growthRate.toFixed(1)
        },
        platform: platformName
      });
    }
  }

  return insights;
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

  if (body) options.body = JSON.stringify(body);

  const response = await fetch(url, options);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Shopify API error (${response.status}): ${errorText}`);
  }

  return await response.json();
}
