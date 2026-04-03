// Unified OAuth Callback Edge Function
// Handles the authorization code exchange for all OAuth platforms.
// Called by the frontend /oauth-callback page after the user returns from the platform.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

const APP_URL = Deno.env.get('APP_URL') || 'http://localhost:5173';
const CALLBACK_URL = `${APP_URL}/oauth-callback`;

// ─── Token exchange per platform ──────────────────────────────────────────────

async function exchangeEtsy(code: string, codeVerifier: string): Promise<any> {
  const clientId = Deno.env.get('ETSY_CLIENT_ID');
  const clientSecret = Deno.env.get('ETSY_CLIENT_SECRET');
  if (!clientId || !clientSecret) throw new Error('Etsy credentials not configured');

  const res = await fetch('https://api.etsy.com/v3/public/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      redirect_uri: CALLBACK_URL,
      code,
      code_verifier: codeVerifier,
    }),
  });
  if (!res.ok) throw new Error(`Etsy token exchange failed: ${await res.text()}`);
  const tokens = await res.json();

  // Fetch shop info for display name
  const shopRes = await fetch('https://openapi.etsy.com/v3/application/users/me', {
    headers: { 'x-api-key': clientId, 'Authorization': `Bearer ${tokens.access_token}` },
  });
  const shopData = shopRes.ok ? await shopRes.json() : {};
  const displayName = shopData.login_name || shopData.user_id || 'Etsy Shop';

  return {
    credentials: { access_token: tokens.access_token, refresh_token: tokens.refresh_token, expires_in: tokens.expires_in },
    name: `Etsy - ${displayName}`,
    metadata: { username: displayName, token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString() },
  };
}

async function exchangeTikTok(code: string): Promise<any> {
  const clientKey = Deno.env.get('TIKTOK_CLIENT_KEY');
  const clientSecret = Deno.env.get('TIKTOK_CLIENT_SECRET');
  if (!clientKey || !clientSecret) throw new Error('TikTok credentials not configured');

  const res = await fetch('https://auth.tiktok-shops.com/api/v2/token/get', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_key: clientKey, app_secret: clientSecret, auth_code: code, grant_type: 'authorized_code' }),
  });
  if (!res.ok) throw new Error(`TikTok token exchange failed: ${await res.text()}`);
  const data = await res.json();
  if (data.code !== 0) throw new Error(`TikTok error: ${data.message}`);

  const tokens = data.data;
  const displayName = tokens.seller_name || tokens.open_id || 'TikTok Shop';

  return {
    credentials: { access_token: tokens.access_token, refresh_token: tokens.refresh_token, open_id: tokens.open_id, seller_name: tokens.seller_name },
    name: `TikTok Shop - ${displayName}`,
    metadata: { seller_name: tokens.seller_name, open_id: tokens.open_id },
  };
}

async function exchangeMeta(code: string): Promise<any> {
  const appId = Deno.env.get('META_APP_ID');
  const appSecret = Deno.env.get('META_APP_SECRET');
  if (!appId || !appSecret) throw new Error('Meta credentials not configured');

  const url = new URL('https://graph.facebook.com/v19.0/oauth/access_token');
  url.searchParams.set('client_id', appId);
  url.searchParams.set('client_secret', appSecret);
  url.searchParams.set('redirect_uri', CALLBACK_URL);
  url.searchParams.set('code', code);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Meta token exchange failed: ${await res.text()}`);
  const tokens = await res.json();
  if (tokens.error) throw new Error(tokens.error.message);

  // Fetch user info
  const userRes = await fetch(`https://graph.facebook.com/me?access_token=${tokens.access_token}&fields=name,id`);
  const userData = userRes.ok ? await userRes.json() : {};
  const displayName = userData.name || userData.id || 'Meta Account';

  return {
    credentials: { access_token: tokens.access_token, token_type: tokens.token_type },
    name: `Facebook/Meta - ${displayName}`,
    metadata: { fb_user_id: userData.id, fb_name: userData.name },
  };
}

