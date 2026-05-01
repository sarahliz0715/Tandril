// Printful Connect Edge Function
// Validates API key, stores credentials, and does initial product sync.

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

    const { api_key } = await req.json();
    if (!api_key) throw new Error('api_key is required');

    const pfHeaders = { 'Authorization': `Bearer ${api_key}`, 'Content-Type': 'application/json' };

    // Verify API key and get store info
    const storeRes = await fetch('https://api.printful.com/store', { headers: pfHeaders });
    if (!storeRes.ok) {
      throw new Error('Invalid Printful API key. Get one from your Printful Dashboard → Settings → Stores → API.');
    }
    const storeData = await storeRes.json();
    const store = storeData.result;
    const storeName = store?.name || 'Printful Store';

    console.log(`[printful-connect] Connected to store: ${storeName} (id=${store?.id}) for user ${user.id}`);

    const platformData = {
      user_id: user.id,
      platform_type: 'printful',
      name: storeName,
      credentials: { api_key },
      status: 'connected',
      is_active: true,
      last_synced_at: new Date().toISOString(),
      metadata: { store_id: store?.id, store_name: storeName },
    };

    const { data: existing } = await supabase.from('platforms').select('id')
      .eq('user_id', user.id).eq('platform_type', 'printful').maybeSingle();

    if (existing) {
      await supabase.from('platforms').update(platformData).eq('id', existing.id);
    } else {
      await supabase.from('platforms').insert(platformData);
    }

    // Initial product sync
    let synced = 0;
    try {
      const productsRes = await fetch('https://api.printful.com/sync/products?limit=100', { headers: pfHeaders });
      if (productsRes.ok) {
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
              inventory_quantity: 999, // Print-on-demand = unlimited
              status: p.status === 'synced' ? 'active' : p.status,
              vendor: 'Printful',
              product_type: 'Print-on-Demand',
            });
          } catch (_) { /* skip individual product errors */ }
        }

        if (rows.length > 0) {
          await supabase.from('products').upsert(rows, { onConflict: 'user_id,platform_type,sku' });
          synced = rows.length;
        }
      }
    } catch (syncErr: any) {
      console.warn('[printful-connect] Product sync failed (non-critical):', syncErr.message);
    }

    return new Response(
      JSON.stringify({ success: true, message: `Connected to ${storeName}. Synced ${synced} products.` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error('[printful-connect] Error:', error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
