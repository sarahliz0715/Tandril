// Daily Business Briefing Edge Function
// AI-generated morning briefing with insights, alerts, and daily action items

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

    const { date = new Date().toISOString().split('T')[0] } = await req.json();

    console.log(`[Daily Briefing] Generating for user ${user.id} on ${date}`);

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

    // Gather store data from last 24h and last 7 days
    const storeData = await gatherStoreData(platforms[0]);

    // Get recent coaching history to avoid repetition
    const { data: recentBriefings } = await supabaseClient
      .from('business_coaching')
      .select('*')
      .eq('user_id', user.id)
      .eq('coaching_type', 'daily_briefing')
      .order('created_at', { ascending: false })
      .limit(7);

    // Generate AI briefing
    const briefing = await generateDailyBriefingWithAI(
      storeData,
      recentBriefings || [],
      platforms[0].shop_name
    );

    // Save briefing to database
    const { data: savedBriefing } = await supabaseClient
      .from('business_coaching')
      .insert({
        user_id: user.id,
        coaching_type: 'daily_briefing',
        content: briefing,
        metadata: {
          date,
          store_metrics: storeData.metrics,
        },
      })
      .select()
      .single();

    console.log(`[Daily Briefing] Generated and saved briefing ${savedBriefing?.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        data: briefing,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[Daily Briefing] Error:', error);
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

async function gatherStoreData(platform: any): Promise<any> {
  try {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Fetch orders
    const ordersResponse = await shopifyRequest(platform, 'orders.json?limit=250&status=any');
    const allOrders = ordersResponse.orders || [];

    const ordersLast24h = allOrders.filter((o) => new Date(o.created_at) > yesterday);
    const ordersLast7d = allOrders.filter((o) => new Date(o.created_at) > lastWeek);
    const ordersLast30d = allOrders.filter((o) => new Date(o.created_at) > lastMonth);

    // Fetch products
    const productsResponse = await shopifyRequest(platform, 'products.json?limit=250');
    const products = productsResponse.products || [];

    // Calculate metrics
    const revenue24h = ordersLast24h.reduce((sum, o) => sum + parseFloat(o.total_price || '0'), 0);
    const revenue7d = ordersLast7d.reduce((sum, o) => sum + parseFloat(o.total_price || '0'), 0);
    const revenue30d = ordersLast30d.reduce((sum, o) => sum + parseFloat(o.total_price || '0'), 0);

    const avgOrderValue24h = ordersLast24h.length > 0 ? revenue24h / ordersLast24h.length : 0;
    const avgOrderValue7d = ordersLast7d.length > 0 ? revenue7d / ordersLast7d.length : 0;

    // Inventory analysis
    const lowStockProducts = products.filter((p) =>
      p.variants?.some((v: any) => v.inventory_quantity > 0 && v.inventory_quantity < 10)
    );
    const outOfStockProducts = products.filter((p) =>
      p.variants?.every((v: any) => v.inventory_quantity === 0)
    );

    // Top sellers (by units sold in last 7 days)
    const productSales = new Map();
    ordersLast7d.forEach((order) => {
      order.line_items?.forEach((item: any) => {
        const current = productSales.get(item.product_id) || 0;
        productSales.set(item.product_id, current + item.quantity);
      });
    });

    const topSellers = Array.from(productSales.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([productId, quantity]) => {
        const product = products.find((p) => p.id === productId);
        return {
          product_id: productId,
          title: product?.title || 'Unknown',
          units_sold: quantity,
        };
      });

    // Fulfillment status
    const unfulfilledOrders = ordersLast7d.filter(
      (o) => o.fulfillment_status === null || o.fulfillment_status === 'unfulfilled'
    );

    return {
      metrics: {
        // Revenue
        revenue_24h: revenue24h,
        revenue_7d: revenue7d,
        revenue_30d: revenue30d,
        revenue_growth: revenue7d > 0 ? ((revenue24h * 7 - revenue7d) / revenue7d) * 100 : 0,

        // Orders
        orders_24h: ordersLast24h.length,
        orders_7d: ordersLast7d.length,
        orders_30d: ordersLast30d.length,
        orders_growth: ordersLast7d.length > 0
          ? ((ordersLast24h.length * 7 - ordersLast7d.length) / ordersLast7d.length) * 100
          : 0,

        // Order Value
        avg_order_value_24h: avgOrderValue24h,
        avg_order_value_7d: avgOrderValue7d,
        aov_growth: avgOrderValue7d > 0
          ? ((avgOrderValue24h - avgOrderValue7d) / avgOrderValue7d) * 100
          : 0,

        // Inventory
        total_products: products.length,
        low_stock_count: lowStockProducts.length,
        out_of_stock_count: outOfStockProducts.length,
        inventory_health: outOfStockProducts.length === 0 && lowStockProducts.length < 5
          ? 'good'
          : lowStockProducts.length < 10
          ? 'fair'
          : 'needs_attention',

        // Fulfillment
        unfulfilled_orders: unfulfilledOrders.length,
        fulfillment_rate: ordersLast7d.length > 0
          ? ((ordersLast7d.length - unfulfilledOrders.length) / ordersLast7d.length) * 100
          : 100,

        // Top performers
        top_sellers: topSellers,
      },
      timestamp: now.toISOString(),
      day_of_week: now.toLocaleDateString('en-US', { weekday: 'long' }),
    };
  } catch (error) {
    console.error('[Daily Briefing] Error gathering store data:', error);
    return {
      metrics: {},
      timestamp: new Date().toISOString(),
      error: error.message,
    };
  }
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

async function generateDailyBriefingWithAI(
  storeData: any,
  recentBriefings: any[],
  shopName: string
): Promise<any> {
  const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');

  if (!anthropicApiKey) {
    return generateBasicBriefing(storeData, shopName);
  }

  const systemPrompt = `You are an expert e-commerce business coach providing a daily briefing to a Shopify store owner.

Your briefing should be:
- Concise but insightful (3-5 key points)
- Action-oriented (what should they do TODAY?)
- Encouraging and supportive
- Data-driven but easy to understand
- Personalized to their specific situation

Format your response as JSON:
{
  "greeting": "Good morning! Here's your daily briefing for ${storeData.day_of_week}.",
  "summary": "One-sentence overview of store health",
  "highlights": [
    {
      "type": "win" | "alert" | "opportunity" | "insight",
      "title": "Brief title",
      "description": "Explanation with specific numbers",
      "action": "What to do about it (optional)"
    }
  ],
  "daily_focus": "The ONE thing to focus on today",
  "quick_stats": {
    "revenue_24h": "$XXX",
    "orders_24h": X,
    "trend": "up" | "down" | "stable"
  },
  "motivation": "Brief encouraging message to end the briefing"
}

Store: ${shopName}
Day: ${storeData.day_of_week}

Metrics:
${JSON.stringify(storeData.metrics, null, 2)}

Recent briefings (avoid repeating same advice):
${recentBriefings.map((b) => b.content?.daily_focus || 'N/A').join(', ')}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicApiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: 'Generate my daily business briefing.',
        },
      ],
    }),
  });

  if (!response.ok) {
    return generateBasicBriefing(storeData, shopName);
  }

  const result = await response.json();
  const contentText = result.content[0].text;

  const jsonMatch = contentText.match(/```json\n([\s\S]*?)\n```/) || contentText.match(/({[\s\S]*})/);
  const jsonText = jsonMatch ? jsonMatch[1] : contentText;

  return JSON.parse(jsonText);
}

