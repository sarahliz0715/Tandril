// Faire Wholesale Connection Edge Function
// This function connects a Faire brand account using API credentials

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
    const { api_token, brand_token } = await req.json();

    if (!api_token || !brand_token) {
      throw new Error('Missing required parameters: api_token, brand_token');
    }

    // Clean up tokens
    const cleanApiToken = api_token.trim();
    const cleanBrandToken = brand_token.trim();

    console.log(`[Faire] Testing connection for brand ${cleanBrandToken}`);

    // Test the connection by fetching brand info
    const brandInfoUrl = 'https://www.faire.com/api/v2/brands/me';

    const testResponse = await fetch(brandInfoUrl, {
      method: 'GET',
      headers: {
        'X-FAIRE-ACCESS-TOKEN': cleanApiToken,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
    });

    if (!testResponse.ok) {
      const errorText = await testResponse.text();
      throw new Error(`Faire API test failed: ${testResponse.status} - ${errorText}`);
    }

    const brandInfo = await testResponse.json();

    console.log(`[Faire] Connection successful to ${brandInfo.name || 'brand'}`);

    // Get product count for metadata
    let productCount = 0;
    try {
      const productsUrl = 'https://www.faire.com/api/v2/products?limit=1';
      const productsResponse = await fetch(productsUrl, {
        method: 'GET',
        headers: {
          'X-FAIRE-ACCESS-TOKEN': cleanApiToken,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
      });

      if (productsResponse.ok) {
        const productsData = await productsResponse.json();
        productCount = productsData.total || 0;
      }
    } catch (e) {
      console.warn('[Faire] Could not fetch product count:', e.message);
    }

    // Store the platform connection in database
    const platformData = {
      user_id: user.id,
      platform_type: 'faire',
      name: brandInfo.name || `Faire Brand ${cleanBrandToken}`,
      store_url: brandInfo.site_url || `https://www.faire.com/brand/${cleanBrandToken}`,
      credentials: {
        api_token: cleanApiToken,
        brand_token: cleanBrandToken,
      },
      status: 'connected',
      last_synced_at: new Date().toISOString(),
      metadata: {
        brand_id: brandInfo.token,
        brand_token: brandInfo.token,
        email: brandInfo.email,
        state: brandInfo.state, // ACTIVE, PENDING, etc.
        description: brandInfo.short_description,
        minimum_order_dollars: brandInfo.minimum_order_dollars,
        shipping_policy: brandInfo.shipping_policy,
        return_policy: brandInfo.return_policy,
        product_count: productCount,
        created_at: brandInfo.created_at,
        updated_at: brandInfo.updated_at,
      },
    };

    // Check if platform already exists
    const { data: existingPlatform } = await supabaseClient
      .from('platforms')
      .select('id')
      .eq('user_id', user.id)
      .eq('platform_type', 'faire')
      .eq('credentials->>brand_token', cleanBrandToken)
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
      console.log(`[Faire] Updated existing platform connection ${existingPlatform.id}`);
    } else {
      // Create new platform
      const { data, error } = await supabaseClient
        .from('platforms')
        .insert(platformData)
        .select()
        .single();

      if (error) throw error;
      platform = data;
      console.log(`[Faire] Created new platform connection ${data.id}`);
    }

    // TODO: Trigger initial product sync in background
    // You can call another Edge Function here to start syncing products

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Faire brand connected successfully!',
        data: {
          platform: platform,
          store_info: {
            name: platformData.name,
            url: platformData.store_url,
            brand_token: cleanBrandToken,
            state: brandInfo.state,
            email: brandInfo.email,
            minimum_order: brandInfo.minimum_order_dollars,
            product_count: productCount,
          },
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[Faire] Connection error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to connect Faire brand',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
