// Wish Connect Edge Function
// Validates Wish Merchant API access token.

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

    const { access_token } = await req.json();
    if (!access_token) throw new Error('access_token is required');

    // Test via merchant profile endpoint
    const testRes = await fetch(`https://merchant.wish.com/api/v3/merchant/profile?access_token=${encodeURIComponent(access_token)}`);
    if (!testRes.ok) throw new Error(`Invalid Wish access token: ${await testRes.text()}`);

    const data = await testRes.json();
    if (data.code !== 0) throw new Error(data.message || 'Wish API error');

    const merchantName = data.data?.merchant_name || data.data?.name || 'Wish Merchant';

    const platformData = {
      user_id: user.id,
      platform_type: 'wish',
      name: `Wish - ${merchantName}`,
      credentials: { access_token },
      status: 'connected',
      is_active: true,
      last_synced_at: new Date().toISOString(),
      metadata: { merchant_name: merchantName },
    };

    const { data: existing } = await supabase.from('platforms').select('id')
      .eq('user_id', user.id).eq('platform_type', 'wish').maybeSingle();

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
    console.error('[wish-connect] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
