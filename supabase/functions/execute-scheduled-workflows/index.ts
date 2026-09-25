import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// --- Inlined from _shared/encryption.ts ---
const _ENC_ALGORITHM = 'AES-GCM';
const _ENC_IV_LENGTH = 12;
async function _getEncryptionKey(): Promise<CryptoKey> {
  const secret = Deno.env.get('ENCRYPTION_SECRET');
  if (!secret) throw new Error('ENCRYPTION_SECRET environment variable not set');
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(secret), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: encoder.encode('tandril-encryption-salt-v1'), iterations: 100000, hash: 'SHA-256' },
    keyMaterial, { name: _ENC_ALGORITHM, length: 256 }, false, ['encrypt', 'decrypt']
  );
}
async function decrypt(encrypted: string): Promise<string> {
  try {
    const key = await _getEncryptionKey();
    const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
    const iv = combined.slice(0, _ENC_IV_LENGTH);
    const ciphertext = combined.slice(_ENC_IV_LENGTH);
    const decrypted = await crypto.subtle.decrypt({ name: _ENC_ALGORITHM, iv }, key, ciphertext);
    return new TextDecoder().decode(decrypted);
  } catch { throw new Error('Failed to decrypt data'); }
}
function isEncrypted(value: string): boolean {
  try { return atob(value).length > _ENC_IV_LENGTH; } catch { return false; }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

async function shopifyGraphQL(domain: string, token: string, query: string, variables: Record<string, any> = {}) {
  const response = await fetch(`https://${domain}/admin/api/2025-01/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': token,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!response.ok) throw new Error(`Shopify GraphQL request failed: ${response.status}`);
  const result = await response.json();
  if (result.errors?.length) throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
  return result.data;
}

function toShopifyGid(type: string, id: string | number): string {
  return `gid://shopify/${type}/${id}`;
}

function fromShopifyGid(gid: string): string {
  return String(gid).split('/').pop() || String(gid);
}

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
      // Manual run — fetch by ID regardless of is_active or next_run_at
      query = supabaseAdmin
        .from('ai_workflows')
        .select('*')
        .eq('id', body.workflow_id);
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
  const stepOutputs: Record<string, string> = {};

  // Substitute {{step_N_output}} placeholders in a config object
  function interpolate(cfg: any): any {
    const str = JSON.stringify(cfg);
    const replaced = str.replace(/\{\{step_(\d+)_output\}\}/g, (_: string, n: string) => {
      return stepOutputs[`step_${n}_output`] || '';
    });
    return JSON.parse(replaced);
  }

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
    const rawCfg = step.config || step;
    const cfg = interpolate(rawCfg);
    const actionType = cfg.action_type || step.action_type;
    let result: any;

    try {
      if (actionType === 'inventory_email') {
        if (!cfg.recipient) cfg.recipient = await ownerEmail(workflow.user_id, supabase);
        result = await sendInventoryEmail(workflow.user_id, cfg, supabase);
      } else if (actionType === 'photo_check_email') {
        if (!cfg.recipient) cfg.recipient = await ownerEmail(workflow.user_id, supabase);
        result = await sendPhotoCheckEmail(workflow.user_id, cfg, supabase);
      } else if (actionType === 'send_email') {
        // Auto-fill body from the most recent AI command output if body is empty
        const lastAiOutput = Object.values(stepOutputs).at(-1) as string | undefined;
        const enrichedCfg = (!cfg.email_body && lastAiOutput)
          ? { ...cfg, email_body: lastAiOutput }
          : { ...cfg };
        if (!enrichedCfg.email_recipient && !enrichedCfg.recipient) {
          enrichedCfg.email_recipient = await ownerEmail(workflow.user_id, supabase);
        }
        result = await sendGenericEmail(enrichedCfg);
      } else if (actionType === 'webhook') {
        result = await callWebhook(cfg);
      } else if (actionType === 'send_alert') {
        result = await saveAlert(workflow.user_id, cfg, supabase);
      } else if (actionType === 'run_ai_command') {
        result = await runAiCommand(workflow.user_id, cfg, serviceRoleKey);
        // Store output so later steps can reference {{step_N_output}}
        if (result?.response) {
          stepOutputs[`step_${i + 1}_output`] = result.response;
        }
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

// ── Run AI Command (chat mode) ────────────────────────────────────────────────
async function runAiCommand(userId: string, cfg: any, serviceRoleKey: string): Promise<any> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const smartApiUrl = `${supabaseUrl}/functions/v1/smart-api`;

  const res = await fetch(smartApiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({
      message: cfg.command_text,
      service_user_id: userId,
    }),
  });

  const data = await res.json();
  if (!data.success && data.error) throw new Error(data.error);
  return { action: 'run_ai_command', response: data.response || data.message || '' };
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

// "Email me" workflows are saved without an address — send to the account owner.
async function ownerEmail(userId: string, supabase: any): Promise<string | undefined> {
  const { data } = await supabase.auth.admin.getUserById(userId);
  return data?.user?.email || undefined;
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

    // Every active product, not just the first 250 (large stores have more)
    const products: any[] = [];
    let cursor: string | null = null;
    for (let page = 0; page < 20; page++) {
      let gqlData: any;
      try {
        gqlData = await shopifyGraphQL(shopDomain, token, `
          query($after: String) {
            products(first: 100, after: $after, query: "status:active") {
              pageInfo { hasNextPage endCursor }
              edges {
                node {
                  id title
                  variants(first: 100) {
                    edges { node { id sku inventoryQuantity title } }
                  }
                }
              }
            }
          }
        `, { after: cursor });
      } catch { break; }
      for (const e of gqlData.products.edges) {
        products.push({
          id: fromShopifyGid(e.node.id),
          title: e.node.title,
          variants: e.node.variants.edges.map((v: any) => ({
            id: fromShopifyGid(v.node.id),
            sku: v.node.sku,
            title: v.node.title,
            inventory_quantity: v.node.inventoryQuantity,
          })),
        });
      }
      if (!gqlData.products.pageInfo.hasNextPage) break;
      cursor = gqlData.products.pageInfo.endCursor;
    }

    for (const product of products) {
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
    body: JSON.stringify({ from: fromEmail, to: [to], subject, html: markdownToEmailHtml(body) }),
  });

  if (!emailRes.ok) {
    const err = await emailRes.json().catch(() => ({}));
    throw new Error(`Resend error: ${(err as any).message ?? emailRes.statusText}`);
  }

  return { action: 'send_email', sent_to: to };
}

// Orion's answers use light markdown (**bold**, "- " / "1. " lists); emails
// showed the raw asterisks. Convert just those, escaping everything else.
function markdownToEmailHtml(md: string): string {
  const esc = (v: string) => v.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
  const inline = (v: string) => esc(v).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(^|\W)\*(?!\s)(.+?)\*(?=\W|$)/g, '$1<i>$2</i>');
  const out: string[] = [];
  let list: 'ul' | 'ol' | null = null;
  const close = () => { if (list) { out.push(`</${list}>`); list = null; } };
  for (const raw of String(md || '').split('\n')) {
    const line = raw.trimEnd();
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    const heading = line.match(/^\s*#{1,6}\s+(.*)$/);
    if (bullet || numbered) {
      const kind = bullet ? 'ul' : 'ol';
      if (list !== kind) { close(); out.push(`<${kind} style="margin:0 0 12px;padding-left:22px;">`); list = kind; }
      out.push(`<li style="margin:0 0 6px;">${inline((bullet || numbered)![1])}</li>`);
    } else {
      close();
      if (!line.trim()) continue;
      out.push(heading ? `<h3 style="margin:16px 0 8px;font-size:16px;">${inline(heading[1])}</h3>` : `<p style="margin:0 0 12px;">${inline(line)}</p>`);
    }
  }
  close();
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.5;color:#1e293b;max-width:680px;">${out.join('\n')}</div>`;
}

// ── Photo check email ─────────────────────────────────────────────────────────
// Lists every active Shopify product and eBay listing that has no photo.
// Built in code rather than asking Orion, which only sees a summary of the
// store and can't reliably check hundreds of products.
async function sendPhotoCheckEmail(userId: string, cfg: any, supabase: any): Promise<any> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') ?? 'Tandril <noreply@tandril.org>';
  const recipient = cfg.recipient;
  if (!recipient) throw new Error('photo_check_email: recipient is required');
  if (!resendApiKey) throw new Error('RESEND_API_KEY is not configured');

  const { data: platforms } = await supabase
    .from('platforms').select('*').eq('user_id', userId)
    .in('platform_type', ['shopify', 'ebay']).eq('is_active', true);

  const missing: { store: string; title: string; detail: string }[] = [];
  let checked = 0;
  const problems: string[] = [];

  for (const platform of platforms || []) {
    try {
      if (platform.platform_type === 'shopify') {
        let token = platform.access_token;
        if (token && isEncrypted(token)) token = await decrypt(token);
        if (!token) continue;
        const shopDomain = platform.shop_domain || platform.store_url;
        let cursor: string | null = null;
        for (let page = 0; page < 20; page++) {
          const d: any = await shopifyGraphQL(shopDomain, token, `
            query($after: String) {
              products(first: 100, after: $after, query: "status:active") {
                pageInfo { hasNextPage endCursor }
                edges { node { title handle images(first: 1) { edges { node { id } } } } }
              }
            }`, { after: cursor });
          for (const e of d.products.edges) {
            checked++;
            if (!e.node.images.edges.length) missing.push({ store: platform.shop_name || shopDomain, title: e.node.title, detail: 'Shopify' });
          }
          if (!d.products.pageInfo.hasNextPage) break;
          cursor = d.products.pageInfo.endCursor;
        }
      } else {
        const { apiBase, headers } = await ebayClient(platform);
        for (let offset = 0; offset < 2000; offset += 100) {
          const res = await fetch(`${apiBase}/sell/inventory/v1/inventory_item?limit=100&offset=${offset}`, { headers });
          if (!res.ok) throw new Error(`eBay listing fetch failed: ${res.status}`);
          const d = await res.json();
          for (const item of d.inventoryItems || []) {
            // eBay keeps an inventory record after a listing ends, and a listing's
            // own photos aren't always copied onto it — so only count SKUs that
            // have a live (published) listing, and only flag those without photos.
            if ((item.product?.imageUrls || []).length) { checked++; continue; }
            const offersRes = await fetch(`${apiBase}/sell/inventory/v1/offer?sku=${encodeURIComponent(item.sku)}`, { headers });
            const offers = offersRes.ok ? ((await offersRes.json()).offers || []) : [];
            if (!offers.some((o: any) => o.status === 'PUBLISHED')) continue; // ended / inactive / never listed
            checked++;
            missing.push({ store: platform.shop_name || 'eBay', title: item.product?.title || item.sku, detail: `eBay · SKU ${item.sku}` });
          }
          if (!d.next || !(d.inventoryItems || []).length) break;
        }
      }
    } catch (e: any) {
      problems.push(`${platform.shop_name || platform.platform_type}: ${e.message}`);
    }
  }

  const esc = (v: any) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
  const rows = missing.slice(0, 300).map((m) => `<tr><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;">${esc(m.title)}</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:12px;">${esc(m.detail)}</td></tr>`).join('');
  const html = `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:680px;margin:0 auto;padding:32px 24px;background:#fff;">
    <h1 style="font-size:22px;font-weight:700;color:#1a1a2e;margin:0 0 4px;">Photo Check</h1>
    <p style="color:#64748b;font-size:14px;margin:0 0 24px;">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
    <p style="font-size:14px;color:#334155;margin:0 0 24px;">Checked <b>${checked}</b> products and listings · <b style="color:${missing.length ? '#dc2626' : '#16a34a'};">${missing.length}</b> ${missing.length === 1 ? 'has' : 'have'} no photo.</p>
    ${missing.length ? `<table style="width:100%;border-collapse:collapse;margin-bottom:24px;"><tr style="background:#f8fafc;"><th style="padding:10px 12px;text-align:left;font-size:12px;color:#64748b;">Product</th><th style="padding:10px 12px;text-align:left;font-size:12px;color:#64748b;">Where</th></tr>${rows}</table>${missing.length > 300 ? `<p style="font-size:12px;color:#64748b;">…and ${missing.length - 300} more.</p>` : ''}` : `<div style="padding:24px;background:#f0fdf4;border-radius:10px;text-align:center;"><p style="font-size:16px;color:#16a34a;font-weight:600;margin:0;">Every product has at least one photo.</p></div>`}
    ${problems.length ? `<p style="font-size:12px;color:#b45309;margin:16px 0 0;">Couldn't check: ${problems.map(esc).join('; ')}</p>` : ''}
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:32px 0;"/>
    <p style="font-size:12px;color:#94a3b8;margin:0;">Sent by Tandril · Automated Photo Check</p>
  </div>`;

  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: fromEmail, to: [recipient], subject: `Tandril Photo Check — ${missing.length} without photos`, html }),
  });
  if (!emailRes.ok) {
    const err = await emailRes.json().catch(() => ({}));
    throw new Error(`Resend error: ${(err as any).message ?? emailRes.statusText}`);
  }
  return { action: 'photo_check_email', sent_to: recipient, checked, missing_photos: missing.length, problems };
}

// eBay access token (refreshed when close to expiry) + the headers the Sell
// Inventory API requires.
async function ebayClient(platform: any): Promise<{ apiBase: string; headers: Record<string, string> }> {
  const credentials = platform.credentials ?? {};
  const metadata = platform.metadata ?? {};
  const isSandbox = metadata.environment === 'sandbox';
  const apiBase = isSandbox ? 'https://api.sandbox.ebay.com' : 'https://api.ebay.com';
  let accessToken = credentials.access_token;
  const expiresAt = metadata.token_expires_at ? new Date(metadata.token_expires_at).getTime() : 0;
  if ((!expiresAt || Date.now() > expiresAt - 5 * 60 * 1000) && credentials.refresh_token) {
    const id = Deno.env.get('EBAY_CLIENT_ID'), secret = Deno.env.get('EBAY_CLIENT_SECRET');
    if (id && secret) {
      const r = await fetch(`${apiBase}/identity/v1/oauth2/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': `Basic ${btoa(`${id}:${secret}`)}` },
        body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: credentials.refresh_token }).toString(),
      });
      if (r.ok) accessToken = (await r.json()).access_token;
    }
  }
  if (!accessToken) throw new Error('eBay login missing — reconnect eBay');
  return {
    apiBase,
    headers: {
      'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json',
      'Content-Language': 'en-US', 'Accept-Language': 'en-US',
      'X-EBAY-C-MARKETPLACE-ID': credentials.marketplace_id || 'EBAY_US',
    },
  };
}

