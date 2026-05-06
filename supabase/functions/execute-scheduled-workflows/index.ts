import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { decrypt, isEncrypted } from '../_shared/encryption.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SHOPIFY_API_VERSION = '2024-01';

// ── Duration helper ──────────────────────────────────────────────────────────
function durationToMs(duration: number, unit: string): number {
  const d = Math.max(1, duration);
  switch (unit) {
    case 'seconds': return d * 1000;
    case 'minutes': return d * 60 * 1000;
    case 'hours':   return d * 60 * 60 * 1000;
    case 'days':    return d * 24 * 60 * 60 * 1000;
    default:        return d * 60 * 60 * 1000; // default hours
  }
}

// ── Cron next-run helper ─────────────────────────────────────────────────────
function calcNextRunAt(cron: string, from: Date = new Date()): Date {
  const parts = cron.trim().split(' ');
  const minute = parseInt(parts[0]);
  const hour = parseInt(parts[1]);
  const dayOfWeek = parts[4] !== '*' ? parseInt(parts[4]) : null;
  const next = new Date(from);
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      serviceRoleKey
    );

    let body: { workflow_id?: string } = {};
    try {
      const text = await req.text();
      if (text) body = JSON.parse(text);
    } catch { /* empty body */ }

    const now = new Date();

    let query = supabaseAdmin
      .from('ai_workflows')
      .select('*')
      .eq('is_active', true)
      .lte('next_run_at', now.toISOString());

    if (body.workflow_id) {
      // Manual run — fetch by ID regardless of next_run_at
      query = supabaseAdmin
        .from('ai_workflows')
        .select('*')
        .eq('id', body.workflow_id)
        .eq('is_active', true);
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
        const { paused, stepResults } = await executeWorkflowSteps(
          workflow,
          supabaseAdmin,
          serviceRoleKey,
          now
        );

        if (!paused) {
          // All steps done — update last_run_at + reset state
          const isRecurring = workflow.trigger_type === 'schedule' && workflow.trigger_config?.cron;
          await supabaseAdmin.from('ai_workflows').update({
            last_run_at: now.toISOString(),
            run_count: (workflow.run_count || 0) + 1,
            success_count: (workflow.success_count || 0) + 1,
            current_step: 0,
            status: isRecurring ? 'active' : 'completed',
            // Only reset next_run_at for recurring scheduled workflows
            ...(isRecurring && !body.workflow_id
              ? { next_run_at: calcNextRunAt(workflow.trigger_config.cron, now).toISOString() }
              : {}),
            // One-time workflows deactivate when complete
            ...(!isRecurring ? { is_active: false } : {}),
          }).eq('id', workflow.id);

          // Log to ai_commands
          await supabaseAdmin.from('ai_commands').insert({
            user_id: workflow.user_id,
            command_text: `Workflow "${workflow.name}" completed (${stepResults.length} step${stepResults.length !== 1 ? 's' : ''})`,
            status: 'completed',
            executed_at: now.toISOString(),
            execution_results: { workflow: true, workflow_id: workflow.id, steps: stepResults },
            source: 'workflow',
          });
        }

        results.push({ workflow_id: workflow.id, name: workflow.name, success: true, paused, steps: stepResults });
      } catch (err: any) {
        console.error(`[execute-scheduled-workflows] Workflow ${workflow.id} failed:`, err.message);
        await supabaseAdmin.from('ai_workflows').update({
          failure_count: (workflow.failure_count || 0) + 1,
          status: 'failed',
          last_run_at: now.toISOString(),
        }).eq('id', workflow.id);

        await supabaseAdmin.from('ai_commands').insert({
          user_id: workflow.user_id,
          command_text: `Workflow "${workflow.name}" failed: ${err.message}`,
          status: 'failed',
          executed_at: now.toISOString(),
          execution_results: { workflow: true, workflow_id: workflow.id, error: err.message },
          source: 'workflow',
        });

        results.push({ workflow_id: workflow.id, name: workflow.name, success: false, error: err.message });
      }
    }

    return new Response(
      JSON.stringify({ success: true, executed: results.filter(r => r.success).length, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[execute-scheduled-workflows] Error:', error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});

// ── Main step executor ────────────────────────────────────────────────────────
async function executeWorkflowSteps(
  workflow: any,
  supabase: any,
  serviceRoleKey: string,
  now: Date
): Promise<{ paused: boolean; stepResults: any[] }> {
  const steps: any[] = workflow.actions || [];
  const startStep = workflow.current_step || 0;
  const stepResults: any[] = [];

  for (let i = startStep; i < steps.length; i++) {
    const step = steps[i];
    const stepType = step.type || 'action';

    // ── Wait step ──────────────────────────────────────────────────────────
    if (stepType === 'wait') {
      const duration = step.duration || 1;
      const unit = step.unit || 'hours';
      const resumeAt = new Date(now.getTime() + durationToMs(duration, unit));

      await supabase.from('ai_workflows').update({
        current_step: i + 1,
        next_run_at: resumeAt.toISOString(),
        status: 'waiting',
      }).eq('id', workflow.id);

      stepResults.push({ step: i, type: 'wait', paused_until: resumeAt.toISOString() });
      console.log(`[execute-scheduled-workflows] Workflow ${workflow.id} paused at step ${i}, resumes ${resumeAt.toISOString()}`);
      return { paused: true, stepResults };
    }

    // ── Action step ────────────────────────────────────────────────────────
    const cfg = step.config || step;
    const actionType = cfg.action_type || step.action_type;
    let result: any;

    try {
      if (actionType === 'inventory_email') {
        result = await sendInventoryEmail(workflow.user_id, cfg, supabase);
      } else if (actionType === 'send_email') {
        result = await sendGenericEmail(cfg);
      } else if (actionType === 'webhook') {
        result = await callWebhook(cfg);
      } else if (actionType === 'send_alert') {
        result = await saveAlert(workflow.user_id, cfg, supabase);
      } else {
        // Everything else proxies to smart-api (update_price, update_inventory, etc.)
        result = await proxyToSmartApi(workflow.user_id, cfg, serviceRoleKey);
      }
      stepResults.push({ step: i, action_type: actionType, success: true, result });
    } catch (stepErr: any) {
      console.error(`[execute-scheduled-workflows] Step ${i} (${actionType}) failed:`, stepErr.message);
      stepResults.push({ step: i, action_type: actionType, success: false, error: stepErr.message });
      // Continue to next step — don't abort the whole workflow on one step failure
    }
  }

  return { paused: false, stepResults };
}

// ── smart-api proxy ───────────────────────────────────────────────────────────
async function proxyToSmartApi(userId: string, cfg: any, serviceRoleKey: string): Promise<any> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const smartApiUrl = `${supabaseUrl}/functions/v1/smart-api`;

  const { action_type, ...params } = cfg;
  const execute_action = { type: action_type, ...params };

  const res = await fetch(smartApiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Use service role key; smart-api will trust service_user_id when this key is presented
      'Authorization': `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({ execute_action, service_user_id: userId }),
  });

  const data = await res.json();
  if (!data.success && data.error) {
    throw new Error(data.error);
  }
  return data;
}

// ── Webhook ───────────────────────────────────────────────────────────────────
async function callWebhook(cfg: any): Promise<any> {
  const url = cfg.url;
  if (!url) throw new Error('webhook: url is required');

  const method = cfg.method || 'POST';
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(cfg.headers || {}) };
  const fetchOpts: RequestInit = { method, headers };
  if (method !== 'GET' && cfg.payload) {
    fetchOpts.body = JSON.stringify(cfg.payload);
  }

  const res = await fetch(url, fetchOpts);
  if (!res.ok) throw new Error(`Webhook returned ${res.status}: ${await res.text()}`);
  return { status: res.status, url };
}

// ── In-app alert ──────────────────────────────────────────────────────────────
async function saveAlert(userId: string, cfg: any, supabase: any): Promise<any> {
  const { error } = await supabase.from('alerts').insert({
    user_id: userId,
    title: cfg.alert_title || 'Workflow Alert',
    message: cfg.alert_message || '',
    priority: cfg.alert_priority || 'medium',
    source: 'workflow',
    is_read: false,
  });
  if (error) throw new Error(`Could not save alert: ${error.message}`);
  return { saved: true };
}

// ── Inventory email ───────────────────────────────────────────────────────────
async function sendInventoryEmail(userId: string, cfg: any, supabase: any): Promise<any> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') ?? 'Tandril <noreply@tandril.org>';
  const recipient = cfg.recipient;
  const threshold = parseInt(cfg.threshold ?? '10');

  if (!recipient) throw new Error('inventory_email: recipient is required');
  if (!resendApiKey) throw new Error('RESEND_API_KEY is not configured');

  const { data: platforms } = await supabase
    .from('platforms')
    .select('*')
    .eq('user_id', userId)
    .eq('platform_type', 'shopify')
    .eq('is_active', true);

  if (!platforms || platforms.length === 0) {
    throw new Error('No active Shopify platforms found');
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
    throw new Error(`Resend error: ${(err as any).message ?? emailRes.statusText}`);
  }

  return { action: 'inventory_email', sent_to: recipient, out_of_stock: allOutOfStock.length, low_stock: allLowStock.length };
}

// ── Generic email ─────────────────────────────────────────────────────────────
async function sendGenericEmail(cfg: any): Promise<any> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') ?? 'Tandril <noreply@tandril.org>';
  if (!resendApiKey) throw new Error('RESEND_API_KEY is not configured');

  // Accept both old format (recipient/subject/body) and new builder format (email_recipient/email_subject/email_body)
  const to = cfg.email_recipient || cfg.recipient;
  const subject = cfg.email_subject || cfg.subject || '(no subject)';
  const body = cfg.email_body || cfg.body || '';

  if (!to) throw new Error('send_email: recipient is required');

  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: fromEmail, to: [to], subject, html: `<p>${body.replace(/\n/g, '<br>')}</p>` }),
  });

  if (!emailRes.ok) {
    const err = await emailRes.json().catch(() => ({}));
    throw new Error(`Resend error: ${(err as any).message ?? emailRes.statusText}`);
  }

  return { action: 'send_email', sent_to: to };
}

// ── Inventory email HTML ──────────────────────────────────────────────────────
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
    ${outOfStock.length > 0 ? `<h2 style="font-size:16px;font-weight:600;color:#dc2626;margin:0 0 12px;">Out of Stock</h2><table style="width:100%;border-collapse:collapse;margin-bottom:32px;">${tableHeader}${fmt(outOfStock)}</table>` : ''}
    ${lowStock.length > 0 ? `<h2 style="font-size:16px;font-weight:600;color:#d97706;margin:0 0 12px;">Low Stock</h2><table style="width:100%;border-collapse:collapse;margin-bottom:32px;">${tableHeader}${fmt(lowStock)}</table>` : ''}
    ${outOfStock.length === 0 && lowStock.length === 0 ? `<div style="padding:24px;background:#f0fdf4;border-radius:10px;text-align:center;"><p style="font-size:16px;color:#16a34a;font-weight:600;margin:0;">All inventory levels are healthy!</p></div>` : ''}
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:32px 0;"/>
    <p style="font-size:12px;color:#94a3b8;margin:0;">Sent by Tandril · Automated Inventory Report</p>
  </div>`;
}
