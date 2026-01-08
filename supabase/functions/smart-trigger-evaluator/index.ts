// Smart Trigger Evaluator Edge Function
// AI-powered trigger evaluation that learns from patterns and optimizes timing

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

    const { automation_id, trigger_type, context = {} } = await req.json();

    console.log(`[Smart Trigger] Evaluating triggers for user ${user.id}`);

    // Get user's platforms and store data
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

    // Get automation performance history
    const { data: performanceData } = await supabaseClient
      .from('automation_performance')
      .select('*')
      .eq('user_id', user.id)
      .order('executed_at', { ascending: false })
      .limit(100);

    // Analyze store data and patterns
    const analysis = await analyzeStorePatternsWithAI(
      platforms,
      performanceData || [],
      trigger_type,
      context
    );

    // Get AI recommendations
    const recommendations = await generateSmartRecommendations(
      analysis,
      trigger_type,
      performanceData || []
    );

    console.log(`[Smart Trigger] Generated ${recommendations.length} recommendations`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          should_trigger: analysis.should_trigger,
          confidence: analysis.confidence,
          reasoning: analysis.reasoning,
          optimal_timing: analysis.optimal_timing,
          recommendations,
          patterns_detected: analysis.patterns,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[Smart Trigger] Error:', error);
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

async function analyzeStorePatternsWithAI(
  platforms: any[],
  performanceData: any[],
  triggerType: string,
  context: any
): Promise<any> {
  const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');

  if (!anthropicApiKey) {
    console.warn('[Smart Trigger] No ANTHROPIC_API_KEY - using basic logic');
    return basicTriggerLogic(platforms, triggerType);
  }

  // Fetch current store data for pattern analysis
  const storeData = await fetchStoreDataForAnalysis(platforms[0]);

  const systemPrompt = `You are an AI automation expert analyzing e-commerce store data to determine optimal automation timing.

Your job is to analyze store patterns and decide:
1. Should this trigger fire NOW?
2. What's the confidence level (0.0-1.0)?
3. What patterns led to this decision?
4. When is the optimal time to trigger this automation?

Consider:
- Historical performance data (what worked well before?)
- Current store metrics (sales, inventory, order volume)
- Time-based patterns (day of week, time of day, seasonality)
- Business context (holidays, sales events, stock levels)

Trigger Type: ${triggerType}
Current Time: ${new Date().toISOString()}
Day of Week: ${new Date().toLocaleDateString('en-US', { weekday: 'long' })}

Store Metrics:
${JSON.stringify(storeData.metrics, null, 2)}

Recent Performance (last 10 automation runs):
${JSON.stringify(performanceData.slice(0, 10), null, 2)}

Respond in JSON format:
{
  "should_trigger": boolean,
  "confidence": 0.0-1.0,
  "reasoning": "Explanation of why/why not",
  "optimal_timing": {
    "recommended_time": "ISO timestamp or 'now'",
    "reason": "Why this time is optimal"
  },
  "patterns": [
    {
      "pattern": "Description of detected pattern",
      "strength": "weak|moderate|strong",
      "recommendation": "How to leverage this pattern"
    }
  ]
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
          content: `Analyze this data and tell me if I should trigger this automation now, or wait for a better time.`,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${await response.text()}`);
  }

  const result = await response.json();
  const contentText = result.content[0].text;

  const jsonMatch = contentText.match(/```json\n([\s\S]*?)\n```/) || contentText.match(/({[\s\S]*})/);
  const jsonText = jsonMatch ? jsonMatch[1] : contentText;

  return JSON.parse(jsonText);
}

