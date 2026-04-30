// Printful Sync Edge Function
// Re-syncs products from a connected Printful store.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('Unauthorized');

    const { data: platform } = await supabase.from('platforms').select('credentials')
      .eq('user_id', user.id).eq('platform_type', 'printful').eq('is_active', true).maybeSingle();

    if (!platform?.credentials?.api_key) {
      throw new Error('No connected Printful store found. Connect one first.');
    }

    const api_key = platform.credentials.api_key;
    const pfHeaders = { 'Authorization': `Bearer ${api_key}`, 'Content-Type': 'application/json' };

    const productsRes = await fetch('https://api.printful.com/sync/products?limit=100', { headers: pfHeaders });
    if (!productsRes.ok) throw new Error('Failed to fetch products from Printful. Your API key may have expired.');

    const productsData = await productsRes.json();
    const products = productsData.result || [];

    const rows: any[] = [];
    for (const p of products.slice(0, 50)) {
      try {
        const detailRes = await fetch(`https://api.printful.com/sync/products/${p.id}`, { headers: pfHeaders });
        if (!detailRes.ok) continue;
        const detail = await detailRes.json();
        const variants = detail.result?.sync_variants || [];
        if (variants.length === 0) continue;

        rows.push({
          user_id: user.id,
          platform_type: 'printful',
          title: p.name || 'Unnamed',
          sku: variants[0].sku || `pf-${p.id}`,
          price: parseFloat(variants[0].retail_price || '0'),
          inventory_quantity: 999,
          status: p.status === 'synced' ? 'active' : p.status,
          vendor: 'Printful',
          product_type: 'Print-on-Demand',
        });
      } catch (_) { /* skip individual product errors */ }
    }

    if (rows.length > 0) {
      await supabase.from('products').upsert(rows, { onConflict: 'user_id,platform_type,sku' });
    }

    await supabase.from('platforms').update({ last_synced_at: new Date().toISOString() })
      .eq('user_id', user.id).eq('platform_type', 'printful');

    return new Response(
      JSON.stringify({ success: true, message: `Synced ${rows.length} products from Printful.` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error('[printful-sync] Error:', error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
