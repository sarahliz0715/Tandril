// Ecwid Connect Edge Function
// Validates Ecwid Store ID + Access Token.

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

    const { store_id, access_token } = await req.json();
    if (!store_id || !access_token) throw new Error('store_id and access_token are required');

    // Test connection
    const profileRes = await fetch(`https://app.ecwid.com/api/v3/${store_id}/profile`, {
      headers: { 'Authorization': `Bearer ${access_token}` },
    });
    if (!profileRes.ok) throw new Error(`Invalid Ecwid credentials: ${await profileRes.text()}`);

    const profile = await profileRes.json();
    const storeName = profile.generalInfo?.storeUrl?.replace('https://', '') || `Store #${store_id}`;

    const platformData = {
      user_id: user.id,
      platform_type: 'ecwid',
      name: `Ecwid - ${storeName}`,
      store_url: profile.generalInfo?.storeUrl || '',
      credentials: { store_id: String(store_id), access_token },
      status: 'connected',
      is_active: true,
      last_synced_at: new Date().toISOString(),
      metadata: { store_name: storeName, store_id: String(store_id) },
    };

    const { data: existing } = await supabase.from('platforms').select('id')
      .eq('user_id', user.id).eq('platform_type', 'ecwid').maybeSingle();

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
    console.error('[ecwid-connect] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