async function exchangeAmazon(code: string): Promise<any> {
  const clientId = Deno.env.get('AMAZON_CLIENT_ID');
  const clientSecret = Deno.env.get('AMAZON_CLIENT_SECRET');
  if (!clientId || !clientSecret) throw new Error('Amazon credentials not configured');

  const res = await fetch('https://api.amazon.com/auth/o2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: CALLBACK_URL,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  if (!res.ok) throw new Error(`Amazon token exchange failed: ${await res.text()}`);
  const tokens = await res.json();

  return {
    credentials: { access_token: tokens.access_token, refresh_token: tokens.refresh_token, token_type: tokens.token_type },
    name: 'Amazon Seller',
    metadata: { token_expires_at: new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString() },
  };
}

async function exchangeSquare(code: string): Promise<any> {
  const appId = Deno.env.get('SQUARE_APPLICATION_ID');
  const appSecret = Deno.env.get('SQUARE_APPLICATION_SECRET');
  if (!appId || !appSecret) throw new Error('Square credentials not configured');

  const res = await fetch('https://connect.squareup.com/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Square-Version': '2024-01-18',
    },
    body: JSON.stringify({
      client_id: appId,
      client_secret: appSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: CALLBACK_URL,
    }),
  });
  if (!res.ok) throw new Error(`Square token exchange failed: ${await res.text()}`);
  const tokens = await res.json();
  if (tokens.type === 'error') throw new Error(tokens.detail);

  const displayName = tokens.merchant_id || 'Square Merchant';

  return {
    credentials: { access_token: tokens.access_token, refresh_token: tokens.refresh_token, merchant_id: tokens.merchant_id },
    name: `Square - ${displayName}`,
    metadata: { merchant_id: tokens.merchant_id, token_expires_at: tokens.expires_at },
  };
}

async function exchangeWix(code: string): Promise<any> {
  const clientId = Deno.env.get('WIX_CLIENT_ID');
  const clientSecret = Deno.env.get('WIX_CLIENT_SECRET');
  if (!clientId || !clientSecret) throw new Error('Wix credentials not configured');

  const res = await fetch('https://www.wixapis.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId, clientSecret, code, grantType: 'authorization_code', redirectUri: CALLBACK_URL }),
  });
  if (!res.ok) throw new Error(`Wix token exchange failed: ${await res.text()}`);
  const tokens = await res.json();

  return {
    credentials: { access_token: tokens.access_token, refresh_token: tokens.refreshToken },
    name: 'Wix Store',
    metadata: {},
  };
}

async function exchangeSquarespace(code: string): Promise<any> {
  const clientId = Deno.env.get('SQUARESPACE_CLIENT_ID');
  const clientSecret = Deno.env.get('SQUARESPACE_CLIENT_SECRET');
  if (!clientId || !clientSecret) throw new Error('Squarespace credentials not configured');

  const credentials = btoa(`${clientId}:${clientSecret}`);
  const res = await fetch('https://login.squarespace.com/api/1/login/oauth/provider/tokens', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${credentials}`,
    },
    body: JSON.stringify({ code, grant_type: 'authorization_code', redirect_uri: CALLBACK_URL }),
  });
  if (!res.ok) throw new Error(`Squarespace token exchange failed: ${await res.text()}`);
  const tokens = await res.json();

  return {
    credentials: { access_token: tokens.access_token, refresh_token: tokens.refresh_token },
    name: 'Squarespace Store',
    metadata: {},
  };
}

async function exchangeBigCommerce(code: string, context: string): Promise<any> {
  const clientId = Deno.env.get('BIGCOMMERCE_CLIENT_ID');
  const clientSecret = Deno.env.get('BIGCOMMERCE_CLIENT_SECRET');
  if (!clientId || !clientSecret) throw new Error('BigCommerce credentials not configured');
  if (!context) throw new Error('Missing BigCommerce store context');

  const res = await fetch('https://login.bigcommerce.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      scope: 'store_v2_products store_v2_orders store_v2_customers store_v2_information_read_only',
      grant_type: 'authorization_code',
      redirect_uri: CALLBACK_URL,
      context,
    }),
  });
  if (!res.ok) throw new Error(`BigCommerce token exchange failed: ${await res.text()}`);
  const tokens = await res.json();

  // context format from callback: "stores/{store_hash}"
  const storeHash = (tokens.context || context).split('/')[1] || '';
  const displayName = tokens.user?.email || tokens.user?.username || storeHash || 'BigCommerce Store';

  return {
    credentials: { access_token: tokens.access_token, store_hash: storeHash },
    name: `BigCommerce - ${displayName}`,
    store_url: storeHash ? `https://store-${storeHash}.mybigcommerce.com` : undefined,
    metadata: {
      user_id: tokens.user?.id,
      username: tokens.user?.username,
      email: tokens.user?.email,
      scope: tokens.scope,
      store_hash: storeHash,
    },
  };
}

