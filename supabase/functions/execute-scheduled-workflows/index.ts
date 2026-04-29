import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { decrypt, isEncrypted } from '../_shared/encryption.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SHOPIFY_API_VERSION = '2024-01';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Supports both service-role calls (pg_cron) and user calls (manual run)
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      serviceRoleKey
    );

    let body: { workflow_id?: string } = {};
    try {
      const text = await req.text();
      if (text) body = JSON.parse(text);
    } catch { /* empty body is fine */ }

    const now = new Date();

    // If a specific workflow_id is passed, run just that one (manual run)
    let query = supabaseAdmin
      .from('ai_workflows')
      .select('*')
      .eq('is_active', true)
      .eq('trigger_type', 'schedule');

    if (body.workflow_id) {
      query = query.eq('id', body.workflow_id);
    } else {
      query = query.lte('next_run_at', now.toISOString());
    }

    const { data: workflows, error: wfError } = await query;
    if (wfError) throw new Error(`Failed to fetch workflows: ${wfError.message}`);

    if (!workflows || workflows.length === 0) {
      return new Response(
        JSON.stringify({ success: true, executed: 0, message: 'No workflows due' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[execute-scheduled-workflows] Processing ${workflows.length} workflow(s)`);

    const results = [];

    for (const workflow of workflows) {
      try {
        const actionResults = await executeWorkflowActions(workflow, supabaseAdmin);

        // Update next_run_at for automatic cron runs
        if (!body.workflow_id) {
          const nextRun = calcNextRunAt(workflow.trigger_config?.cron, now);
          await supabaseAdmin
            .from('ai_workflows')
            .update({ next_run_at: nextRun.toISOString() })
            .eq('id', workflow.id);
        }

        results.push({ workflow_id: workflow.id, name: workflow.name, success: true, actions: actionResults });
      } catch (err) {
        console.error(`[execute-scheduled-workflows] Workflow ${workflow.id} failed:`, err.message);
        results.push({ workflow_id: workflow.id, name: workflow.name, success: false, error: err.message });
      }
    }

    return new Response(
      JSON.stringify({ success: true, executed: results.filter(r => r.success).length, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[execute-scheduled-workflows] Error:', error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});

async function executeWorkflowActions(workflow: any, supabase: any): Promise<any[]> {
  const nodes: any[] = workflow.actions || workflow.nodes || [];
  const actionNodes = nodes.filter((n: any) => n.type === 'action');
  const results = [];

  for (const node of actionNodes) {
    const cfg = node.config || {};
    switch (cfg.action_type) {
      case 'inventory_email':
        results.push(await sendInventoryEmail(workflow.user_id, cfg, supabase));
        break;
      case 'send_email':
        results.push(await sendGenericEmail(cfg));
        break;
      default:
        results.push({ action: cfg.action_type, skipped: true });
    }
  }

  return results;
}

async function sendInventoryEmail(userId: string, cfg: any, supabase: any): Promise<any> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') ?? 'Tandril <noreply@tandril.org>';
  const recipient = cfg.recipient;
  const threshold = parseInt(cfg.threshold ?? '10');

  if (!recipient) throw new Error('inventory_email: recipient is required');
  if (!resendApiKey) throw new Error('RESEND_API_KEY is not configured');

  // Fetch user's active Shopify platforms
  const { data: platforms } = await supabase
    .from('platforms')
    .select('*')
    .eq('user_id', userId)
    .eq('platform_type', 'shopify')
    .eq('is_active', true);

  if (!platforms || platforms.length === 0) {
    throw new Error('No active Shopify platforms found for this user');
  }

  const allLowStock: any[] = [];
  const allOutOfStock: any[] = [];

  for (const platform of platforms) {
    let token = platform.access_token;
    if (token && isEncrypted(token)) token = await decrypt(token);
    if (!token) continue;

    const shopDomain = platform.store_url || platform.shop_domain;
    const url = `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/products.json?limit=250&status=active`;

    const res = await fetch(url, {
      headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' },
    });

    if (!res.ok) continue;

    const { products } = await res.json();

    for (const product of products ?? []) {
      for (const variant of product.variants ?? []) {
        const qty = variant.inventory_quantity ?? 0;
        const item = {
          store: shopDomain,
          product: product.title,
          variant: variant.title !== 'Default Title' ? variant.title : null,
          sku: variant.sku,
          quantity: qty,
        };
        if (qty === 0) allOutOfStock.push(item);
        else if (qty <= threshold) allLowStock.push(item);
      }
    }
  }

  const html = buildInventoryEmailHtml(allOutOfStock, allLowStock, threshold, new Date());

  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: fromEmail,
      to: [recipient],
      subject: `Tandril Inventory Report — ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`,
      html,
    }),
  });

  if (!emailRes.ok) {
    const err = await emailRes.json().catch(() => ({}));
    throw new Error(`Resend error: ${err.message ?? emailRes.statusText}`);
  }

  return { action: 'inventory_email', sent_to: recipient, out_of_stock: allOutOfStock.length, low_stock: allLowStock.length };
}

function buildInventoryEmailHtml(outOfStock: any[], lowStock: any[], threshold: number, date: Date): string {
  const fmt = (items: any[]) => items.map(i => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;">${i.product}${i.variant ? ` — ${i.variant}` : ''}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;color:#64748b;">${i.sku || '—'}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-weight:600;color:${i.quantity === 0 ? '#dc2626' : '#d97706'};">${i.quantity}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;color:#94a3b8;font-size:12px;">${i.store}</td>
    </tr>`).join('');

  const tableHeader = `<tr style="background:#f8fafc;">
    <th style="padding:10px 12px;text-align:left;font-size:12px;color:#64748b;font-weight:600;">Product</th>
    <th style="padding:10px 12px;text-align:left;font-size:12px;color:#64748b;font-weight:600;">SKU</th>
    <th style="padding:10px 12px;text-align:left;font-size:12px;color:#64748b;font-weight:600;">Qty</th>
    <th style="padding:10px 12px;text-align:left;font-size:12px;color:#64748b;font-weight:600;">Store</th>
  </tr>`;

  return `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:680px;margin:0 auto;padding:32px 24px;background:#fff;">
    <h1 style="font-size:22px;font-weight:700;color:#1a1a2e;margin:0 0 4px;">Inventory Report</h1>
    <p style="color:#64748b;font-size:14px;margin:0 0 32px;">${date.toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</p>

    <div style="display:flex;gap:16px;margin-bottom:32px;">
      <div style="flex:1;padding:16px;background:#fef2f2;border-radius:10px;border-left:4px solid #dc2626;">
        <p style="margin:0;font-size:28px;font-weight:700;color:#dc2626;">${outOfStock.length}</p>
        <p style="margin:4px 0 0;font-size:13px;color:#64748b;">Out of Stock</p>
      </div>
      <div style="flex:1;padding:16px;background:#fffbeb;border-radius:10px;border-left:4px solid #d97706;">
        <p style="margin:0;font-size:28px;font-weight:700;color:#d97706;">${lowStock.length}</p>
        <p style="margin:4px 0 0;font-size:13px;color:#64748b;">Low Stock (≤${threshold})</p>
      </div>
    </div>

    ${outOfStock.length > 0 ? `
    <h2 style="font-size:16px;font-weight:600;color:#dc2626;margin:0 0 12px;">🔴 Out of Stock</h2>
    <table style="width:100%;border-collapse:collapse;margin-bottom:32px;">${tableHeader}${fmt(outOfStock)}</table>` : ''}

    ${lowStock.length > 0 ? `
    <h2 style="font-size:16px;font-weight:600;color:#d97706;margin:0 0 12px;">🟡 Low Stock</h2>
    <table style="width:100%;border-collapse:collapse;margin-bottom:32px;">${tableHeader}${fmt(lowStock)}</table>` : ''}

    ${outOfStock.length === 0 && lowStock.length === 0 ? `
    <div style="padding:24px;background:#f0fdf4;border-radius:10px;text-align:center;">
      <p style="font-size:16px;color:#16a34a;font-weight:600;margin:0;">✅ All inventory levels are healthy!</p>
    </div>` : ''}

    <hr style="border:none;border-top:1px solid #e2e8f0;margin:32px 0;"/>
    <p style="font-size:12px;color:#94a3b8;margin:0;">Sent by Tandril · Automated Inventory Report</p>
  </div>`;
}

async function sendGenericEmail(cfg: any): Promise<any> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') ?? 'Tandril <noreply@tandril.org>';
  if (!resendApiKey) throw new Error('RESEND_API_KEY is not configured');

  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: fromEmail,
      to: [cfg.recipient],
      subject: cfg.subject || 'Tandril Workflow Notification',
      html: `<div style="font-family:sans-serif;padding:24px;">${cfg.body || ''}</div>`,
    }),
  });

  if (!emailRes.ok) {
    const err = await emailRes.json().catch(() => ({}));
    throw new Error(`Resend error: ${err.message ?? emailRes.statusText}`);
  }

  return { action: 'send_email', sent_to: cfg.recipient };
}

function calcNextRunAt(cron: string, from: Date): Date {
  const next = new Date(from);
  const parts = (cron || '0 9 * * *').trim().split(' ');
  const minute = parseInt(parts[0]);
  const hour = parseInt(parts[1]);
  const dayOfWeek = parts[4] !== '*' ? parseInt(parts[4]) : null;

  next.setSeconds(0, 0);

  if (dayOfWeek !== null) {
    const daysUntil = (dayOfWeek - from.getDay() + 7) % 7 || 7;
    next.setDate(next.getDate() + daysUntil);
    next.setHours(isNaN(hour) ? 9 : hour, isNaN(minute) ? 0 : minute, 0, 0);
  } else if (parts[1] === '*') {
    next.setMinutes(isNaN(minute) ? 0 : minute, 0, 0);
    if (next <= from) next.setHours(next.getHours() + 1);
  } else {
    next.setHours(isNaN(hour) ? 9 : hour, isNaN(minute) ? 0 : minute, 0, 0);
    if (next <= from) next.setDate(next.getDate() + 1);
  }

  return next;
}
