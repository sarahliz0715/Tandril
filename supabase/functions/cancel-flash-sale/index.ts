import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Immediately restores prices for a running flash sale.
// Called by the "End Sale Early" button in the ActiveFlashSalesPanel UI.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SHOPIFY_API_VERSION = '2024-01';
const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;

async function getEncryptionKey(): Promise<CryptoKey> {
  const secret = Deno.env.get('ENCRYPTION_SECRET');
  if (!secret) throw new Error('ENCRYPTION_SECRET not set');
  const enc = new TextEncoder();
  const km = await crypto.subtle.importKey('raw', enc.encode(secret), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: enc.encode('tandril-encryption-salt-v1'), iterations: 100000, hash: 'SHA-256' },
    km, { name: ALGORITHM, length: KEY_LENGTH }, false, ['encrypt', 'decrypt']
  );
}
async function decrypt(enc: string): Promise<string> {
  const key = await getEncryptionKey();
  const combined = Uint8Array.from(atob(enc), c => c.charCodeAt(0));
  const dec = await crypto.subtle.decrypt({ name: ALGORITHM, iv: combined.slice(0, IV_LENGTH) }, key, combined.slice(IV_LENGTH));
  return new TextDecoder().decode(dec);
}
function isEncrypted(v: string): boolean {
  try { return atob(v).length > IV_LENGTH; } catch { return false; }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let body: any = {};
    try { const t = await req.text(); if (t) body = JSON.parse(t); } catch { /**/ }

    const { user_id, flash_sale_id } = body;
    if (!user_id || !flash_sale_id) throw new Error('Missing user_id or flash_sale_id');

    // Fetch all pending restores for this flash sale, verifying ownership
    const { data: pending, error: fetchErr } = await supabase
      .from('scheduled_restores')
      .select('*')
      .eq('user_id', user_id)
      .eq('flash_sale_id', flash_sale_id)
      .is('restored_at', null);

    if (fetchErr) throw new Error(`Failed to fetch sale rows: ${fetchErr.message}`);
    if (!pending || pending.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'Sale already ended or not found.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let restored = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const row of pending) {
      try {
        await restoreRow(supabase, row);
        await supabase.from('scheduled_restores')
          .update({ restored_at: new Date().toISOString(), restore_error: null })
          .eq('id', row.id);
        restored++;
      } catch (err) {
        console.error(`[cancel-flash-sale] row ${row.id}:`, err.message);
        await supabase.from('scheduled_restores')
          .update({ restore_error: err.message })
          .eq('id', row.id);
        errors.push(`${row.platform_type}/${row.product_name || row.promotion_id}: ${err.message}`);
        failed++;
      }
    }

    const message = restored > 0
      ? `Sale ended. ${restored} price${restored !== 1 ? 's' : ''} restored immediately.${failed > 0 ? ` ${failed} failed — will retry via cron.` : ''}`
      : `Could not restore prices: ${errors.slice(0, 3).join('; ')}`;

    return new Response(JSON.stringify({ success: restored > 0, restored, failed, message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[cancel-flash-sale]', err.message);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
    });
  }
});

async function restoreRow(supabase: any, row: any): Promise<void> {
  const { data: plat } = await supabase.from('platforms').select('*').eq('id', row.platform_id).single();
  if (!plat) throw new Error(`Platform ${row.platform_id} not found`);

  switch (row.restore_type) {

    case 'price': {
      if (row.platform_type === 'shopify') {
        let token = plat.access_token;
        if (token && isEncrypted(token)) token = await decrypt(token);
        if (!token) throw new Error('Shopify token missing');
        const res = await fetch(
          `https://${plat.shop_domain}/admin/api/${SHOPIFY_API_VERSION}/variants/${row.platform_variant_id}.json`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
            body: JSON.stringify({ variant: { id: row.platform_variant_id, price: String(row.original_price), compare_at_price: null } }),
          }
        );
        if (!res.ok) throw new Error(`Shopify restore failed: ${res.status}`);
        return;
      }
      if (row.platform_type === 'etsy') {
        const tok = plat.credentials?.access_token;
        const shopId = plat.metadata?.shop_id;
        const clientId = Deno.env.get('ETSY_CLIENT_ID');
        if (!tok || !shopId || !clientId) throw new Error('Etsy credentials missing');
        const res = await fetch(
          `https://openapi.etsy.com/v3/application/shops/${shopId}/listings/${row.platform_product_id}`,
          {
            method: 'PATCH',
            headers: { 'x-api-key': clientId, Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ price: Number(row.original_price) }),
          }
        );
        if (!res.ok) throw new Error(`Etsy restore failed: ${res.status}`);
        return;
      }
      throw new Error(`Unknown platform for price restore: ${row.platform_type}`);
    }

    case 'woo_sale_price': {
      const wooToken = plat.access_token;
      const ck = wooToken ? wooToken.split(':')[0] : plat.credentials?.consumer_key;
      const cs = wooToken ? wooToken.split(':')[1] : plat.credentials?.consumer_secret;
      const wooBase = plat.store_url || plat.shop_domain;
      if (!ck || !cs || !wooBase) throw new Error('WooCommerce credentials missing');
      const res = await fetch(`${wooBase}/wp-json/wc/v3/products/${row.platform_product_id}`, {
        method: 'PUT',
        headers: { Authorization: `Basic ${btoa(`${ck}:${cs}`)}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ sale_price: '' }),
      });
      if (!res.ok) throw new Error(`WooCommerce restore failed: ${res.status}`);
      return;
    }

    case 'end_promotion': {
      const creds = plat.credentials ?? {};
      const meta = plat.metadata ?? {};
      const isSandbox = meta.environment === 'sandbox';
      const apiBase = isSandbox ? 'https://api.sandbox.ebay.com' : 'https://api.ebay.com';
      let token = creds.access_token;
      if (!meta.token_expires_at || Date.now() > new Date(meta.token_expires_at).getTime() - 5 * 60 * 1000) {
        const ck = Deno.env.get('EBAY_CLIENT_ID'), cs = Deno.env.get('EBAY_CLIENT_SECRET');
        if (ck && cs && creds.refresh_token) {
          const r = await fetch(
            isSandbox ? 'https://api.sandbox.ebay.com/identity/v1/oauth2/token' : 'https://api.ebay.com/identity/v1/oauth2/token',
            { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${btoa(`${ck}:${cs}`)}` },
              body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: creds.refresh_token }).toString() }
          );
          if (r.ok) token = (await r.json()).access_token;
        }
      }
      if (!token) throw new Error('eBay token missing');
      const res = await fetch(`${apiBase}/sell/marketing/v1/item_promotion/${row.promotion_id}/end`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!res.ok && res.status !== 404) throw new Error(`eBay end promotion failed: ${res.status}`);
      return;
    }

    default:
      throw new Error(`Unknown restore_type: ${row.restore_type}`);
  }
}
