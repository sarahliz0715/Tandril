// BigCommerce Connection Edge Function
// This function connects a BigCommerce store using API credentials

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify the user is authenticated
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Get request body
    const { store_hash, access_token } = await req.json();

    if (!store_hash || !access_token) {
      throw new Error('Missing required parameters: store_hash, access_token');
    }

    // Clean up store hash (remove any spaces or special chars)
    const cleanStoreHash = store_hash.trim();

    console.log(`[BigCommerce] Testing connection to store ${cleanStoreHash}`);

    // Test the connection by fetching store info
    const storeInfoUrl = `https://api.bigcommerce.com/stores/${cleanStoreHash}/v2/store`;

    const testResponse = await fetch(storeInfoUrl, {
      method: 'GET',
      headers: {
        'X-Auth-Token': access_token,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
    });

    if (!testResponse.ok) {
      const errorText = await testResponse.text();
      throw new Error(`BigCommerce API test failed: ${testResponse.status} - ${errorText}`);
    }

    const storeInfo = await testResponse.json();

    console.log(`[BigCommerce] Connection successful to ${storeInfo.name || 'store'}`);

    // Get additional store features via V3 API
    const featuresUrl = `https://api.bigcommerce.com/stores/${cleanStoreHash}/v3/store/features`;
    let features = {};

    try {
      const featuresResponse = await fetch(featuresUrl, {
        method: 'GET',
        headers: {
          'X-Auth-Token': access_token,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
      });

      if (featuresResponse.ok) {
        const featuresData = await featuresResponse.json();
        features = featuresData.data || {};
      }
    } catch (e) {
      console.warn('[BigCommerce] Could not fetch features:', e.message);
    }

    // Store the platform connection in database
    const platformData = {
      user_id: user.id,
      platform_type: 'bigcommerce',
      name: storeInfo.name || `BigCommerce Store ${cleanStoreHash}`,
      store_url: storeInfo.domain || storeInfo.secure_url || `https://store-${cleanStoreHash}.mybigcommerce.com`,
      credentials: {
        store_hash: cleanStoreHash,
        access_token: access_token,
      },
      status: 'connected',
      last_synced_at: new Date().toISOString(),
      metadata: {
        store_id: storeInfo.id,
        phone: storeInfo.phone,
        admin_email: storeInfo.admin_email,
        country: storeInfo.country,
        currency: storeInfo.currency,
        timezone: storeInfo.timezone?.name,
        language: storeInfo.language,
        weight_units: storeInfo.weight_units,
        dimension_units: storeInfo.dimension_units,
        plan_name: storeInfo.plan_name,
        plan_level: storeInfo.plan_level,
        industry: storeInfo.industry,
        features: features,
      },
    };

    // Check if platform already exists
    const { data: existingPlatform } = await supabaseClient
      .from('platforms')
      .select('id')
      .eq('user_id', user.id)
      .eq('platform_type', 'bigcommerce')
      .eq('store_url', platformData.store_url)
      .single();

    let platform;
    if (existingPlatform) {
      // Update existing platform
      const { data, error } = await supabaseClient
        .from('platforms')
        .update(platformData)
        .eq('id', existingPlatform.id)
        .select()
        .single();

      if (error) throw error;
      platform = data;
      console.log(`[BigCommerce] Updated existing platform connection ${existingPlatform.id}`);
    } else {
      // Create new platform
      const { data, error } = await supabaseClient
        .from('platforms')
        .insert(platformData)
        .select()
        .single();

      if (error) throw error;
      platform = data;
      console.log(`[BigCommerce] Created new platform connection ${data.id}`);
    }

    // TODO: Trigger initial product sync in background
    // You can call another Edge Function here to start syncing products

    return new Response(
      JSON.stringify({
        success: true,
        message: 'BigCommerce store connected successfully!',
        data: {
          platform: platform,
          store_info: {
            name: platformData.name,
            url: platformData.store_url,
            store_hash: cleanStoreHash,
            currency: storeInfo.currency,
            plan: storeInfo.plan_name,
            country: storeInfo.country,
          },
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[BigCommerce] Connection error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to connect BigCommerce store',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
