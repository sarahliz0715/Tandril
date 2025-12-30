// Onboarding Store Analyzer Edge Function
// Analyzes a newly connected store and generates personalized onboarding recommendations

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

    const { platform_id } = await req.json();

    console.log(`[Onboarding Analyzer] Analyzing store for user ${user.id}`);

    // Get platform
    const { data: platform } = await supabaseClient
      .from('platforms')
      .select('*')
      .eq('id', platform_id)
      .eq('user_id', user.id)
      .single();

    if (!platform) {
      throw new Error('Platform not found');
    }

    // Perform comprehensive analysis
    const analysis = await analyzeStoreForOnboarding(platform);

    // Generate personalized recommendations
    const recommendations = await generateOnboardingRecommendations(analysis, platform.shop_name);

    // Save onboarding data
    await supabaseClient
      .from('onboarding_progress')
      .upsert({
        user_id: user.id,
        platform_id: platform.id,
        analysis_data: analysis,
        recommendations: recommendations,
        current_step: 'findings_presented',
        completed_steps: ['connected', 'analyzed'],
      }, {
        onConflict: 'user_id,platform_id'
      });

    console.log(`[Onboarding Analyzer] Analysis complete with ${recommendations.quick_wins.length} quick wins`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          analysis,
          recommendations,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[Onboarding Analyzer] Error:', error);
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

async function analyzeStoreForOnboarding(platform: any): Promise<any> {
  try {
    // Fetch products
    const productsResponse = await shopifyRequest(platform, 'products.json?limit=250');
    const products = productsResponse.products || [];

    // Fetch orders
    const ordersResponse = await shopifyRequest(platform, 'orders.json?limit=100&status=any');
    const orders = ordersResponse.orders || [];

    // Calculate metrics
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const ordersLast7d = orders.filter((o) => new Date(o.created_at) > last7Days);
    const ordersLast30d = orders.filter((o) => new Date(o.created_at) > last30Days);

    // Product analysis
    const productsWithoutImages = products.filter((p) => !p.images || p.images.length === 0);
    const productsWithPoorDescriptions = products.filter(
      (p) => !p.body_html || p.body_html.length < 100
    );
    const productsWithoutVariants = products.filter((p) => !p.variants || p.variants.length <= 1);

    // SEO analysis
    const productsWithPoorSEO = products.filter((p) => {
      const title = p.title || '';
      const description = p.body_html || '';
      return title.length < 30 || description.length < 100;
    });

    // Inventory analysis
    const lowStockProducts = products.filter((p) =>
      p.variants?.some((v: any) => v.inventory_quantity > 0 && v.inventory_quantity < 10)
    );
    const outOfStockProducts = products.filter((p) =>
      p.variants?.every((v: any) => v.inventory_quantity === 0)
    );

    // Order analysis
    const unfulfilledOrders = ordersLast30d.filter(
      (o) => o.fulfillment_status === null || o.fulfillment_status === 'unfulfilled'
    );
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const stuckOrders = unfulfilledOrders.filter((o) => new Date(o.created_at) < threeDaysAgo);

    // Revenue analysis
    const revenue7d = ordersLast7d.reduce((sum, o) => sum + parseFloat(o.total_price || '0'), 0);
    const revenue30d = ordersLast30d.reduce((sum, o) => sum + parseFloat(o.total_price || '0'), 0);

    // Find bestsellers
    const productSales = new Map();
    ordersLast30d.forEach((order) => {
      order.line_items?.forEach((item: any) => {
        const current = productSales.get(item.product_id) || { quantity: 0, revenue: 0 };
        productSales.set(item.product_id, {
          quantity: current.quantity + item.quantity,
          revenue: current.revenue + parseFloat(item.price || '0') * item.quantity,
        });
      });
    });

    const topSellers = Array.from(productSales.entries())
      .sort((a, b) => b[1].quantity - a[1].quantity)
      .slice(0, 5)
      .map(([productId, stats]) => {
        const product = products.find((p) => p.id === productId);
        return {
          product_id: productId,
          title: product?.title || 'Unknown',
          units_sold: stats.quantity,
          revenue: stats.revenue,
          has_good_seo: product && product.title.length >= 30 && (product.body_html?.length || 0) >= 100,
          has_images: product && product.images && product.images.length > 0,
        };
      });

    return {
      store_size: {
        total_products: products.length,
        total_orders_30d: ordersLast30d.length,
        total_orders_7d: ordersLast7d.length,
        revenue_30d: revenue30d,
        revenue_7d: revenue7d,
      },
      product_health: {
        without_images: productsWithoutImages.length,
        poor_descriptions: productsWithPoorDescriptions.length,
        poor_seo: productsWithPoorSEO.length,
        without_variants: productsWithoutVariants.length,
      },
      inventory_health: {
        low_stock: lowStockProducts.length,
        out_of_stock: outOfStockProducts.length,
        inventory_status: outOfStockProducts.length === 0 && lowStockProducts.length < 5 ? 'good' : 'needs_attention',
      },
      order_health: {
        unfulfilled: unfulfilledOrders.length,
        stuck_orders: stuckOrders.length,
        fulfillment_rate: ordersLast30d.length > 0
          ? ((ordersLast30d.length - unfulfilledOrders.length) / ordersLast30d.length) * 100
          : 100,
      },
      top_performers: topSellers,
      opportunities_found: productsWithoutImages.length + productsWithPoorSEO.length + stuckOrders.length,
      analyzed_at: now.toISOString(),
    };
  } catch (error) {
    console.error('[Onboarding Analyzer] Analysis error:', error);
    throw error;
  }
}

async function generateOnboardingRecommendations(analysis: any, shopName: string): Promise<any> {
  const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');

  if (!anthropicApiKey) {
    return generateBasicRecommendations(analysis);
  }

  const systemPrompt = `You are Orion, an enthusiastic and helpful AI assistant guiding a new Shopify seller through their first experience with Tandril.

The seller just connected their store "${shopName}" and you've analyzed it. Now you need to:
1. Greet them warmly and show you understand their store
2. Highlight 3-5 KEY findings (mix of good and areas to improve)
3. Suggest 3 QUICK WINS they can do right now
4. Recommend 1-2 AUTOMATIONS that would help them most

Be conversational, encouraging, and specific. Use their actual data!

Store Analysis:
${JSON.stringify(analysis, null, 2)}

Respond in JSON format:
{
  "greeting": "Warm, personalized greeting mentioning their store",
  "findings": [
    {
      "type": "positive" | "opportunity" | "alert",
      "icon": "emoji",
      "title": "Brief title",
      "description": "Specific finding with numbers"
    }
  ],
  "quick_wins": [
    {
      "title": "Action title",
      "description": "Why this matters",
      "action_type": "fix_seo" | "add_images" | "generate_content" | "fulfill_orders" | "restock",
      "estimated_time": "5 minutes" | "10 minutes" | "30 minutes",
      "impact": "high" | "medium" | "low",
      "products_affected": [product IDs] or null
    }
  ],
  "recommended_automations": [
    {
      "name": "Automation name",
      "description": "What it does and why it helps",
      "trigger_type": "inventory_low" | "order_placed" | "no_sales_period" | etc,
      "benefit": "Specific benefit for this seller",
      "setup_difficulty": "easy" | "medium"
    }
  ],
  "next_steps": "Encouraging message about what to do next"
}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicApiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: 'Generate personalized onboarding recommendations for this seller.',
        },
      ],
    }),
  });

  if (!response.ok) {
    return generateBasicRecommendations(analysis);
  }

  const result = await response.json();
  const contentText = result.content[0].text;

  const jsonMatch = contentText.match(/```json\n([\s\S]*?)\n```/) || contentText.match(/({[\s\S]*})/);
  const jsonText = jsonMatch ? jsonMatch[1] : contentText;

  return JSON.parse(jsonText);
}

function generateBasicRecommendations(analysis: any): any {
  const findings = [];
  const quickWins = [];
  const automations = [];

  // Positive findings
  if (analysis.store_size.total_products > 0) {
    findings.push({
      type: 'positive',
      icon: '🎉',
      title: 'Store Connected Successfully',
      description: `I can see your ${analysis.store_size.total_products} products and I'm ready to help optimize them!`,
    });
  }

  // Opportunities
  if (analysis.product_health.without_images > 0) {
    findings.push({
      type: 'opportunity',
      icon: '📸',
      title: 'Products Missing Images',
      description: `${analysis.product_health.without_images} products don't have images. Products with images sell 2-3x better!`,
    });

    quickWins.push({
      title: 'Add Images to Products',
      description: 'Products with professional images sell significantly better',
      action_type: 'add_images',
      estimated_time: '30 minutes',
      impact: 'high',
      products_affected: null,
    });
  }

  if (analysis.product_health.poor_seo > 5) {
    findings.push({
      type: 'opportunity',
      icon: '🔍',
      title: 'SEO Needs Improvement',
      description: `${analysis.product_health.poor_seo} products have poor SEO (short titles/descriptions)`,
    });

    quickWins.push({
      title: 'Fix SEO on Top Products',
      description: 'Better SEO means more organic traffic and sales',
      action_type: 'fix_seo',
      estimated_time: '10 minutes',
      impact: 'high',
      products_affected: null,
    });
  }

  if (analysis.order_health.stuck_orders > 0) {
    findings.push({
      type: 'alert',
      icon: '⚠️',
      title: 'Orders Need Attention',
      description: `${analysis.order_health.stuck_orders} orders are 3+ days old and unfulfilled`,
    });
  }

  // Recommended automations
  if (analysis.inventory_health.low_stock > 0 || analysis.inventory_health.out_of_stock > 0) {
    automations.push({
      name: 'Low Inventory Alerts',
      description: 'Get notified when products are running low so you never miss a sale',
      trigger_type: 'inventory_low',
      benefit: `You have ${analysis.inventory_health.low_stock + analysis.inventory_health.out_of_stock} products with inventory issues right now`,
      setup_difficulty: 'easy',
    });
  }

  if (analysis.order_health.unfulfilled > 0) {
    automations.push({
      name: 'Stuck Order Notifications',
      description: 'Get alerted when orders sit unfulfilled for too long',
      trigger_type: 'order_stuck',
      benefit: 'Prevent customer complaints and maintain high satisfaction',
      setup_difficulty: 'easy',
    });
  }

  if (quickWins.length === 0) {
    quickWins.push({
      title: 'Generate Product Descriptions',
      description: 'AI can write compelling descriptions for all your products',
      action_type: 'generate_content',
      estimated_time: '5 minutes',
      impact: 'medium',
      products_affected: null,
    });
  }

  return {
    greeting: `Great! I've analyzed your store and I'm excited to help you grow!`,
    findings,
    quick_wins: quickWins.slice(0, 3),
    recommended_automations: automations.slice(0, 2),
    next_steps: "Let's start with some quick wins to improve your store right away!",
  };
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
