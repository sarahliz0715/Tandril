// Evaluate Custom Alerts Edge Function
// Checks alert conditions and triggers notifications when conditions are met

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

    // Create Supabase client with service role for admin operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
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

    console.log(`[Evaluate Alerts] Evaluating alerts for user ${user.id}`);

    // Get all active alerts for this user
    const { data: alerts, error: alertsError } = await supabaseClient
      .from('custom_alerts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (alertsError) {
      throw new Error(`Failed to fetch alerts: ${alertsError.message}`);
    }

    if (!alerts || alerts.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          data: { triggered: 0, message: 'No active alerts to evaluate' },
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    console.log(`[Evaluate Alerts] Found ${alerts.length} active alerts`);

    // Get user's Shopify platforms for data
    const { data: platforms } = await supabaseClient
      .from('platforms')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform_type', 'shopify')
      .eq('is_active', true);

    let triggeredCount = 0;

    // Evaluate each alert
    for (const alert of alerts) {
      try {
        // Check cooldown period
        if (alert.last_triggered_at && alert.cooldown_minutes) {
          const cooldownEnd = new Date(alert.last_triggered_at).getTime() + (alert.cooldown_minutes * 60 * 1000);
          if (Date.now() < cooldownEnd) {
            console.log(`[Evaluate Alerts] Alert ${alert.id} in cooldown period`);
            continue;
          }
        }

        // Evaluate based on trigger type
        const shouldTrigger = await evaluateAlert(alert, platforms, supabaseClient);

        if (shouldTrigger) {
          console.log(`[Evaluate Alerts] Alert ${alert.id} triggered!`);

          // Record trigger in history
          const { data: historyRecord } = await supabaseClient
            .from('alert_history')
            .insert({
              alert_id: alert.id,
              user_id: user.id,
              trigger_data: shouldTrigger.data || {},
              notification_channels: alert.notification_channels,
              notification_sent: true,
            })
            .select()
            .single();

          // Create in-app notification
          if (alert.notification_channels.includes('in_app')) {
            await supabaseClient
              .from('notifications')
              .insert({
                user_id: user.id,
                alert_id: alert.id,
                alert_history_id: historyRecord?.id,
                title: alert.name,
                message: shouldTrigger.message || alert.description || 'Alert triggered',
                priority: alert.notification_template?.priority || 'medium',
                type: 'alert',
              });
          }

          // Update alert stats
          await supabaseClient
            .from('custom_alerts')
            .update({
              last_triggered_at: new Date().toISOString(),
              last_checked_at: new Date().toISOString(),
              trigger_count: (alert.trigger_count || 0) + 1,
            })
            .eq('id', alert.id);

          triggeredCount++;
        } else {
          // Update last checked time even if not triggered
          await supabaseClient
            .from('custom_alerts')
            .update({
              last_checked_at: new Date().toISOString(),
            })
            .eq('id', alert.id);
        }
      } catch (error) {
        console.error(`[Evaluate Alerts] Error evaluating alert ${alert.id}:`, error);
        // Continue with other alerts
      }
    }

    console.log(`[Evaluate Alerts] Evaluation complete. Triggered ${triggeredCount} alerts`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          evaluated: alerts.length,
          triggered: triggeredCount,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[Evaluate Alerts] Error:', error);
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

async function evaluateAlert(alert: any, platforms: any[], supabaseClient: any): Promise<any> {
  const triggerType = alert.trigger_type;
  const conditions = alert.conditions || [];

  try {
    switch (triggerType) {
      case 'inventory_low':
      case 'inventory_out_of_stock':
        return await evaluateInventoryAlert(alert, platforms, supabaseClient);

      case 'sales_drop':
        return await evaluateSalesDropAlert(alert, platforms);

      case 'order_threshold':
        return await evaluateOrderThresholdAlert(alert, platforms);

      default:
        return null;
    }
  } catch (error) {
    console.error(`Error evaluating ${triggerType}:`, error);
    return null;
  }
}

async function evaluateInventoryAlert(alert: any, platforms: any[], supabaseClient: any): Promise<any> {
  if (!platforms || platforms.length === 0) return null;

  let lowStockProducts = [];

  for (const platform of platforms) {
    try {
      // Fetch products from Shopify
      const response = await fetch(
        `https://${platform.shop_domain}/admin/api/${SHOPIFY_API_VERSION}/products.json?limit=250`,
        {
          headers: {
            'X-Shopify-Access-Token': platform.access_token,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) continue;

      const data = await response.json();
      const products = data.products || [];

      // Check inventory levels
      for (const product of products) {
        for (const variant of product.variants || []) {
          const quantity = variant.inventory_quantity || 0;
          const threshold = getThresholdFromConditions(alert.conditions) || 10;

          if (alert.trigger_type === 'inventory_out_of_stock' && quantity === 0) {
            lowStockProducts.push({
              product: product.title,
              variant: variant.title,
              quantity: 0,
              sku: variant.sku,
            });
          } else if (alert.trigger_type === 'inventory_low' && quantity > 0 && quantity <= threshold) {
            lowStockProducts.push({
              product: product.title,
              variant: variant.title,
              quantity,
              sku: variant.sku,
            });
          }
        }
      }
    } catch (error) {
      console.error(`Error checking inventory for ${platform.shop_domain}:`, error);
    }
  }

  if (lowStockProducts.length > 0) {
    return {
      data: { products: lowStockProducts, count: lowStockProducts.length },
      message: `${lowStockProducts.length} product(s) ${alert.trigger_type === 'inventory_out_of_stock' ? 'are out of stock' : 'have low inventory'}`,
    };
  }

  return null;
}

async function evaluateSalesDropAlert(alert: any, platforms: any[]): Promise<any> {
  // Simplified implementation - would need historical sales data
  return null;
}

async function evaluateOrderThresholdAlert(alert: any, platforms: any[]): Promise<any> {
  if (!platforms || platforms.length === 0) return null;

  let totalOrders = 0;
  const threshold = getThresholdFromConditions(alert.conditions) || 100;

  for (const platform of platforms) {
    try {
      const response = await fetch(
        `https://${platform.shop_domain}/admin/api/${SHOPIFY_API_VERSION}/orders.json?limit=250&status=any`,
        {
          headers: {
            'X-Shopify-Access-Token': platform.access_token,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) continue;

      const data = await response.json();
      totalOrders += (data.orders || []).length;
    } catch (error) {
      console.error(`Error checking orders for ${platform.shop_domain}:`, error);
    }
  }

  // Check if threshold is met
  if (totalOrders >= threshold) {
    return {
      data: { totalOrders, threshold },
      message: `Order threshold reached: ${totalOrders} orders (threshold: ${threshold})`,
    };
  }

  return null;
}

function getThresholdFromConditions(conditions: any[]): number | null {
  if (!conditions || conditions.length === 0) return null;

  const thresholdCondition = conditions.find(c =>
    c.field === 'quantity' || c.field === 'threshold' || c.field === 'value'
  );

  return thresholdCondition ? parseInt(thresholdCondition.value) : null;
}
