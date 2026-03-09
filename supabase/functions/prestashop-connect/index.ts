// PrestaShop Connect Edge Function
// Validates Store URL + API Key.

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

    let { store_url, api_key } = await req.json();
    if (!store_url || !api_key) throw new Error('store_url and api_key are required');

    store_url = store_url.replace(/\/$/, '');

    // PrestaShop uses HTTP Basic auth with API key as username, empty password
    const encoded = btoa(`${api_key}:`);
    const testRes = await fetch(`${store_url}/api?output_format=JSON&display=full`, {
      headers: { 'Authorization': `Basic ${encoded}` },
    });
    if (!testRes.ok) throw new Error(`Cannot connect to PrestaShop store: ${await testRes.text()}`);

    const storeDomain = store_url.replace(/https?:\/\//, '');

    const platformData = {
      user_id: user.id,
      platform_type: 'prestashop',
      name: `PrestaShop - ${storeDomain}`,
      store_url,
      credentials: { api_key },
      status: 'connected',
      is_active: true,
      last_synced_at: new Date().toISOString(),
      metadata: { store_domain: storeDomain },
    };

    const { data: existing } = await supabase.from('platforms').select('id')
      .eq('user_id', user.id).eq('platform_type', 'prestashop').maybeSingle();

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
    console.error('[prestashop-connect] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