function generateBasicBriefing(storeData: any, shopName: string): any {
  const metrics = storeData.metrics || {};

  const highlights = [];

  if (metrics.revenue_growth > 10) {
    highlights.push({
      type: 'win',
      title: 'Revenue Growing!',
      description: `Revenue is up ${metrics.revenue_growth.toFixed(1)}% compared to last week`,
    });
  } else if (metrics.revenue_growth < -10) {
    highlights.push({
      type: 'alert',
      title: 'Revenue Declining',
      description: `Revenue is down ${Math.abs(metrics.revenue_growth).toFixed(1)}% compared to last week`,
      action: 'Consider running a promotion or reviewing your marketing',
    });
  }

  if (metrics.out_of_stock_count > 0) {
    highlights.push({
      type: 'alert',
      title: 'Out of Stock Items',
      description: `${metrics.out_of_stock_count} products are completely out of stock`,
      action: 'Restock these items to avoid lost sales',
    });
  }

  if (metrics.unfulfilled_orders > 5) {
    highlights.push({
      type: 'alert',
      title: 'Unfulfilled Orders',
      description: `${metrics.unfulfilled_orders} orders are waiting to be fulfilled`,
      action: 'Process these orders to maintain customer satisfaction',
    });
  }

  return {
    greeting: `Good morning! Here's your daily briefing for ${storeData.day_of_week}.`,
    summary: `Your store processed ${metrics.orders_24h || 0} orders yesterday`,
    highlights,
    daily_focus: highlights.length > 0
      ? highlights[0].action || 'Keep monitoring your store metrics'
      : 'Focus on growing your traffic and conversions',
    quick_stats: {
      revenue_24h: `$${(metrics.revenue_24h || 0).toFixed(2)}`,
      orders_24h: metrics.orders_24h || 0,
      trend: metrics.revenue_growth > 0 ? 'up' : metrics.revenue_growth < 0 ? 'down' : 'stable',
    },
    motivation: 'Have a great day!',
  };
}
