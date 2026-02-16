// eBay OAuth Callback Handler Edge Function
// This function handles the OAuth callback from eBay, exchanges code for tokens, and stores the connection

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 });
  }

  try {
    console.log('[eBay Callback] Request received:', req.method, req.url);

    // Parse query parameters from eBay redirect (GET request)
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    console.log('[eBay Callback] Parameters:', { code: code?.substring(0, 10) + '...', state: state?.substring(0, 10) + '...' });

    if (!code || !state) {
      throw new Error('Missing authorization code or state');
    }

    // Create Supabase admin client (no user auth required for callback)
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!serviceRoleKey) {
      console.error('[eBay Callback] SUPABASE_SERVICE_ROLE_KEY not configured!');
      throw new Error('Server configuration error - missing service role key');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      serviceRoleKey
    );

    // Verify state token to get user_id
    const { data: stateData, error: stateError } = await supabaseClient
      .from('oauth_states')
      .select('*')
      .eq('state', state)
      .eq('platform', 'ebay')
      .gt('expires_at', new Date().toISOString())
      .single();

    if (stateError || !stateData) {
      console.warn('[eBay Callback] State verification failed:', stateError?.message);
      throw new Error('Invalid or expired state token');
    }

    const userId = stateData.user_id;
    console.log(`[eBay Callback] Processing callback for user ${userId}`);

    // Delete used state token
    await supabaseClient
      .from('oauth_states')
      .delete()
      .eq('id', stateData.id);

    // Get eBay credentials from environment
    const ebayClientId = Deno.env.get('EBAY_CLIENT_ID');
    const ebayClientSecret = Deno.env.get('EBAY_CLIENT_SECRET');
    const ebayEnvironment = Deno.env.get('EBAY_ENVIRONMENT') || 'production';

    if (!ebayClientId || !ebayClientSecret) {
      throw new Error('eBay credentials not configured');
    }

    // Determine token URL based on environment
    const tokenUrl = ebayEnvironment === 'sandbox'
      ? 'https://api.sandbox.ebay.com/identity/v1/oauth2/token'
      : 'https://api.ebay.com/identity/v1/oauth2/token';

    const apiBaseUrl = ebayEnvironment === 'sandbox'
      ? 'https://api.sandbox.ebay.com'
      : 'https://api.ebay.com';

    // Construct callback URL
    const callbackUrl = `${Deno.env.get('APP_URL') || 'http://localhost:5173'}/ebay-callback`;

    // Exchange authorization code for access token
    const credentials = btoa(`${ebayClientId}:${ebayClientSecret}`);

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: callbackUrl,
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`Token exchange failed: ${tokenResponse.status} - ${errorText}`);
    }

    const tokenData = await tokenResponse.json();

    console.log(`[eBay Callback] Token exchange successful`);

    // Test the connection by fetching user info
    const userInfoResponse = await fetch(`${apiBaseUrl}/commerce/identity/v1/user/`, {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    let ebayUsername = 'eBay User';
    if (userInfoResponse.ok) {
      const userInfo = await userInfoResponse.json();
      ebayUsername = userInfo.username || userInfo.userId || 'eBay User';
    }

    console.log(`[eBay Callback] Connected to eBay user: ${ebayUsername}`);

    // Store the platform connection in database
    const platformData = {
      user_id: userId,
      platform_type: 'ebay',
      name: `eBay - ${ebayUsername}`,
      store_url: ebayEnvironment === 'sandbox'
        ? `https://www.sandbox.ebay.com/usr/${ebayUsername}`
        : `https://www.ebay.com/usr/${ebayUsername}`,
      credentials: {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_in: tokenData.expires_in,
        token_type: tokenData.token_type,
        marketplace_id: 'EBAY_US', // Default, can be configured
      },
      status: 'connected',
      last_synced_at: new Date().toISOString(),
      metadata: {
        username: ebayUsername,
        environment: ebayEnvironment,
        scopes: tokenData.scope,
        token_expires_at: new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString(),
      },
    };

    // Check if platform already exists
    const { data: existingPlatform } = await supabaseClient
      .from('platforms')
      .select('id')
      .eq('user_id', userId)
      .eq('platform_type', 'ebay')
      .eq('metadata->>username', ebayUsername)
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
      console.log(`[eBay Callback] Updated existing platform ${existingPlatform.id}`);
    } else {
      // Create new platform
      const { data, error } = await supabaseClient
        .from('platforms')
        .insert(platformData)
        .select()
        .single();

      if (error) throw error;
      platform = data;
      console.log(`[eBay Callback] Created new platform ${data.id}`);
    }

    console.log(`[eBay Callback] Successfully connected eBay account for user ${userId}`);

    // Redirect back to the app with success
    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:5173';
    const redirectUrl = `${appUrl}/Platforms?connected=true&platform=ebay&username=${encodeURIComponent(ebayUsername)}`;

    return new Response(null, {
      status: 302,
      headers: {
        'Location': redirectUrl,
      },
    });
  } catch (error) {
    console.error('[eBay Callback] Error:', error);

    // Redirect back to app with error
    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:5173';
    const redirectUrl = `${appUrl}/Platforms?error=${encodeURIComponent(error.message)}`;

    return new Response(null, {
      status: 302,
      headers: {
        'Location': redirectUrl,
      },
    });
  }
});