// ── Inventory email HTML ──────────────────────────────────────────────────────
function buildInventoryEmailHtml(outOfStock: any[], lowStock: any[], threshold: number, date: Date): string {
  const esc = (v: any) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
  const td = 'padding:8px 12px;border-bottom:1px solid #f1f5f9;vertical-align:top;';
  const th = 'padding:10px 12px;text-align:left;font-size:12px;color:#64748b;font-weight:600;';

  // One row per product (a store can have hundreds of sold-out size/color
  // variants — listing each one made the email huge and hard to read).
  const byProduct = (items: any[]) => {
    const map = new Map<string, { product: string; variants: string[] }>();
    for (const i of items) {
      const key = `${i.store}|${i.product}`;
      if (!map.has(key)) map.set(key, { product: i.product, variants: [] });
      map.get(key)!.variants.push(i.variant || 'Default');
    }
    return [...map.values()].sort((x, y) => y.variants.length - x.variants.length);
  };
  const soldOut = byProduct(outOfStock);
  const MAX_ROWS = 150;
  const soldOutRows = soldOut.slice(0, MAX_ROWS).map((g) => {
    const shown = g.variants.slice(0, 8).map(esc).join(', ');
    const more = g.variants.length > 8 ? ` +${g.variants.length - 8} more` : '';
    return `<tr><td style="${td}">${esc(g.product)}</td><td style="${td}color:#dc2626;font-weight:600;">${g.variants.length}</td><td style="${td}color:#64748b;font-size:12px;">${shown}${more}</td></tr>`;
  }).join('');
  const lowRows = lowStock.slice(0, MAX_ROWS).map((i) => `<tr><td style="${td}">${esc(i.product)}${i.variant ? ` — ${esc(i.variant)}` : ''}</td><td style="${td}color:#64748b;">${esc(i.sku || '—')}</td><td style="${td}font-weight:600;color:#d97706;">${i.quantity}</td></tr>`).join('');
  const moreNote = (n: number, what: string) => n > MAX_ROWS ? `<p style="font-size:12px;color:#64748b;margin:-24px 0 32px;">…and ${n - MAX_ROWS} more ${what}.</p>` : '';

  return `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:680px;margin:0 auto;padding:32px 24px;background:#fff;">
    <h1 style="font-size:22px;font-weight:700;color:#1a1a2e;margin:0 0 4px;">Inventory Report</h1>
    <p style="color:#64748b;font-size:14px;margin:0 0 24px;">${date.toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</p>
    <p style="font-size:14px;color:#334155;margin:0 0 24px;"><b style="color:#d97706;">${lowStock.length}</b> item${lowStock.length === 1 ? '' : 's'} low on stock (${threshold} or fewer) · <b style="color:#dc2626;">${outOfStock.length}</b> size/color option${outOfStock.length === 1 ? '' : 's'} sold out across <b>${soldOut.length}</b> product${soldOut.length === 1 ? '' : 's'}</p>
    ${lowStock.length > 0 ? `<h2 style="font-size:16px;font-weight:600;color:#d97706;margin:0 0 12px;">Low stock — reorder soon</h2><table style="width:100%;border-collapse:collapse;margin-bottom:32px;"><tr style="background:#f8fafc;"><th style="${th}">Product</th><th style="${th}">SKU</th><th style="${th}">Qty</th></tr>${lowRows}</table>${moreNote(lowStock.length, 'low-stock items')}` : ''}
    ${soldOut.length > 0 ? `<h2 style="font-size:16px;font-weight:600;color:#dc2626;margin:0 0 4px;">Sold out</h2><p style="font-size:12px;color:#64748b;margin:0 0 12px;">Customers can't buy these options. For print-on-demand products (e.g. Printful), 0 usually means the supplier can't make that size/color right now.</p><table style="width:100%;border-collapse:collapse;margin-bottom:32px;"><tr style="background:#f8fafc;"><th style="${th}">Product</th><th style="${th}">Sold-out options</th><th style="${th}">Which</th></tr>${soldOutRows}</table>${moreNote(soldOut.length, 'products with sold-out options')}` : ''}
    ${outOfStock.length === 0 && lowStock.length === 0 ? `<div style="padding:24px;background:#f0fdf4;border-radius:10px;text-align:center;"><p style="font-size:16px;color:#16a34a;font-weight:600;margin:0;">All inventory levels are healthy!</p></div>` : ''}
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:32px 0;"/>
    <p style="font-size:12px;color:#94a3b8;margin:0;">Sent by Tandril · Automated Inventory Report</p>
  </div>`;
}
