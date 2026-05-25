import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Called by pg_cron every 5 minutes.
// Fires any flash sales whose start_at has arrived.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const { data: due, error: fetchErr } = await supabase
      .from('scheduled_flash_sales')
      .select('*')
      .lte('start_at', new Date().toISOString())
      .is('started_at', null)
      .is('cancelled_at', null)
      .limit(10);

    if (fetchErr) throw new Error(fetchErr.message);
    if (!due || due.length === 0) {
      return new Response(JSON.stringify({ success: true, started: 0, message: 'No sales due.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let started = 0;
    let failed = 0;

    for (const sale of due) {
      try {
        const flashSaleId = crypto.randomUUID();
        await launchSale(supabase, sale, flashSaleId);
        await supabase.from('scheduled_flash_sales')
          .update({ started_at: new Date().toISOString(), flash_sale_id: flashSaleId, start_error: null })
          .eq('id', sale.id);
        started++;
      } catch (err) {
        console.error(`[process-scheduled-sales] sale ${sale.id}:`, err.message);
        await supabase.from('scheduled_flash_sales')
          .update({ start_error: err.message })
          .eq('id', sale.id);
        failed++;
      }
    }

    return new Response(JSON.stringify({ success: true, started, failed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[process-scheduled-sales]', err.message);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    });
  }
});

async function launchSale(supabase: any, sale: any, flashSaleId: string) {
  const { user_id, discount_percent, duration_hours, platforms: targetPlatforms, skus: targetSkus } = sale;
  const discountPct = Number(discount_percent);
  const durationHrs = Number(duration_hours);
  const restoreAt = new Date(Date.now() + durationHrs * 3600 * 1000).toISOString();
  const multiplier = 1 - discountPct / 100;
  const restoreRows: any[] = [];

  // ── Shopify ──────────────────────────────────────────────────────────────
  if (targetPlatforms.includes('shopify')) {
    try {
      const { data: plats } = await supabase.from('platforms').select('*')
        .eq('user_id', user_id).eq('platform_type', 'shopify').or('is_active.eq.true,status.eq.connected').limit(1);
      if (plats && plats.length > 0) {
        const pl = plats[0];
        let token = pl.access_token;
        if (token && isEncrypted(token)) token = await decrypt(token);
        const shopBase = `https://${pl.shop_domain}/admin/api/${SHOPIFY_API_VERSION}`;
        const hdrs = { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token };
        const res = await fetch(`${shopBase}/products.json?limit=250&fields=id,title,variants`, { headers: hdrs });
        if (res.ok) {
          const { products } = await res.json();
          const filtered = targetSkus ? products.filter((p: any) => p.variants?.some((v: any) => targetSkus.includes(v.sku))) : products;
          for (const p of filtered) {
            for (const v of (p.variants || [])) {
              if (targetSkus && !targetSkus.includes(v.sku)) continue;
              const orig = parseFloat(v.price);
              if (!orig) continue;
              const sale_price = parseFloat((orig * multiplier).toFixed(2));
              const up = await fetch(`${shopBase}/variants/${v.id}.json`, {
                method: 'PUT', headers: hdrs,
                body: JSON.stringify({ variant: { id: v.id, price: String(sale_price), compare_at_price: String(orig) } }),
              });
              if (!up.ok) continue;
              restoreRows.push({ user_id, flash_sale_id: flashSaleId, platform_id: pl.id, platform_type: 'shopify', restore_type: 'price', platform_product_id: String(p.id), platform_variant_id: String(v.id), product_name: p.title, sku: v.sku || null, original_price: orig, sale_price, restore_at: restoreAt });
            }
          }
        }
      }
    } catch (e) { console.error('[process-scheduled-sales] shopify:', e.message); }
  }

  // ── WooCommerce ──────────────────────────────────────────────────────────
  if (targetPlatforms.includes('woocommerce')) {
    try {
      const { data: plats } = await supabase.from('platforms').select('*')
        .eq('user_id', user_id).eq('platform_type', 'woocommerce').or('is_active.eq.true,status.eq.connected').limit(1);
      if (plats && plats.length > 0) {
        const pl = plats[0];
        const wooToken = pl.access_token;
        const ck = wooToken ? wooToken.split(':')[0] : pl.credentials?.consumer_key;
        const cs = wooToken ? wooToken.split(':')[1] : pl.credentials?.consumer_secret;
        const wooBase = pl.store_url || pl.shop_domain;
        if (ck && cs && wooBase) {
          const auth = `Basic ${btoa(`${ck}:${cs}`)}`;
          const res = await fetch(`${wooBase}/wp-json/wc/v3/products?per_page=100&status=publish`, { headers: { Authorization: auth } });
          if (res.ok) {
            const prods = await res.json();
            const filtered = targetSkus ? prods.filter((p: any) => targetSkus.includes(p.sku)) : prods;
            for (const p of filtered) {
              const orig = parseFloat(p.regular_price || p.price || '0');
              if (!orig) continue;
              const sale_price = parseFloat((orig * multiplier).toFixed(2));
              const up = await fetch(`${wooBase}/wp-json/wc/v3/products/${p.id}`, {
                method: 'PUT', headers: { Authorization: auth, 'Content-Type': 'application/json' },
                body: JSON.stringify({ sale_price: String(sale_price) }),
              });
              if (!up.ok) continue;
              restoreRows.push({ user_id, flash_sale_id: flashSaleId, platform_id: pl.id, platform_type: 'woocommerce', restore_type: 'woo_sale_price', platform_product_id: String(p.id), product_name: p.name, sku: p.sku || null, original_price: orig, sale_price, restore_at: restoreAt });
            }
          }
        }
      }
    } catch (e) { console.error('[process-scheduled-sales] woo:', e.message); }
  }

  // ── eBay — percentage-off promotion ──────────────────────────────────────
  if (targetPlatforms.includes('ebay')) {
    try {
      const { data: plats } = await supabase.from('platforms').select('*')
        .eq('user_id', user_id).eq('platform_type', 'ebay').or('is_active.eq.true,status.eq.connected').limit(1);
      if (plats && plats.length > 0) {
        const pl = plats[0];
        const creds = pl.credentials ?? {};
        const meta = pl.metadata ?? {};
        const isSandbox = meta.environment === 'sandbox';
        const apiBase = isSandbox ? 'https://api.sandbox.ebay.com' : 'https://api.ebay.com';
        let token = creds.access_token;
        const ck = Deno.env.get('EBAY_CLIENT_ID'), cs = Deno.env.get('EBAY_CLIENT_SECRET');
        if (ck && cs && creds.refresh_token) {
          const r = await fetch(isSandbox ? 'https://api.sandbox.ebay.com/identity/v1/oauth2/token' : 'https://api.ebay.com/identity/v1/oauth2/token',
            { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${btoa(`${ck}:${cs}`)}` },
              body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: creds.refresh_token }).toString() });
          if (r.ok) token = (await r.json()).access_token;
        }
        if (token) {
          const marketplaceId = creds.marketplace_id || 'EBAY_US';
          const promoRes = await fetch(`${apiBase}/sell/marketing/v1/item_promotion`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Content-Language': 'en-US', 'X-EBAY-C-MARKETPLACE-ID': marketplaceId },
            body: JSON.stringify({
              name: `Flash Sale ${discountPct}% Off`, promotionType: 'MARKDOWN_SALE', marketplaceId,
              discountRules: [{ discountBenefit: { percentageOffItem: String(discountPct) }, selectionMode: 'INVENTORY_CATALOG' }],
              startDate: new Date().toISOString().replace(/\.\d{3}Z$/, '.000Z'),
              endDate: restoreAt.replace(/\.\d{3}Z$/, '.000Z'),
              status: 'ACTIVE',
            }),
          });
          if (promoRes.ok || promoRes.status === 201) {
            const promoData = await promoRes.json();
            const promoId = promoData.promotionId || promoData.promotion_id;
            if (promoId) {
              restoreRows.push({ user_id, flash_sale_id: flashSaleId, platform_id: pl.id, platform_type: 'ebay', restore_type: 'end_promotion', promotion_id: promoId, restore_at: restoreAt });
            }
          }
        }
      }
    } catch (e) { console.error('[process-scheduled-sales] ebay:', e.message); }
  }

  // ── Etsy ──────────────────────────────────────────────────────────────────
  if (targetPlatforms.includes('etsy')) {
    try {
      const { data: plats } = await supabase.from('platforms').select('*')
        .eq('user_id', user_id).eq('platform_type', 'etsy').or('is_active.eq.true,status.eq.connected').limit(1);
      if (plats && plats.length > 0) {
        const pl = plats[0];
        const tok = pl.credentials?.access_token;
        const shopId = pl.metadata?.shop_id;
        const clientId = Deno.env.get('ETSY_CLIENT_ID');
        if (tok && shopId && clientId) {
          const etsyHdrs = { 'x-api-key': clientId, Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' };
          const listRes = await fetch(`https://openapi.etsy.com/v3/application/shops/${shopId}/listings?limit=100&state=active`, { headers: etsyHdrs });
          if (listRes.ok) {
            const listData = await listRes.json();
            const listings = targetSkus
              ? (listData.results || []).filter((l: any) => (l.sku ?? []).some((s: string) => targetSkus.includes(s)))
              : (listData.results || []);
            for (const l of listings) {
              const orig = parseFloat(l.price?.amount) / (l.price?.divisor || 100);
              if (!orig) continue;
              const sale_price = parseFloat((orig * multiplier).toFixed(2));
              const patchRes = await fetch(`https://openapi.etsy.com/v3/application/shops/${shopId}/listings/${l.listing_id}`,
                { method: 'PATCH', headers: etsyHdrs, body: JSON.stringify({ price: sale_price }) });
              if (!patchRes.ok) continue;
              restoreRows.push({ user_id, flash_sale_id: flashSaleId, platform_id: pl.id, platform_type: 'etsy', restore_type: 'price', platform_product_id: String(l.listing_id), product_name: l.title, sku: l.sku?.[0] || null, original_price: orig, sale_price, restore_at: restoreAt });
            }
          }
        }
      }
    } catch (e) { console.error('[process-scheduled-sales] etsy:', e.message); }
  }

  if (restoreRows.length > 0) {
    const { error } = await supabase.from('scheduled_restores').insert(restoreRows);
    if (error) console.error('[process-scheduled-sales] restore insert:', error.message);
  }
}