async function fetchStoreDataForAnalysis(platform: any): Promise<any> {
  try {
    // Fetch recent orders
    const ordersResponse = await shopifyRequest(platform, 'orders.json?limit=50&status=any');
    const orders = ordersResponse.orders || [];

    // Fetch products with low inventory
    const productsResponse = await shopifyRequest(platform, 'products.json?limit=250');
    const products = productsResponse.products || [];

    // Calculate metrics
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const ordersLast24h = orders.filter((o) => new Date(o.created_at) > last24Hours);
    const ordersLast7d = orders.filter((o) => new Date(o.created_at) > last7Days);

    const lowStockProducts = products.filter((p) =>
      p.variants?.some((v: any) => v.inventory_quantity < 10)
    );

    const outOfStockProducts = products.filter((p) =>
      p.variants?.some((v: any) => v.inventory_quantity === 0)
    );

    return {
      metrics: {
        total_products: products.length,
        low_stock_count: lowStockProducts.length,
        out_of_stock_count: outOfStockProducts.length,
        orders_last_24h: ordersLast24h.length,
        orders_last_7d: ordersLast7d.length,
        revenue_last_24h: ordersLast24h.reduce(
          (sum, o) => sum + parseFloat(o.total_price || '0'),
          0
        ),
        revenue_last_7d: ordersLast7d.reduce(
          (sum, o) => sum + parseFloat(o.total_price || '0'),
          0
        ),
        avg_order_value: ordersLast24h.length > 0
          ? ordersLast24h.reduce((sum, o) => sum + parseFloat(o.total_price || '0'), 0) / ordersLast24h.length
          : 0,
      },
      timestamp: now.toISOString(),
    };
  } catch (error) {
    console.error('[Smart Trigger] Error fetching store data:', error);
    return {
      metrics: {
        total_products: 0,
        low_stock_count: 0,
        out_of_stock_count: 0,
        orders_last_24h: 0,
        orders_last_7d: 0,
        revenue_last_24h: 0,
        revenue_last_7d: 0,
        avg_order_value: 0,
      },
      timestamp: new Date().toISOString(),
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

function basicTriggerLogic(platforms: any[], triggerType: string): any {
  // Fallback logic when AI is not available
  const now = new Date();
  const hour = now.getHours();
  const dayOfWeek = now.getDay();

  // Business hours: 9am - 5pm, Mon-Fri
  const isBusinessHours = hour >= 9 && hour <= 17 && dayOfWeek >= 1 && dayOfWeek <= 5;

  return {
    should_trigger: isBusinessHours,
    confidence: 0.6,
    reasoning: isBusinessHours
      ? 'Triggering during business hours for better monitoring'
      : 'Waiting for business hours to trigger automation',
    optimal_timing: {
      recommended_time: isBusinessHours ? 'now' : 'next business day 9am',
      reason: 'Business hours are optimal for monitoring automation results',
    },
    patterns: [
      {
        pattern: 'Basic time-based pattern',
        strength: 'weak',
        recommendation: 'Configure AI analysis for smarter timing',
      },
    ],
  };
}

async function generateSmartRecommendations(
  analysis: any,
  triggerType: string,
  performanceData: any[]
): Promise<any[]> {
  const recommendations = [];

  // Analyze performance data for patterns
  if (performanceData.length >= 5) {
    const successRate =
      performanceData.filter((p) => p.success_rate > 0.8).length / performanceData.length;

    if (successRate < 0.5) {
      recommendations.push({
        type: 'optimization',
        priority: 'high',
        title: 'Low Success Rate Detected',
        description: `This automation has a ${(successRate * 100).toFixed(0)}% success rate. Consider reviewing the trigger conditions.`,
        action: 'review_trigger',
      });
    }
  }

  // Pattern-based recommendations
  if (analysis.patterns) {
    for (const pattern of analysis.patterns) {
      if (pattern.strength === 'strong') {
        recommendations.push({
          type: 'insight',
          priority: 'medium',
          title: `Pattern Detected: ${pattern.pattern}`,
          description: pattern.recommendation,
          action: 'optimize_timing',
        });
      }
    }
  }

  // Optimal timing recommendation
  if (analysis.optimal_timing && analysis.optimal_timing.recommended_time !== 'now') {
    recommendations.push({
      type: 'timing',
      priority: 'low',
      title: 'Better Timing Available',
      description: `This automation would perform better at ${analysis.optimal_timing.recommended_time}`,
      reason: analysis.optimal_timing.reason,
      action: 'schedule_for_later',
    });
  }

  return recommendations;
}
