import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Called by pg_cron daily at 08:00 UTC.
// Generates an AI business digest for every user with at least one connected platform.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!anthropicKey) {
    return new Response(JSON.stringify({ success: false, error: 'ANTHROPIC_API_KEY not set' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    });
  }

  try {
    // Get all distinct user_ids with at least one connected platform
    const { data: userRows, error: usersErr } = await supabase
      .from('platforms')
      .select('user_id')
      .or('is_active.eq.true,status.eq.connected');
    if (usersErr) throw new Error(usersErr.message);

    const userIds = [...new Set((userRows ?? []).map(r => r.user_id))];
    let generated = 0;
    let failed = 0;

    for (const userId of userIds) {
      try {
        await generateDigestForUser(supabase, anthropicKey, userId);
        generated++;
      } catch (err) {
        console.error(`[generate-orion-digest] user ${userId}:`, err.message);
        failed++;
      }
    }

    return new Response(JSON.stringify({ success: true, generated, failed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[generate-orion-digest]', err.message);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    });
  }
});

async function generateDigestForUser(supabase: any, anthropicKey: string, userId: string) {
  const now = new Date();
  const since24h = new Date(now.getTime() - 86400000).toISOString();
  const since48h = new Date(now.getTime() - 2 * 86400000).toISOString();
  const since30d = new Date(now.getTime() - 30 * 86400000).toISOString();

  // ── Gather metrics in parallel ─────────────────────────────────────────────
  const [
    ordersRes,
    prevOrdersRes,
    inventoryRes,
    platformsRes,
    activeRestoresRes,
    scheduledSalesRes,
  ] = await Promise.all([
    supabase.from('orders').select('total_price, line_items, status, order_date')
      .eq('user_id', userId).gte('order_date', since24h),
    supabase.from('orders').select('total_price, line_items, order_date')
      .eq('user_id', userId).gte('order_date', since48h).lt('order_date', since24h),
    supabase.from('inventory').select('product_name, sku, quantity, platform_type')
      .eq('user_id', userId).order('quantity', { ascending: true }).limit(50),
    supabase.from('platforms').select('platform_type, status, is_active, shop_domain')
      .eq('user_id', userId),
    supabase.from('scheduled_restores').select('flash_sale_id, platform_type, restore_at')
      .eq('user_id', userId).is('restored_at', null).gt('restore_at', now.toISOString()),
    supabase.from('scheduled_flash_sales').select('discount_percent, start_at, duration_hours, platforms')
      .eq('user_id', userId).is('started_at', null).is('cancelled_at', null)
      .gt('start_at', now.toISOString()).order('start_at', { ascending: true }).limit(5),
  ]);

  // ── Revenue ────────────────────────────────────────────────────────────────
  const orders24h = ordersRes.data ?? [];
  const orders24hPrev = prevOrdersRes.data ?? [];
  const revenue24h = orders24h.reduce((s: number, o: any) => s + (parseFloat(o.total_price) || 0), 0);
  const revenue24hPrev = orders24hPrev.reduce((s: number, o: any) => s + (parseFloat(o.total_price) || 0), 0);
  const revenueChange = revenue24hPrev > 0
    ? Math.round(((revenue24h - revenue24hPrev) / revenue24hPrev) * 100)
    : null;

  // ── Top products by revenue (last 24h) ────────────────────────────────────
  const skuRevMap: Record<string, { name: string; revenue: number; units: number }> = {};
  for (const o of orders24h) {
    for (const item of (o.line_items || [])) {
      const key = item.sku || item.title || 'Unknown';
      if (!skuRevMap[key]) skuRevMap[key] = { name: item.title || key, revenue: 0, units: 0 };
      skuRevMap[key].revenue += (parseFloat(item.price || '0') * (item.quantity || 1));
      skuRevMap[key].units += (item.quantity || 1);
    }
  }
  const topProducts = Object.entries(skuRevMap)
    .sort(([, a], [, b]) => b.revenue - a.revenue)
    .slice(0, 5)
    .map(([sku, d]) => ({ sku, name: d.name, revenue: d.revenue, units: d.units }));

  // ── Low stock (bottom 10 by quantity, only items with stock tracked) ───────
  const inventory = inventoryRes.data ?? [];
  const lowStock = inventory
    .filter((i: any) => i.quantity !== null && i.quantity >= 0)
    .slice(0, 10)
    .map((i: any) => ({ sku: i.sku, name: i.product_name, qty: i.quantity, platform: i.platform_type }));

  // ── Velocity for low stock items (30d) ────────────────────────────────────
  const { data: velOrders } = await supabase.from('orders').select('line_items, order_date')
    .eq('user_id', userId).gte('order_date', since30d);
  const velMap: Record<string, number> = {};
  for (const o of (velOrders ?? [])) {
    for (const item of (o.line_items || [])) {
      const key = item.sku || item.title || '';
      if (key) velMap[key] = (velMap[key] || 0) + (item.quantity || 1);
    }
  }
  const lowStockWithVelocity = lowStock.map((i: any) => ({
    ...i,
    daily_velocity: parseFloat(((velMap[i.sku] || 0) / 30).toFixed(2)),
    days_left: i.qty > 0 && velMap[i.sku] ? parseFloat((i.qty / (velMap[i.sku] / 30)).toFixed(1)) : null,
  }));

  // ── Active flash sales ─────────────────────────────────────────────────────
  const activeRestores = activeRestoresRes.data ?? [];
  const activeSaleCount = new Set(activeRestores.map((r: any) => r.flash_sale_id)).size;

  // ── Connected platforms ────────────────────────────────────────────────────
  const platforms = (platformsRes.data ?? [])
    .filter((p: any) => p.is_active || p.status === 'connected')
    .map((p: any) => p.platform_type);

  const snapshot = {
    generated_at: now.toISOString(),
    revenue_24h: revenue24h,
    revenue_24h_prev: revenue24hPrev,
    revenue_change_pct: revenueChange,
    orders_24h: orders24h.length,
    orders_24h_prev: orders24hPrev.length,
    top_products: topProducts,
    low_stock: lowStockWithVelocity,
    active_flash_sales: activeSaleCount,
    scheduled_sales: (scheduledSalesRes.data ?? []).length,
    connected_platforms: platforms,
  };

  // ── Call Claude for the digest ─────────────────────────────────────────────
  const systemPrompt = `You are Orion, an AI business advisor for e-commerce sellers.
Generate a concise daily digest (150–250 words) in a friendly, direct tone.
Use emoji sparingly — one per section at most. No bullet-point overload.
Structure: lead with revenue/orders, flag anything urgent (stockouts, stalled sales),
highlight top performer, close with one specific actionable recommendation.
Never say "Based on the data" or "I noticed". Just tell them what's happening and what to do.`;

  const userMessage = `Generate today's business digest for this seller.

Revenue last 24h: $${revenue24h.toFixed(2)}${revenueChange !== null ? ` (${revenueChange > 0 ? '+' : ''}${revenueChange}% vs yesterday)` : ''}
Orders last 24h: ${orders24h.length} (yesterday: ${orders24hPrev.length})
Connected platforms: ${platforms.join(', ') || 'none'}
Active flash sales: ${activeSaleCount}
Upcoming scheduled sales: ${(scheduledSalesRes.data ?? []).length}

Top sellers today:
${topProducts.length > 0 ? topProducts.map(p => `• ${p.name}: ${p.units} units · $${p.revenue.toFixed(2)}`).join('\n') : '• No sales data yet'}

Lowest stock items:
${lowStockWithVelocity.slice(0, 5).length > 0
  ? lowStockWithVelocity.slice(0, 5).map((i: any) =>
      `• ${i.name} (${i.sku}): ${i.qty} units${i.days_left !== null ? ` · ~${i.days_left}d left at current velocity` : ''}`
    ).join('\n')
  : '• No inventory data'}

Write the daily digest now:`;

  const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!claudeRes.ok) {
    const errText = await claudeRes.text();
    throw new Error(`Claude API error: ${errText.slice(0, 200)}`);
  }
  const claudeData = await claudeRes.json();
  const digestText = claudeData.content[0].text.trim();

  // Insert digest
  const { error: insErr } = await supabase.from('orion_digests').insert({
    user_id: userId,
    period: 'daily',
    digest_text: digestText,
    data_snapshot: snapshot,
  });
  if (insErr) throw new Error(`Insert failed: ${insErr.message}`);
}