async function exchangeFaire(code: string): Promise<any> {
  const clientId = Deno.env.get('FAIRE_CLIENT_ID');
  const clientSecret = Deno.env.get('FAIRE_CLIENT_SECRET');
  if (!clientId || !clientSecret) throw new Error('Faire credentials not configured');

  const res = await fetch('https://www.faire.com/api/v2/external/apps/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: CALLBACK_URL,
    }),
  });
  if (!res.ok) throw new Error(`Faire token exchange failed: ${await res.text()}`);
  const tokens = await res.json();

  const brandToken = tokens.brand_token || '';
  let brandName = 'Faire Brand';

  if (tokens.access_token) {
    try {
      const brandRes = await fetch('https://www.faire.com/api/v2/brands/me', {
        headers: { 'X-FAIRE-ACCESS-TOKEN': tokens.access_token },
      });
      if (brandRes.ok) {
        const brandData = await brandRes.json();
        brandName = brandData.name || brandName;
      }
    } catch (_) { /* ignore, use default name */ }
  }

  return {
    credentials: { access_token: tokens.access_token, brand_token: brandToken },
    name: `Faire - ${brandName}`,
    metadata: { brand_token: brandToken },
  };
}

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 });
  }

  try {
    const body = await req.json();
    const { code, state, context } = body;
    if (!code || !state) throw new Error('Missing code or state');

    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!serviceRoleKey) throw new Error('Service role key not configured');

    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', serviceRoleKey);

    // Verify state and get platform + user
    const { data: stateData, error: stateError } = await supabase
      .from('oauth_states')
      .select('*')
      .eq('state', state)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (stateError || !stateData) throw new Error('Invalid or expired state token');

    const { user_id: userId, platform, metadata: stateMeta } = stateData;

    // Delete used state
    await supabase.from('oauth_states').delete().eq('id', stateData.id);

    console.log(`[oauth-callback] Exchanging token for platform=${platform} user=${userId}`);

    // Exchange code for tokens
    let result: any;
    switch (platform) {
      case 'etsy':
        result = await exchangeEtsy(code, stateMeta?.code_verifier ?? '');
        break;
      case 'tiktok_shop':
        result = await exchangeTikTok(code);
        break;
      case 'meta_ads':
        result = await exchangeMeta(code);
        break;
      case 'amazon':
        result = await exchangeAmazon(code);
        break;
      case 'square':
        result = await exchangeSquare(code);
        break;
      case 'wix':
        result = await exchangeWix(code);
        break;
      case 'squarespace':
        result = await exchangeSquarespace(code);
        break;
      case 'bigcommerce':
        result = await exchangeBigCommerce(code, context ?? '');
        break;
      case 'faire':
        result = await exchangeFaire(code);
        break;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }

    const platformData: Record<string, any> = {
      user_id: userId,
      platform_type: platform,
      name: result.name,
      credentials: result.credentials,
      status: 'connected',
      is_active: true,
      last_synced_at: new Date().toISOString(),
      metadata: result.metadata ?? {},
      ...(result.store_url ? { store_url: result.store_url } : {}),
    };

    // Upsert platform record
    const { data: existing } = await supabase
      .from('platforms')
      .select('id')
      .eq('user_id', userId)
      .eq('platform_type', platform)
      .limit(1)
      .maybeSingle();

    if (existing) {
      await supabase.from('platforms').update(platformData).eq('id', existing.id);
    } else {
      await supabase.from('platforms').insert(platformData);
    }

    console.log(`[oauth-callback] Successfully connected ${platform} for user ${userId}`);

    return new Response(
      JSON.stringify({ success: true, platform, name: result.name }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error('[oauth-callback] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
