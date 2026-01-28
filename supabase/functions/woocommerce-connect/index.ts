// WooCommerce Connection Edge Function
// This function connects a WooCommerce store using REST API credentials

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
    const { store_url, consumer_key, consumer_secret } = await req.json();

    if (!store_url || !consumer_key || !consumer_secret) {
      throw new Error('Missing required parameters: store_url, consumer_key, consumer_secret');
    }

    // Normalize store URL
    let normalizedUrl = store_url.trim();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'https://' + normalizedUrl;
    }
    // Remove trailing slash
    normalizedUrl = normalizedUrl.replace(/\/$/, '');

    console.log(`[WooCommerce] Testing connection to ${normalizedUrl}`);

    // Test the connection by fetching store info
    const testUrl = `${normalizedUrl}/wp-json/wc/v3/system_status`;
    const authString = btoa(`${consumer_key}:${consumer_secret}`);

    const testResponse = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json',
      },
    });

    if (!testResponse.ok) {
      // If system_status doesn't work, try a simpler endpoint
      const simpleTestUrl = `${normalizedUrl}/wp-json/wc/v3/products?per_page=1`;
      const simpleTestResponse = await fetch(simpleTestUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${authString}`,
          'Content-Type': 'application/json',
        },
      });

      if (!simpleTestResponse.ok) {
        const errorText = await simpleTestResponse.text();
        throw new Error(`WooCommerce API test failed: ${simpleTestResponse.status} - ${errorText}`);
      }
    }

    const systemInfo = await testResponse.json().catch(() => ({}));

    console.log(`[WooCommerce] Connection successful to ${normalizedUrl}`);

    // Store the platform connection in database
    const platformData = {
      user_id: user.id,
      platform_type: 'woocommerce',
      name: systemInfo.environment?.site_title || 'WooCommerce Store',
      store_url: normalizedUrl,
      credentials: {
        consumer_key: consumer_key,
        consumer_secret: consumer_secret,
      },
      status: 'connected',
      last_synced_at: new Date().toISOString(),
      metadata: {
        wordpress_version: systemInfo.environment?.wp_version,
        woocommerce_version: systemInfo.environment?.version,
        site_url: systemInfo.environment?.home_url,
      },
    };

    // Check if platform already exists
    const { data: existingPlatform } = await supabaseClient
      .from('platforms')
      .select('id')
      .eq('user_id', user.id)
      .eq('platform_type', 'woocommerce')
      .eq('store_url', normalizedUrl)
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
      console.log(`[WooCommerce] Updated existing platform connection ${existingPlatform.id}`);
    } else {
      // Create new platform
      const { data, error } = await supabaseClient
        .from('platforms')
        .insert(platformData)
        .select()
        .single();

      if (error) throw error;
      platform = data;
      console.log(`[WooCommerce] Created new platform connection ${data.id}`);
    }

    // TODO: Trigger initial product sync in background
    // You can call another Edge Function here to start syncing products

    return new Response(
      JSON.stringify({
        success: true,
        message: 'WooCommerce store connected successfully!',
        data: {
          platform: platform,
          store_info: {
            name: platformData.name,
            url: normalizedUrl,
            wordpress_version: systemInfo.environment?.wp_version,
            woocommerce_version: systemInfo.environment?.version,
          },
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[WooCommerce] Connection error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to connect WooCommerce store',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
