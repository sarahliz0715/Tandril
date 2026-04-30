// TeePublic Connect Edge Function
// TeePublic has no public API, so this stores the username and marks the
// account as connected. Sellers can view their TeePublic stats manually
// via their dashboard; Tandril tracks the connection for reference.

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

    const { store_username } = await req.json();
    if (!store_username?.trim()) throw new Error('store_username is required');

    const username = store_username.trim().toLowerCase().replace(/^@/, '');
    const storeUrl = `https://www.teepublic.com/user/${username}`;

    // Verify the profile page exists
    const checkRes = await fetch(storeUrl, { method: 'HEAD', redirect: 'follow' });
    if (!checkRes.ok && checkRes.status !== 405) {
      throw new Error(`Could not find TeePublic store "${username}". Check your username and try again.`);
    }

    const platformData = {
      user_id: user.id,
      platform_type: 'teepublic',
      name: `TeePublic - ${username}`,
      store_url: storeUrl,
      credentials: { store_username: username },
      status: 'connected',
      is_active: true,
      last_synced_at: new Date().toISOString(),
      metadata: { store_username: username, note: 'No public API — manual sync only' },
    };

    const { data: existing } = await supabase.from('platforms').select('id')
      .eq('user_id', user.id).eq('platform_type', 'teepublic').maybeSingle();

    if (existing) {
      await supabase.from('platforms').update(platformData).eq('id', existing.id);
    } else {
      await supabase.from('platforms').insert(platformData);
    }

    console.log(`[teepublic-connect] Connected ${username} for user ${user.id}`);

    return new Response(
      JSON.stringify({ success: true, message: `TeePublic store "${username}" connected.` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error('[teepublic-connect] Error:', error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
