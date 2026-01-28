// eBay OAuth Initiation Edge Function
// This function generates the eBay OAuth authorization URL

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

    console.log(`[eBay Auth] Initiating OAuth for user ${user.id}`);

    // Get eBay credentials from environment
    const ebayClientId = Deno.env.get('EBAY_CLIENT_ID');
    const ebayEnvironment = Deno.env.get('EBAY_ENVIRONMENT') || 'production';

    if (!ebayClientId) {
      throw new Error('eBay client ID not configured');
    }

    // Determine auth URL based on environment
    const authBaseUrl = ebayEnvironment === 'sandbox'
      ? 'https://auth.sandbox.ebay.com/oauth2/authorize'
      : 'https://auth.ebay.com/oauth2/authorize';

    // Generate state token for CSRF protection
    const state = crypto.randomUUID();

    // Store state in session for verification during callback
    const { error: stateError } = await supabaseClient
      .from('oauth_states')
      .insert({
        user_id: user.id,
        state: state,
        platform: 'ebay',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
      });

    if (stateError) {
      console.error('[eBay Auth] Error storing state:', stateError);
      throw new Error('Failed to initialize OAuth session');
    }

    // eBay OAuth scopes
    const scopes = [
      'https://api.ebay.com/oauth/api_scope',
      'https://api.ebay.com/oauth/api_scope/sell.marketing.readonly',
      'https://api.ebay.com/oauth/api_scope/sell.marketing',
      'https://api.ebay.com/oauth/api_scope/sell.inventory.readonly',
      'https://api.ebay.com/oauth/api_scope/sell.inventory',
      'https://api.ebay.com/oauth/api_scope/sell.account.readonly',
      'https://api.ebay.com/oauth/api_scope/sell.account',
      'https://api.ebay.com/oauth/api_scope/sell.fulfillment.readonly',
      'https://api.ebay.com/oauth/api_scope/sell.fulfillment'
    ].join(' ');

    // Construct callback URL
    const callbackUrl = `${Deno.env.get('APP_URL') || 'http://localhost:5173'}/ebay-callback`;

    // Build authorization URL
    const params = new URLSearchParams({
      client_id: ebayClientId,
      response_type: 'code',
      redirect_uri: callbackUrl,
      scope: scopes,
      state: state,
    });

    const authUrl = `${authBaseUrl}?${params.toString()}`;

    console.log(`[eBay Auth] Generated auth URL for user ${user.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        auth_url: authUrl,
        state: state,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[eBay Auth] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to initiate eBay authorization',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
