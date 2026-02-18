// Growth Opportunity Detector Edge Function
// AI identifies untapped growth opportunities in the store

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

    console.log(`[Growth Opportunities] Analyzing for user ${user.id}`);

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

    // Analyze store for growth opportunities
    const opportunities = await detectGrowthOpportunities(platforms[0]);

    // Save to database
    await supabaseClient.from('business_coaching').insert({
      user_id: user.id,
      coaching_type: 'growth_opportunity',
      content: { opportunities },
      metadata: {
        opportunities_count: opportunities.length,
        high_priority_count: opportunities.filter((o) => o.priority === 'high').length,
      },
    });

    console.log(`[Growth Opportunities] Found ${opportunities.length} opportunities`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          opportunities,
          summary: {
            total: opportunities.length,
            high_priority: opportunities.filter((o) => o.priority === 'high').length,
            estimated_revenue_potential: opportunities.reduce(
              (sum, o) => sum + (o.estimated_revenue || 0),
              0
            ),
          },
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[Growth Opportunities] Error:', error);
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

async function detectGrowthOpportunities(platform: any): Promise<any[]> {
  try {
    // Fetch store data
    const productsResponse = await shopifyRequest(platform, 'products.json?limit=250');
    const products = productsResponse.products || [];

    const ordersResponse = await shopifyRequest(platform, 'orders.json?limit=250&status=any');
    const orders = ordersResponse.orders || [];

    // Analyze with AI
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');

    if (!anthropicApiKey) {
      return detectBasicOpportunities(products, orders);
    }

    return await detectOpportunitiesWithAI(products, orders, platform.shop_name, anthropicApiKey);
  } catch (error) {
    console.error('[Growth Opportunities] Detection error:', error);
    return [];
  }
}

async function detectOpportunitiesWithAI(
  products: any[],
  orders: any[],
  shopName: string,
  apiKey: string
): Promise<any[]> {
  // Calculate product performance
  const productPerformance = products.map((product) => {
    const sales = orders.filter((o) =>
      o.line_items?.some((item: any) => item.product_id === product.id)
    ).length;

    const revenue = orders.reduce((sum, o) => {
      const items = o.line_items?.filter((item: any) => item.product_id === product.id) || [];
      return sum + items.reduce((itemSum: number, item: any) => itemSum + parseFloat(item.price || '0') * item.quantity, 0);
    }, 0);

    return {
      id: product.id,
      title: product.title,
      sales_count: sales,
      revenue,
      has_images: (product.images?.length || 0) > 0,
      has_description: (product.body_html?.length || 0) > 50,
      variant_count: product.variants?.length || 0,
      inventory: product.variants?.[0]?.inventory_quantity || 0,
    };
  });

  const systemPrompt = `You are an expert e-commerce growth strategist analyzing a Shopify store to find untapped revenue opportunities.

Analyze the product performance data and identify specific, actionable growth opportunities.

Focus on:
1. **Underperforming Products**: Products with potential but low sales
2. **Missing Optimizations**: Products without good images/descriptions
3. **Inventory Issues**: Popular items that are low/out of stock
4. **Pricing Opportunities**: Products priced too low given demand
5. **Cross-sell Potential**: Products that could be bundled
6. **Seasonal Timing**: Products that should be promoted now

Store: ${shopName}
Total Products: ${products.length}
Total Orders (recent): ${orders.length}

Product Performance:
${JSON.stringify(productPerformance.slice(0, 50), null, 2)}

Respond in JSON format:
{
  "opportunities": [
    {
      "type": "underperforming_product" | "missing_optimization" | "inventory_risk" | "pricing" | "cross_sell" | "seasonal",
      "priority": "high" | "medium" | "low",
      "title": "Brief title",
      "description": "Detailed explanation with specific products/numbers",
      "action": "Specific action to take",
      "estimated_revenue": number (monthly revenue potential in dollars),
      "effort_required": "low" | "medium" | "high",
      "products_affected": [product IDs]
    }
  ]
}

Prioritize opportunities by:
- High revenue potential with low effort = HIGH priority
- Medium revenue with medium effort = MEDIUM priority
- Low revenue or high effort = LOW priority`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 3000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: 'Analyze this store and find growth opportunities.',
        },
      ],
    }),
  });

  if (!response.ok) {
    return detectBasicOpportunities(products, orders);
  }

  const result = await response.json();
  const contentText = result.content[0].text;

  const jsonMatch = contentText.match(/```json\n([\s\S]*?)\n```/) || contentText.match(/({[\s\S]*})/);
  const jsonText = jsonMatch ? jsonMatch[1] : contentText;

  const parsed = JSON.parse(jsonText);
  return parsed.opportunities || [];
}

function detectBasicOpportunities(products: any[], orders: any[]): any[] {
  const opportunities = [];

  // Find products without images
  const noImageProducts = products.filter((p) => !p.images || p.images.length === 0);
  if (noImageProducts.length > 0) {
    opportunities.push({
      type: 'missing_optimization',
      priority: 'high',
      title: 'Products Missing Images',
      description: `${noImageProducts.length} products don't have images. Products with images sell 2-3x better.`,
      action: 'Add professional product photos',
      estimated_revenue: noImageProducts.length * 50,
      effort_required: 'medium',
      products_affected: noImageProducts.map((p) => p.id),
    });
  }

  // Find products with short descriptions
  const poorDescriptions = products.filter(
    (p) => !p.body_html || p.body_html.length < 100
  );
  if (poorDescriptions.length > 3) {
    opportunities.push({
      type: 'missing_optimization',
      priority: 'medium',
      title: 'Improve Product Descriptions',
      description: `${poorDescriptions.length} products have minimal descriptions. Better descriptions increase conversions by 20-30%.`,
      action: 'Write detailed, benefit-focused product descriptions',
      estimated_revenue: poorDescriptions.length * 30,
      effort_required: 'low',
      products_affected: poorDescriptions.slice(0, 10).map((p) => p.id),
    });
  }

  // Find out of stock products
  const outOfStock = products.filter((p) =>
    p.variants?.every((v: any) => v.inventory_quantity === 0)
  );
  if (outOfStock.length > 0) {
    opportunities.push({
      type: 'inventory_risk',
      priority: 'high',
      title: 'Restock Out-of-Stock Items',
      description: `${outOfStock.length} products are completely out of stock. You're losing sales every day.`,
      action: 'Order inventory for these products immediately',
      estimated_revenue: outOfStock.length * 100,
      effort_required: 'medium',
      products_affected: outOfStock.map((p) => p.id),
    });
  }

  return opportunities;
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
