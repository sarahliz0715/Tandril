// Magento / Adobe Commerce Connect Edge Function
// Validates Store URL + Integration Access Token.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
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

    let { store_url, access_token } = await req.json();
    if (!store_url || !access_token) throw new Error('store_url and access_token are required');

    // Normalize URL
    store_url = store_url.replace(/\/$/, '');

    // Test connection via store info endpoint
    const infoRes = await fetch(`${store_url}/rest/V1/store/storeConfigs`, {
      headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
    });
    if (!infoRes.ok) throw new Error(`Cannot connect to Magento store: ${await infoRes.text()}`);

    const storeConfigs = await infoRes.json();
    const storeName = storeConfigs?.[0]?.base_url?.replace(/https?:\/\//, '').replace(/\/$/, '') || store_url;

    const platformData = {
      user_id: user.id,
      platform_type: 'magento',
      name: `Magento - ${storeName}`,
      store_url,
      credentials: { access_token },
      status: 'connected',
      is_active: true,
      last_synced_at: new Date().toISOString(),
      metadata: { store_name: storeName },
    };

    const { data: existing } = await supabase.from('platforms').select('id')
      .eq('user_id', user.id).eq('platform_type', 'magento').maybeSingle();

    if (existing) {
      await supabase.from('platforms').update(platformData).eq('id', existing.id);
    } else {
      await supabase.from('platforms').insert(platformData);
    }

    // Initial product sync
    try {
      const productsRes = await fetch(
        `${store_url}/rest/V1/products?searchCriteria[pageSize]=100&searchCriteria[currentPage]=1&searchCriteria[filter_groups][0][filters][0][field]=status&searchCriteria[filter_groups][0][filters][0][value]=1`,
        { headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' } }
      );
      if (productsRes.ok) {
        const productsData = await productsRes.json();
        const rows = (productsData.items || []).map((p: any) => {
          const stockItem = p.extension_attributes?.stock_item;
          return {
            user_id: user.id,
            platform_type: 'magento',
            title: p.name || 'Unnamed',
            sku: p.sku || `magento-${p.id}`,
            price: parseFloat(p.price || '0'),
            inventory_quantity: stockItem?.qty ?? 0,
            status: p.status === 1 ? 'active' : 'inactive',
            vendor: '',
            product_type: p.type_id || '',
          };
        });
        if (rows.length > 0) {
          await supabase.from('products').upsert(rows, { onConflict: 'user_id,platform_type,sku' });
        }
        console.log(`[magento-connect] Synced ${rows.length} products`);
      }
    } catch (syncErr: any) {
      console.warn('[magento-connect] Product sync failed (non-critical):', syncErr.message);
    }

    return new Response(
      JSON.stringify({ success: true, name: platformData.name }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error('[magento-connect] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
