// daily-briefing-cron Edge Function
// Scheduled via pg_cron at 8am UTC every day.
// Uses service role — no user session needed.
// For every user with at least one active platform, generates a daily briefing,
// saves it to business_coaching, writes a smart_alert, and emails it via Resend.
//
// Auth: expects header  x-cron-secret: <CRON_SECRET env var>

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { decrypt, isEncrypted } from '../_shared/encryption.ts';

const SHOPIFY_API_VERSION = '2024-01';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const cronSecret = Deno.env.get('CRON_SECRET');
  if (!cronSecret || req.headers.get('x-cron-secret') !== cronSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  const today = new Date().toISOString().split('T')[0];
  console.log(`[daily-briefing-cron] Running for ${today}`);

  let processed = 0, skipped = 0, errors = 0;

  // Find all users with at least one active platform
  const { data: activePlatforms, error: platformErr } = await supabase
    .from('platforms')
    .select('user_id, platform_type, credentials, access_token, shop_domain, shop_name, metadata')
    .eq('is_active', true);

  if (platformErr) {
    return new Response(JSON.stringify({ error: platformErr.message }), { status: 500, headers: corsHeaders });
  }

  // Unique users
  const userIds = [...new Set((activePlatforms || []).map((p: any) => p.user_id))];

  for (const userId of userIds) {
    try {
      // Skip if already sent today
      const { data: existing } = await supabase
        .from('business_coaching')
        .select('id')
        .eq('user_id', userId)
        .eq('coaching_type', 'daily_briefing')
        .gte('created_at', `${today}T00:00:00Z`)
        .limit(1);

      if (existing && existing.length > 0) {
        skipped++;
        continue;
      }

      const userPlatforms = (activePlatforms || []).filter((p: any) => p.user_id === userId);
      const { data: userData } = await supabase.auth.admin.getUserById(userId);
      const userEmail = userData?.user?.email;

      // Decrypt tokens
      for (const p of userPlatforms) {
        const token = p.credentials?.access_token || p.access_token;
        if (token && isEncrypted(token)) {
          try {
            p._decrypted_token = await decrypt(token);
          } catch { p._decrypted_token = token; }
        } else {
          p._decrypted_token = token;
        }
      }

      const storeData = await gatherStoreData(userPlatforms);
      const shopName = userPlatforms[0]?.shop_name || userPlatforms[0]?.credentials?.shop_name || 'Your Store';

      const { data: recentBriefings } = await supabase
        .from('business_coaching')
        .select('content')
        .eq('user_id', userId)
        .eq('coaching_type', 'daily_briefing')
        .order('created_at', { ascending: false })
        .limit(7);

      const briefing = await generateBriefing(storeData, recentBriefings || [], shopName);

      // Save to business_coaching
      await supabase.from('business_coaching').insert({
        user_id: userId,
        coaching_type: 'daily_briefing',
        content: briefing,
        metadata: { date: today, store_metrics: storeData.metrics },
      });

      // Write to smart_alerts so it appears in the notification bell
      const summary = briefing.summary || `Daily briefing for ${shopName}`;
      await supabase.from('smart_alerts').insert({
        user_id: userId,
        alert_type: 'info',
        title: briefing.greeting || `Good morning! Here's your ${new Date().toLocaleDateString('en-US', { weekday: 'long' })} briefing`,
        message: summary,
        priority: 'low',
        suggested_actions: briefing.highlights?.slice(0, 2).map((h: any) => ({
          action: h.title,
          command: h.action || '',
        })).filter((a: any) => a.command) || [],
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });

      // Send email
      if (userEmail) {
        await sendBriefingEmail(userEmail, briefing, shopName);
      }

      processed++;
      console.log(`[daily-briefing-cron] Sent briefing for user ${userId} (${shopName})`);
    } catch (e: any) {
      errors++;
      console.error(`[daily-briefing-cron] Error for user ${userId}:`, e.message);
    }
  }

  console.log(`[daily-briefing-cron] Done — processed: ${processed}, skipped: ${skipped}, errors: ${errors}`);
  return new Response(JSON.stringify({ success: true, processed, skipped, errors }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});

async function gatherStoreData(platforms: any[]): Promise<any> {
  const metrics: any = {};
  const shopifyPlatform = platforms.find(p => p.platform_type === 'shopify');
  if (!shopifyPlatform) return { metrics };

  const token = shopifyPlatform._decrypted_token;
  const domain = shopifyPlatform.shop_domain || shopifyPlatform.credentials?.shop_domain;
  if (!token || !domain) return { metrics };

  try {
    const [prodRes, orderRes] = await Promise.all([
      fetch(`https://${domain}/admin/api/${SHOPIFY_API_VERSION}/products.json?limit=250`, {
        headers: { 'X-Shopify-Access-Token': token },
      }),
      fetch(`https://${domain}/admin/api/${SHOPIFY_API_VERSION}/orders.json?limit=250&status=any`, {
        headers: { 'X-Shopify-Access-Token': token },
      }),
    ]);

    const { products = [] } = prodRes.ok ? await prodRes.json() : {};
    const { orders = [] } = orderRes.ok ? await orderRes.json() : {};

    const now = new Date();
    const day1 = new Date(now.getTime() - 86400000);
    const day7 = new Date(now.getTime() - 7 * 86400000);

    const orders24h = orders.filter((o: any) => new Date(o.created_at) > day1);
    const orders7d  = orders.filter((o: any) => new Date(o.created_at) > day7);
    const rev24h = orders24h.reduce((s: number, o: any) => s + parseFloat(o.total_price || '0'), 0);
    const rev7d  = orders7d.reduce((s:  number, o: any) => s + parseFloat(o.total_price || '0'), 0);

    const lowStock  = products.filter((p: any) => p.variants?.some((v: any) => v.inventory_quantity > 0 && v.inventory_quantity < 10));
    const outStock  = products.filter((p: any) => p.variants?.every((v: any) => v.inventory_quantity <= 0));
    const unfulfilled = orders7d.filter((o: any) => !o.fulfillment_status || o.fulfillment_status === 'unfulfilled');

    // Top sellers last 7d
    const sales = new Map<number, number>();
    orders7d.forEach((o: any) => o.line_items?.forEach((li: any) => {
      sales.set(li.product_id, (sales.get(li.product_id) || 0) + li.quantity);
    }));
    const topSellers = [...sales.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id, qty]) => {
      const p = products.find((x: any) => x.id === id);
      return { title: p?.title || 'Unknown', units_sold: qty };
    });

    Object.assign(metrics, {
      revenue_24h: rev24h, revenue_7d: rev7d,
      orders_24h: orders24h.length, orders_7d: orders7d.length,
      total_products: products.length, low_stock_count: lowStock.length,
      out_of_stock_count: outStock.length, unfulfilled_orders: unfulfilled.length,
      top_sellers: topSellers,
      day_of_week: now.toLocaleDateString('en-US', { weekday: 'long' }),
    });
  } catch (e: any) {
    console.warn('[daily-briefing-cron] Store data error:', e.message);
  }
  return { metrics };
}

