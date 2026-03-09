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
