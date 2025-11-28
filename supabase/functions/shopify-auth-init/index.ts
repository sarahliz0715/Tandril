// Shopify OAuth Initiation Edge Function
// This function starts the Shopify OAuth flow by generating an authorization URL

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
    const { store_name } = await req.json();

    if (!store_name) {
      throw new Error('Missing store_name parameter');
    }

    // Clean up store name (remove .myshopify.com if present)
    const cleanStoreName = store_name.replace('.myshopify.com', '').trim();
    const shopDomain = `${cleanStoreName}.myshopify.com`;

    // Shopify OAuth configuration
    const shopifyApiKey = Deno.env.get('SHOPIFY_API_KEY');
    const shopifyScopes = Deno.env.get('SHOPIFY_SCOPES') || 'read_products,write_products,read_orders,read_inventory,write_inventory';
    const redirectUri = Deno.env.get('SHOPIFY_REDIRECT_URI') || `${Deno.env.get('SUPABASE_URL')}/functions/v1/shopify-auth-callback`;

    if (!shopifyApiKey) {
      throw new Error('SHOPIFY_API_KEY environment variable not set');
    }

    // Generate a random state parameter for security
    const state = crypto.randomUUID();

    // Store the state in the database for verification in callback
    const { error: stateError } = await supabaseClient
      .from('oauth_states')
      .insert({
        state,
        user_id: user.id,
        shop_domain: shopDomain,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
      });

    if (stateError) {
      // If oauth_states table doesn't exist, we'll skip state validation
      // This is for initial setup - you should run migrations first
      console.warn('Could not store OAuth state:', stateError.message);
    }

    // Construct Shopify authorization URL
    const authUrl = new URL(`https://${shopDomain}/admin/oauth/authorize`);
    authUrl.searchParams.set('client_id', shopifyApiKey);
    authUrl.searchParams.set('scope', shopifyScopes);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('state', state);

    console.log(`[Shopify Auth Init] Generated auth URL for ${shopDomain}`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          authorization_url: authUrl.toString(),
          shop_domain: shopDomain,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[Shopify Auth Init] Error:', error);
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
