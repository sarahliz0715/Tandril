// check-alerts Edge Function
// Runs on a schedule (via pg_cron) using the service role key — no user session needed.
// For each active custom_alert whose check_frequency is due, fetches live platform data,
// evaluates conditions, writes to smart_alerts, and sends email via Resend.
//
// Auth: expects header  x-cron-secret: <CRON_SECRET env var>
// Called by pg_cron every 15 minutes.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { decrypt, isEncrypted } from '../_shared/encryption.ts';

const SHOPIFY_API_VERSION = '2024-01';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

// Minutes between checks for each frequency setting
const FREQUENCY_MINUTES: Record<string, number> = {
  real_time:        5,
  every_5_minutes:  5,
  every_15_minutes: 15,
  hourly:           60,
  daily:            1440,
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // Authenticate with cron secret (not user JWT — this runs unattended)
  const cronSecret = Deno.env.get('CRON_SECRET');
  const incomingSecret = req.headers.get('x-cron-secret');
  if (!cronSecret || incomingSecret !== cronSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  const now = new Date();
  console.log(`[check-alerts] Running at ${now.toISOString()}`);

  let evaluated = 0, triggered = 0, errors = 0;

  try {
    // Load all active custom alerts
    const { data: alerts, error: alertsErr } = await supabase
      .from('custom_alerts')
      .select('*')
      .eq('is_active', true);

    if (alertsErr) throw alertsErr;
    if (!alerts || alerts.length === 0) {
      console.log('[check-alerts] No active alerts found');
      return okResponse({ evaluated: 0, triggered: 0 });
    }

    // Group alerts by user so we make one platform fetch per user
    const byUser = new Map<string, typeof alerts>();
    for (const alert of alerts) {
      if (!isAlertDue(alert, now)) continue;
      const arr = byUser.get(alert.user_id) || [];
      arr.push(alert);
      byUser.set(alert.user_id, arr);
    }

    for (const [userId, userAlerts] of byUser) {
      try {
        // Get user's active platforms
        const { data: platforms } = await supabase
          .from('platforms')
          .select('*')
          .eq('user_id', userId)
          .eq('is_active', true);

        // Get user's email for notifications
        const { data: userData } = await supabase.auth.admin.getUserById(userId);
        const userEmail = userData?.user?.email;

        const storeData = await fetchStoreData(platforms || []);

        for (const alert of userAlerts) {
          evaluated++;
          try {
            const fired = await evaluateAlert(alert, storeData);
            if (!fired) {
              // Just update last_checked
              await supabase.from('custom_alerts').update({ last_checked: now.toISOString() }).eq('id', alert.id);
              continue;
            }

            // Check cooldown
            if (alert.last_triggered) {
              const msSinceLast = now.getTime() - new Date(alert.last_triggered).getTime();
              if (msSinceLast < (alert.cooldown_minutes || 60) * 60 * 1000) {
                console.log(`[check-alerts] Alert ${alert.id} in cooldown, skipping`);
                continue;
              }
            }

            triggered++;

            // Write smart_alert
            const inAppTitle = alert.notification_template?.in_app_title || alert.name;
            const inAppMessage = alert.notification_template?.in_app_message || fired.message;

            await supabase.from('smart_alerts').insert({
              user_id: userId,
              custom_alert_id: alert.id,
              alert_type: getAlertType(alert.trigger_type),
              title: inAppTitle,
              message: inAppMessage,
              priority: alert.notification_template?.priority || 'medium',
              suggested_actions: fired.suggested_actions || [],
            });

            // Update alert stats
            await supabase.from('custom_alerts').update({
              trigger_count: (alert.trigger_count || 0) + 1,
              last_triggered: now.toISOString(),
              last_checked: now.toISOString(),
            }).eq('id', alert.id);

            // Send email if requested
            if (userEmail && alert.notification_channels?.includes('email')) {
              await sendEmail({
                to: userEmail,
                subject: alert.notification_template?.email_subject || `Tandril Alert: ${alert.name}`,
                body: alert.notification_template?.email_body || inAppMessage,
                alertName: alert.name,
                message: inAppMessage,
              });
            }

            console.log(`[check-alerts] Triggered alert "${alert.name}" for user ${userId}`);
          } catch (e: any) {
            errors++;
            console.error(`[check-alerts] Error evaluating alert ${alert.id}:`, e.message);
          }
        }
      } catch (e: any) {
        errors++;
        console.error(`[check-alerts] Error processing user ${userId}:`, e.message);
      }
    }

    console.log(`[check-alerts] Done — evaluated: ${evaluated}, triggered: ${triggered}, errors: ${errors}`);
    return okResponse({ evaluated, triggered, errors });

  } catch (e: any) {
    console.error('[check-alerts] Fatal error:', e.message);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isAlertDue(alert: any, now: Date): boolean {
  const minInterval = FREQUENCY_MINUTES[alert.check_frequency] || 60;
  if (!alert.last_checked) return true;
  const msSince = now.getTime() - new Date(alert.last_checked).getTime();
  return msSince >= minInterval * 60 * 1000;
}

async function fetchStoreData(platforms: any[]): Promise<any> {
  const data: any = { inventory: [], orders: [] };
  for (const platform of platforms) {
    if (platform.platform_type !== 'shopify') continue;
    try {
      let token = platform.credentials?.access_token || platform.access_token;
      if (token && isEncrypted(token)) token = await decrypt(token);
      const domain = platform.shop_domain || platform.credentials?.shop_domain;
      if (!token || !domain) continue;

      const [prodRes, orderRes] = await Promise.all([
        fetch(`https://${domain}/admin/api/${SHOPIFY_API_VERSION}/products.json?limit=250`, {
          headers: { 'X-Shopify-Access-Token': token },
        }),
        fetch(`https://${domain}/admin/api/${SHOPIFY_API_VERSION}/orders.json?limit=50&status=any`, {
          headers: { 'X-Shopify-Access-Token': token },
        }),
      ]);

      if (prodRes.ok) {
        const { products } = await prodRes.json();
        for (const p of (products || [])) {
          for (const v of (p.variants || [])) {
            data.inventory.push({
              product_id: p.id,
              product_title: p.title,
              variant_id: v.id,
              variant_title: v.title,
              sku: v.sku,
              quantity: v.inventory_quantity ?? 0,
              platform: 'shopify',
              domain,
            });
          }
        }
      }

      if (orderRes.ok) {
        const { orders } = await orderRes.json();
        data.orders = (orders || []).map((o: any) => ({
          id: o.id,
          total: parseFloat(o.total_price || '0'),
          created_at: o.created_at,
          platform: 'shopify',
        }));
      }
    } catch (e: any) {
      console.warn(`[check-alerts] Failed to fetch data for platform ${platform.id}:`, e.message);
    }
  }
  return data;
}

async function evaluateAlert(alert: any, storeData: any): Promise<{ message: string; suggested_actions?: any[] } | null> {
  const conditions = alert.conditions || [];

  switch (alert.trigger_type) {
    case 'inventory_low': {
      const threshold = Number(conditions.find((c: any) => c.field === 'quantity' || c.field === 'inventory_quantity')?.value ?? 10);
      const lowItems = storeData.inventory.filter((i: any) => i.quantity > 0 && i.quantity <= threshold);
      if (lowItems.length === 0) return null;
      const names = lowItems.slice(0, 3).map((i: any) => `${i.product_title} (${i.quantity} left)`).join(', ');
      return {
        message: `${lowItems.length} product${lowItems.length > 1 ? 's are' : ' is'} running low: ${names}${lowItems.length > 3 ? ` and ${lowItems.length - 3} more` : ''}.`,
        suggested_actions: [{ action: 'View low stock products', command: 'Show me all products with low inventory' }],
      };
    }

    case 'inventory_out_of_stock': {
      const outItems = storeData.inventory.filter((i: any) => i.quantity <= 0);
      if (outItems.length === 0) return null;
      const names = outItems.slice(0, 3).map((i: any) => i.product_title).join(', ');
      return {
        message: `${outItems.length} product${outItems.length > 1 ? 's are' : ' is'} out of stock: ${names}${outItems.length > 3 ? ` and ${outItems.length - 3} more` : ''}.`,
        suggested_actions: [{ action: 'Restock products', command: 'Show me all out of stock products' }],
      };
    }

    case 'order_threshold': {
      const thresholdCond = conditions.find((c: any) => c.field === 'order_count' || c.field === 'orders');
      if (!thresholdCond) return null;
      const threshold = Number(thresholdCond.value);
      const windowHours = 24;
      const cutoff = new Date(Date.now() - windowHours * 60 * 60 * 1000);
      const recentOrders = storeData.orders.filter((o: any) => new Date(o.created_at) > cutoff);
      const op = thresholdCond.operator;
      const count = recentOrders.length;
      const met = op === 'greater_than' ? count > threshold
        : op === 'less_than' ? count < threshold
        : op === 'greater_or_equal' ? count >= threshold
        : op === 'less_or_equal' ? count <= threshold
        : count === threshold;
      if (!met) return null;
      return { message: `Order count in the last 24h is ${count} (threshold: ${op.replace(/_/g, ' ')} ${threshold}).` };
    }

    default:
      return null;
  }
}

function getAlertType(triggerType: string): string {
  const criticals = ['inventory_out_of_stock', 'platform_disconnect', 'ad_spend_high'];
  const opportunities = ['revenue_milestone', 'new_review', 'order_threshold'];
  if (criticals.includes(triggerType)) return 'critical';
  if (opportunities.includes(triggerType)) return 'opportunity';
  return 'maintenance';
}

async function sendEmail(opts: { to: string; subject: string; body: string; alertName: string; message: string }) {
  const resendKey = Deno.env.get('RESEND_API_KEY');
  if (!resendKey) {
    console.warn('[check-alerts] RESEND_API_KEY not set — skipping email');
    return;
  }
  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
      <h2 style="color:#059669">Tandril Alert: ${opts.alertName}</h2>
      <p style="font-size:16px;color:#1e293b">${opts.message}</p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
      <p style="font-size:14px;color:#64748b">
        Log into <a href="https://tandril-mvp.vercel.app" style="color:#059669">Tandril</a>
        to take action or manage your alerts.
      </p>
    </div>`;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Tandril Alerts <alerts@tandril.org>',
        to: [opts.to],
        subject: opts.subject,
        html,
      }),
    });
    if (!res.ok) console.warn('[check-alerts] Resend error:', await res.text());
  } catch (e: any) {
    console.warn('[check-alerts] Email send failed:', e.message);
  }
}

function okResponse(data: object) {
  return new Response(JSON.stringify({ success: true, ...data }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
