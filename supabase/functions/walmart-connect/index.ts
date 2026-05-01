// Walmart Marketplace Connect Edge Function
// Validates Walmart Client ID + Client Secret using the token endpoint.

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

    const { client_id, client_secret } = await req.json();
    if (!client_id || !client_secret) throw new Error('client_id and client_secret are required');

    // Validate credentials via Walmart token endpoint
    const credentials = btoa(`${client_id}:${client_secret}`);
    const tokenRes = await fetch('https://marketplace.walmartapis.com/v3/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'WM_SVC.NAME': 'Walmart Marketplace',
        'WM_QOS.CORRELATION_ID': crypto.randomUUID(),
        'Accept': 'application/json',
      },
      body: 'grant_type=client_credentials',
    });

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text();
      throw new Error(`Invalid Walmart credentials: ${errorText}`);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // Fetch seller profile for display name
    let sellerName = 'Walmart Marketplace';
    try {
      const profileRes = await fetch('https://marketplace.walmartapis.com/v3/settings/partnerProfile', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'WM_SEC.ACCESS_TOKEN': accessToken,
          'WM_QOS.CORRELATION_ID': crypto.randomUUID(),
          'WM_SVC.NAME': 'Tandril',
          'Accept': 'application/json',
        },
      });
      if (profileRes.ok) {
        const profile = await profileRes.json();
        sellerName = profile.partnerProfile?.partnerName || sellerName;
      }
    } catch (_) { /* ignore */ }

    const platformData = {
      user_id: user.id,
      platform_type: 'walmart',
      name: `Walmart - ${sellerName}`,
      credentials: { client_id, client_secret, access_token: accessToken },
      status: 'connected',
      is_active: true,
      last_synced_at: new Date().toISOString(),
      metadata: { seller_name: sellerName },
    };

    const { data: existing } = await supabase.from('platforms').select('id')
      .eq('user_id', user.id).eq('platform_type', 'walmart').maybeSingle();

    if (existing) {
      await supabase.from('platforms').update(platformData).eq('id', existing.id);
    } else {
      await supabase.from('platforms').insert(platformData);
    }

    console.log(`[walmart-connect] Connected for user ${user.id}`);

    // Initial product sync
    try {
      const itemsRes = await fetch('https://marketplace.walmartapis.com/v3/items?limit=100', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'WM_SEC.ACCESS_TOKEN': accessToken,
          'WM_QOS.CORRELATION_ID': crypto.randomUUID(),
          'WM_SVC.NAME': 'Tandril',
          'Accept': 'application/json',
        },
      });
      if (itemsRes.ok) {
        const itemsData = await itemsRes.json();
        const rows = (itemsData.ItemResponse || []).map((item: any) => ({
          user_id: user.id,
          platform_type: 'walmart',
          title: item.itemName || item.productName || 'Unnamed',
          sku: item.sku || `wm-${item.itemId}`,
          price: parseFloat(item.price?.amount || item.salePrice || '0'),
          inventory_quantity: item.inventoryCount ?? 0,
          status: item.publishedStatus === 'PUBLISHED' ? 'active' : 'inactive',
          vendor: item.brand || '',
          product_type: item.productType || '',
        }));
        if (rows.length > 0) {
          await supabase.from('products').upsert(rows, { onConflict: 'user_id,platform_type,sku' });
          console.log(`[walmart-connect] Synced ${rows.length} products`);
        }
      }
    } catch (syncErr: any) {
      console.warn('[walmart-connect] Product sync failed (non-critical):', syncErr.message);
    }

    return new Response(
      JSON.stringify({ success: true, name: platformData.name }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error('[walmart-connect] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
