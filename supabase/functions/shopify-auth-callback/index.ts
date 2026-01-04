// Shopify OAuth Callback Edge Function
// This function handles the OAuth callback from Shopify, exchanges the code for an access token,
// and stores the credentials in the database

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { encrypt } from '../_shared/encryption.ts';

serve(async (req) => {
  try {
    // Parse query parameters
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const shop = url.searchParams.get('shop');
    const state = url.searchParams.get('state');
    const hmac = url.searchParams.get('hmac');

    if (!code || !shop || !state) {
      throw new Error('Missing required OAuth parameters');
    }

    // Create Supabase admin client (no user auth required for callback)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify the state parameter (if oauth_states table exists)
    const { data: oauthState, error: stateError } = await supabaseClient
      .from('oauth_states')
      .select('*')
      .eq('state', state)
      .eq('shop_domain', shop)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (stateError && !stateError.message.includes('does not exist')) {
      console.warn('[Shopify Callback] State verification failed:', stateError.message);
    }

    const userId = oauthState?.user_id;

    if (!userId) {
      throw new Error('Invalid or expired OAuth state');
    }

    // Exchange authorization code for access token
    const shopifyApiKey = Deno.env.get('SHOPIFY_API_KEY');
    const shopifyApiSecret = Deno.env.get('SHOPIFY_API_SECRET');

    if (!shopifyApiKey || !shopifyApiSecret) {
      throw new Error('Shopify API credentials not configured');
    }

    const tokenUrl = `https://${shop}/admin/oauth/access_token`;
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: shopifyApiKey,
        client_secret: shopifyApiSecret,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`Failed to exchange code for token: ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    const { access_token, scope } = tokenData;

    if (!access_token) {
      throw new Error('No access token received from Shopify');
    }

    // Get shop information from Shopify
    const shopInfoResponse = await fetch(`https://${shop}/admin/api/2024-01/shop.json`, {
      headers: {
        'X-Shopify-Access-Token': access_token,
      },
    });

    let shopName = shop;
    if (shopInfoResponse.ok) {
      const shopInfo = await shopInfoResponse.json();
      shopName = shopInfo.shop?.name || shop;
    }

    // Encrypt the access token before storing
    const encryptedToken = await encrypt(access_token);

    // Store platform credentials in database
    const { data: platform, error: platformError } = await supabaseClient
      .from('platforms')
      .upsert({
        user_id: userId,
        platform_type: 'shopify',
        shop_domain: shop,
        shop_name: shopName,
        access_token: encryptedToken,
        access_scopes: scope ? scope.split(',') : [],
        is_active: true,
        last_synced_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,shop_domain',
      })
      .select()
      .single();

    if (platformError) {
      console.error('[Shopify Callback] Error storing platform:', platformError);
      throw new Error('Failed to store platform credentials');
    }

    // Delete the used OAuth state
    if (oauthState) {
      await supabaseClient
        .from('oauth_states')
        .delete()
        .eq('state', state);
    }

    console.log(`[Shopify Callback] Successfully connected ${shop} for user ${userId}`);

    // Redirect back to the app with success
    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:5173';
    const redirectUrl = `${appUrl}/Platforms?connected=true&platform=shopify&shop=${encodeURIComponent(shop)}`;

    return new Response(null, {
      status: 302,
      headers: {
        'Location': redirectUrl,
      },
    });
  } catch (error) {
    console.error('[Shopify Callback] Error:', error);

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