async function generateBriefing(storeData: any, recentBriefings: any[], shopName: string): Promise<any> {
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
  const m = storeData.metrics || {};

  if (!anthropicKey) return fallbackBriefing(m, shopName);

  const system = `You are Orion, Tandril's AI business advisor. Generate a concise daily briefing for the owner of "${shopName}".

Respond ONLY with valid JSON matching this shape:
{
  "greeting": "Good morning! Here's your [day] briefing.",
  "summary": "One sentence overview.",
  "highlights": [{"type":"win"|"alert"|"opportunity","title":"...","description":"...","action":"..."}],
  "daily_focus": "The ONE thing to do today.",
  "quick_stats": {"revenue_24h":"$XX","orders_24h":N,"trend":"up"|"down"|"stable"},
  "motivation": "One encouraging sentence."
}

Keep it tight — max 3 highlights. Reference specific numbers. Previous daily_focus topics to avoid repeating: ${recentBriefings.map((b: any) => b.content?.daily_focus || '').filter(Boolean).slice(0, 5).join(', ') || 'none'}.`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system,
        messages: [{ role: 'user', content: `Store metrics:\n${JSON.stringify(m, null, 2)}\n\nGenerate the briefing.` }],
      }),
    });
    if (!res.ok) return fallbackBriefing(m, shopName);
    const result = await res.json();
    const text = result.content[0].text;
    const match = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/({[\s\S]*})/);
    return JSON.parse(match ? match[1] : text);
  } catch {
    return fallbackBriefing(m, shopName);
  }
}

