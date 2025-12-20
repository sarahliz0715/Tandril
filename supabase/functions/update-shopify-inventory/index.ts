// Update Shopify Inventory Edge Function
// Updates inventory levels for Shopify product variants

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SHOPIFY_API_VERSION = '2024-01';

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
    const { platform_id, inventory_item_id, location_id, quantity } = await req.json();

    if (!platform_id || !inventory_item_id || !location_id || quantity === undefined) {
      throw new Error('Missing required parameters: platform_id, inventory_item_id, location_id, quantity');
    }

    console.log(`[Update Inventory] Updating inventory for item ${inventory_item_id} to ${quantity}`);

    // Get platform credentials
    const { data: platform, error: platformError } = await supabaseClient
      .from('platforms')
      .select('*')
      .eq('id', platform_id)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (platformError || !platform) {
      throw new Error('Platform not found or not accessible');
    }

    // Update inventory level via Shopify API
    const response = await shopifyRequest(
      platform,
      'inventory_levels/set.json',
      'POST',
      {
        inventory_item_id: parseInt(inventory_item_id),
        location_id: parseInt(location_id),
        available: parseInt(quantity),
      }
    );

    console.log(`[Update Inventory] Successfully updated to ${quantity}`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          inventory_level: response.inventory_level,
          message: `Inventory updated to ${quantity}`,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[Update Inventory] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

async function shopifyRequest(
  platform: any,
  endpoint: string,
  method: string = 'GET',
  body?: any
): Promise<any> {
  const url = `https://${platform.shop_domain}/admin/api/${SHOPIFY_API_VERSION}/${endpoint}`;

  const options: RequestInit = {
    method,
    headers: {
      'X-Shopify-Access-Token': platform.access_token,
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Shopify API error (${response.status}): ${errorText}`);
  }

  return await response.json();
}