function fallbackBriefing(m: any, shopName: string): any {
  const day = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const highlights = [];
  if (m.out_of_stock_count > 0)
    highlights.push({ type: 'alert', title: 'Out of Stock', description: `${m.out_of_stock_count} products are out of stock.`, action: 'Restock today' });
  if (m.low_stock_count > 0)
    highlights.push({ type: 'alert', title: 'Low Stock', description: `${m.low_stock_count} products are running low.`, action: 'Review inventory' });
  if (m.unfulfilled_orders > 0)
    highlights.push({ type: 'alert', title: 'Unfulfilled Orders', description: `${m.unfulfilled_orders} orders need fulfillment.`, action: 'Fulfill orders' });
  return {
    greeting: `Good morning! Here's your ${day} briefing for ${shopName}.`,
    summary: `You processed ${m.orders_24h || 0} orders in the last 24 hours, generating $${(m.revenue_24h || 0).toFixed(2)} in revenue.`,
    highlights: highlights.slice(0, 3),
    daily_focus: highlights[0]?.action || 'Review your store metrics and plan your week.',
    quick_stats: { revenue_24h: `$${(m.revenue_24h || 0).toFixed(2)}`, orders_24h: m.orders_24h || 0, trend: 'stable' },
    motivation: 'Every order is a step forward. Keep going!',
  };
}

async function sendBriefingEmail(to: string, briefing: any, shopName: string) {
  const resendKey = Deno.env.get('RESEND_API_KEY');
  if (!resendKey) return;

  const highlightsHtml = (briefing.highlights || []).map((h: any) => `
    <div style="padding:12px 16px;margin-bottom:8px;border-left:3px solid ${h.type === 'win' ? '#059669' : h.type === 'alert' ? '#dc2626' : '#d97706'};background:#f8fafc">
      <strong style="color:#1e293b">${h.title}</strong><br>
      <span style="color:#475569;font-size:14px">${h.description}</span>
      ${h.action ? `<br><em style="color:#059669;font-size:13px">→ ${h.action}</em>` : ''}
    </div>`).join('');

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1e293b">
      <div style="background:#059669;padding:24px;border-radius:8px 8px 0 0">
        <h1 style="color:white;margin:0;font-size:20px">Orion Daily Briefing</h1>
        <p style="color:#d1fae5;margin:4px 0 0">${shopName}</p>
      </div>
      <div style="padding:24px;background:white;border:1px solid #e2e8f0;border-top:none">
        <p style="font-size:16px">${briefing.greeting}</p>
        <p style="color:#475569">${briefing.summary}</p>
        <div style="display:flex;gap:16px;margin:20px 0;padding:16px;background:#f1f5f9;border-radius:8px">
          <div style="text-align:center;flex:1">
            <div style="font-size:22px;font-weight:700;color:#059669">${briefing.quick_stats?.revenue_24h || '$0'}</div>
            <div style="font-size:12px;color:#64748b">Revenue (24h)</div>
          </div>
          <div style="text-align:center;flex:1">
            <div style="font-size:22px;font-weight:700;color:#3b82f6">${briefing.quick_stats?.orders_24h || 0}</div>
            <div style="font-size:12px;color:#64748b">Orders (24h)</div>
          </div>
        </div>
        ${highlightsHtml}
        <div style="margin-top:20px;padding:16px;background:#ecfdf5;border-radius:8px">
          <strong style="color:#059669">Today's focus:</strong>
          <p style="margin:4px 0 0;color:#1e293b">${briefing.daily_focus}</p>
        </div>
        <p style="margin-top:20px;color:#64748b;font-style:italic">${briefing.motivation}</p>
        <div style="margin-top:24px;text-align:center">
          <a href="https://tandril-mvp.vercel.app" style="background:#059669;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600">Open Tandril →</a>
        </div>
      </div>
    </div>`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Orion by Tandril <briefing@tandril.org>',
        to: [to],
        subject: `${briefing.quick_stats?.trend === 'up' ? '📈' : briefing.quick_stats?.trend === 'down' ? '📉' : '📊'} Your daily briefing — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        html,
      }),
    });
    if (!res.ok) console.warn('[daily-briefing-cron] Resend error:', await res.text());
  } catch (e: any) {
    console.warn('[daily-briefing-cron] Email send failed:', e.message);
  }
}
