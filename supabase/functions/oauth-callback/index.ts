// Unified OAuth Callback Edge Function
// Handles the authorization code exchange for all OAuth platforms.
// Called by the frontend /oauth-callback page after the user returns from the platform.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { signSpApiRequest, refreshLwaToken } from '../_shared/awsSigV4.ts';

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

  // Fetch user info for display name and user_id
  const userRes = await fetch('https://openapi.etsy.com/v3/application/users/me', {
    headers: { 'x-api-key': clientId, 'Authorization': `Bearer ${tokens.access_token}` },
  });
  const userData = userRes.ok ? await userRes.json() : {};
  const displayName = userData.login_name || String(userData.user_id) || 'Etsy Shop';
  const etsyUserId = userData.user_id;

  // Fetch shop_id — needed for listings API
  let shopId: number | null = null;
  let shopName = displayName;
  if (etsyUserId) {
    try {
      const shopListRes = await fetch(
        `https://openapi.etsy.com/v3/application/users/${etsyUserId}/shops`,
        { headers: { 'x-api-key': clientId, 'Authorization': `Bearer ${tokens.access_token}` } }
      );
      if (shopListRes.ok) {
        const shopListData = await shopListRes.json();
        // API returns a paginated result or a single shop object
        const firstShop = shopListData.results?.[0] ?? shopListData;
        shopId = firstShop.shop_id ?? firstShop.id ?? null;
        shopName = firstShop.shop_name ?? firstShop.name ?? displayName;
      }
    } catch (e: any) {
      console.warn('[Etsy] Could not fetch shop info:', e.message);
    }
  }

  return {
    credentials: {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: tokens.expires_in,
    },
    name: `Etsy - ${shopName}`,
    metadata: {
      username: displayName,
      shop_id: shopId,
      shop_name: shopName,
      etsy_user_id: etsyUserId,
      token_expires_at: new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString(),
    },
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
    metadata: {
      seller_name: tokens.seller_name,
      open_id: tokens.open_id,
      token_expires_at: new Date(Date.now() + (tokens.access_token_expire_in || 172800) * 1000).toISOString(),
    },
  };
}

async function exchangeTikTokAds(code: string): Promise<any> {
  const appId = Deno.env.get('TIKTOK_ADS_APP_ID');
  const appSecret = Deno.env.get('TIKTOK_ADS_APP_SECRET');
  if (!appId || !appSecret) throw new Error('TikTok Ads credentials not configured');

  const res = await fetch('https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: appId, secret: appSecret, auth_code: code }),
  });
  if (!res.ok) throw new Error(`TikTok Ads token exchange failed: ${await res.text()}`);
  const data = await res.json();
  if (data.code !== 0) throw new Error(`TikTok Ads error: ${data.message}`);

  const tokens = data.data;
  const advertiserIds: string[] = tokens.advertiser_ids || [];
  const displayName = advertiserIds[0] || tokens.open_id || 'TikTok Ads';

  return {
    credentials: { access_token: tokens.access_token, open_id: tokens.open_id },
    name: `TikTok Ads - ${displayName}`,
    metadata: {
      advertiser_ids: advertiserIds,
      open_id: tokens.open_id,
      scope: tokens.scope || [],
    },
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

async function exchangeInstagram(code: string): Promise<any> {
  const appId = Deno.env.get('META_APP_ID');
  const appSecret = Deno.env.get('META_APP_SECRET');
  if (!appId || !appSecret) throw new Error('Meta credentials not configured (META_APP_ID / META_APP_SECRET)');

  // Exchange auth code for user access token
  const tokenUrl = new URL('https://graph.facebook.com/v19.0/oauth/access_token');
  tokenUrl.searchParams.set('client_id', appId);
  tokenUrl.searchParams.set('client_secret', appSecret);
  tokenUrl.searchParams.set('redirect_uri', CALLBACK_URL);
  tokenUrl.searchParams.set('code', code);

  const tokenRes = await fetch(tokenUrl.toString());
  if (!tokenRes.ok) throw new Error(`Instagram token exchange failed: ${await tokenRes.text()}`);
  const tokens = await tokenRes.json();
  if (tokens.error) throw new Error(tokens.error.message);

  const accessToken: string = tokens.access_token;

  // Fetch Facebook Pages, each with their linked Instagram Business Account
  let igAccountId = '';
  let igUsername = '';
  let igFollowers = 0;
  let displayName = 'Instagram Shop';

  try {
    const pagesRes = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,instagram_business_account{id,username,name,followers_count}&access_token=${accessToken}`
    );
    if (pagesRes.ok) {
      const pagesData = await pagesRes.json();
      // Find first page that has an Instagram Business Account
      for (const page of (pagesData.data || [])) {
        if (page.instagram_business_account) {
          igAccountId = page.instagram_business_account.id || '';
          igUsername = page.instagram_business_account.username || '';
          igFollowers = page.instagram_business_account.followers_count || 0;
          displayName = igUsername || page.instagram_business_account.name || page.name || displayName;
          break;
        }
      }
    }
  } catch (_) { /* non-fatal */ }

  // Fetch Commerce Catalogs owned by this account
  let catalogId = '';
  let catalogName = '';
  try {
    const catalogRes = await fetch(
      `https://graph.facebook.com/v19.0/me/owned_product_catalogs?fields=id,name&access_token=${accessToken}`
    );
    if (catalogRes.ok) {
      const catalogData = await catalogRes.json();
      const first = catalogData.data?.[0];
      if (first) { catalogId = first.id || ''; catalogName = first.name || ''; }
    }
  } catch (_) { /* non-fatal */ }

  return {
    credentials: { access_token: accessToken },
    name: igUsername ? `Instagram - @${igUsername}` : `Instagram Shop`,
    metadata: {
      ig_account_id: igAccountId,
      ig_username: igUsername,
      ig_followers: igFollowers,
      catalog_id: catalogId,
      catalog_name: catalogName,
    },
  };
}

async function exchangeAmazon(code: string): Promise<any> {
  const clientId = Deno.env.get('AMAZON_CLIENT_ID');
  const clientSecret = Deno.env.get('AMAZON_CLIENT_SECRET');
  const awsKeyId = Deno.env.get('AMAZON_AWS_ACCESS_KEY_ID');
  const awsSecret = Deno.env.get('AMAZON_AWS_SECRET_ACCESS_KEY');
  if (!clientId || !clientSecret) throw new Error('Amazon credentials not configured');

  // Exchange auth code for LWA tokens
  const tokenRes = await fetch('https://api.amazon.com/auth/o2/token', {
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
  if (!tokenRes.ok) throw new Error(`Amazon token exchange failed: ${await tokenRes.text()}`);
  const tokens = await tokenRes.json();

  const accessToken = tokens.access_token;
  const expiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString();

  // Fetch seller_id and marketplace IDs via SP-API (requires SigV4 + LWA token)
  let sellerId = '';
  let marketplaceId = 'ATVPDKIKX0DER'; // default US
  let marketplaceName = 'Amazon US';
  let region = 'us-east-1';
  let apiBase = 'https://sellingpartnerapi-na.amazon.com';
  let sellerName = 'Amazon Seller';

  if (awsKeyId && awsSecret) {
    try {
      const spUrl = new URL(`${apiBase}/sellers/v1/marketplaceParticipations`);
      const signedHdrs = await signSpApiRequest(
        'GET', spUrl, '', region, awsKeyId, awsSecret,
        { 'x-amz-access-token': accessToken }
      );
      const sellerRes = await fetch(spUrl.toString(), { headers: signedHdrs });
      if (sellerRes.ok) {
        const sellerData = await sellerRes.json();
        const participations = sellerData.payload || [];
        if (participations.length > 0) {
          sellerId = participations[0].seller?.sellerId || '';
          // Prefer the US marketplace if present
          const usPart = participations.find((p: any) => p.marketplace?.id === 'ATVPDKIKX0DER') || participations[0];
          marketplaceId = usPart.marketplace?.id || marketplaceId;
          marketplaceName = usPart.marketplace?.name || marketplaceName;
          sellerName = `Amazon - ${sellerId || 'Seller'}`;
        }
      }
    } catch (e: any) {
      console.warn('[Amazon] Could not fetch seller info (non-critical):', e.message);
    }
  }

  return {
    credentials: {
      access_token: accessToken,
      refresh_token: tokens.refresh_token,
      token_type: tokens.token_type,
    },
    name: sellerName,
    metadata: {
      seller_id: sellerId,
      marketplace_id: marketplaceId,
      marketplace_name: marketplaceName,
      region,
      api_base: apiBase,
      token_expires_at: expiresAt,
    },
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
      case 'tiktok_ads':
        result = await exchangeTikTokAds(code);
        break;
      case 'meta_ads':
        result = await exchangeMeta(code);
        break;
      case 'instagram':
        result = await exchangeInstagram(code);
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

    // Post-connect: sync Etsy listings into the products table
    if (platform === 'etsy') {
      const shopId = result.metadata?.shop_id;
      const accessToken = result.credentials?.access_token;
      const clientId = Deno.env.get('ETSY_CLIENT_ID');
      if (shopId && accessToken && clientId) {
        try {
          const listingsRes = await fetch(
            `https://openapi.etsy.com/v3/application/shops/${shopId}/listings/active?limit=100`,
            { headers: { 'x-api-key': clientId, 'Authorization': `Bearer ${accessToken}` } }
          );
          if (listingsRes.ok) {
            const listingsData = await listingsRes.json();
            const rows = (listingsData.results || []).map((l: any) => ({
              user_id: userId,
              platform_type: 'etsy',
              title: l.title || 'Unnamed',
              sku: l.sku?.[0] || `etsy-${l.listing_id}`,
              price: l.price?.amount != null ? l.price.amount / (l.price.divisor || 100) : 0,
              inventory_quantity: l.quantity || 0,
              status: l.state === 'active' ? 'active' : 'draft',
              vendor: '',
              product_type: l.taxonomy_path?.[0] || '',
            }));
            if (rows.length > 0) {
              await supabase.from('products').upsert(rows, {
                onConflict: 'user_id,platform_type,sku',
                ignoreDuplicates: false,
              });
              console.log(`[oauth-callback] Synced ${rows.length} Etsy listings for user ${userId}`);
            }
          }
        } catch (syncErr: any) {
          console.warn('[oauth-callback] Etsy listing sync failed (non-critical):', syncErr.message);
        }
      }
    }

    // Post-connect: resolve TikTok shop_id and sync product listings
    if (platform === 'tiktok_shop') {
      const accessToken = result.credentials?.access_token;
      if (accessToken) {
        try {
          const ttHeaders = { 'x-tts-access-token': accessToken, 'Content-Type': 'application/json' };
          const ttBase = 'https://open-api.tiktok-shops.com';

          // Resolve shop_id
          const shopsRes = await fetch(`${ttBase}/authorization/202309/shops`, { headers: ttHeaders });
          if (shopsRes.ok) {
            const shopsData = await shopsRes.json();
            const shopId = shopsData?.data?.shops?.[0]?.id;
            if (shopId) {
              // Cache shop_id into metadata
              await supabase.from('platforms')
                .update({ metadata: { ...result.metadata, shop_id: shopId } })
                .eq('user_id', userId)
                .eq('platform_type', 'tiktok_shop');

              // Sync active product listings into the products table
              const searchRes = await fetch(`${ttBase}/product/202309/products/search?shop_id=${encodeURIComponent(shopId)}`, {
                method: 'POST',
                headers: ttHeaders,
                body: JSON.stringify({ page_size: 100 }),
              });
              if (searchRes.ok) {
                const searchData = await searchRes.json();
                if (searchData.code === 0) {
                  const rows = (searchData.data?.products || []).map((p: any) => {
                    const firstSku = p.skus?.[0];
                    return {
                      user_id: userId,
                      platform_type: 'tiktok_shop',
                      title: p.title || 'Unnamed',
                      sku: firstSku?.seller_sku || `tiktok-${p.id}`,
                      price: parseFloat(firstSku?.price?.original_price || '0'),
                      inventory_quantity: (firstSku?.inventory || []).reduce((s: number, i: any) => s + (i.quantity || 0), 0),
                      status: p.status === 'ACTIVATE' ? 'active' : 'inactive',
                      vendor: '',
                      product_type: '',
                    };
                  });
                  if (rows.length > 0) {
                    await supabase.from('products').upsert(rows, {
                      onConflict: 'user_id,platform_type,sku',
                      ignoreDuplicates: false,
                    });
                    console.log(`[oauth-callback] Synced ${rows.length} TikTok Shop products for user ${userId}`);
                  }
                }
              }
            }
          }
        } catch (syncErr: any) {
          console.warn('[oauth-callback] TikTok Shop sync failed (non-critical):', syncErr.message);
        }
      }
    }

    // Post-connect: sync Amazon FBA inventory into the products table
    if (platform === 'amazon') {
      const accessToken = result.credentials?.access_token;
      const sellerId = result.metadata?.seller_id;
      const marketplaceId = result.metadata?.marketplace_id || 'ATVPDKIKX0DER';
      const awsKeyId = Deno.env.get('AMAZON_AWS_ACCESS_KEY_ID');
      const awsSecret = Deno.env.get('AMAZON_AWS_SECRET_ACCESS_KEY');
      const apiBase = result.metadata?.api_base || 'https://sellingpartnerapi-na.amazon.com';
      const region = result.metadata?.region || 'us-east-1';

      if (accessToken && awsKeyId && awsSecret) {
        try {
          const invUrl = new URL(`${apiBase}/fba/inventory/v1/summaries`);
          invUrl.searchParams.set('details', 'true');
          invUrl.searchParams.set('granularityType', 'Marketplace');
          invUrl.searchParams.set('granularityId', marketplaceId);
          invUrl.searchParams.set('marketplaceIds', marketplaceId);

          const signedHdrs = await signSpApiRequest(
            'GET', invUrl, '', region, awsKeyId, awsSecret,
            { 'x-amz-access-token': accessToken }
          );
          const invRes = await fetch(invUrl.toString(), { headers: signedHdrs });
          if (invRes.ok) {
            const invData = await invRes.json();
            const summaries = invData.payload?.inventorySummaries || [];
            if (summaries.length > 0) {
              const rows = summaries.map((s: any) => ({
                user_id: userId,
                platform_type: 'amazon',
                title: s.productName || s.asin || 'Amazon Product',
                sku: s.sellerSku || s.asin,
                price: 0, // price not in inventory summary; updated on first get_inventory call
                inventory_quantity: s.inventoryDetails?.fulfillableQuantity ?? s.totalQuantity ?? 0,
                status: 'active',
                vendor: 'Amazon FBA',
                product_type: s.productType || '',
              }));
              await supabase.from('products').upsert(rows, {
                onConflict: 'user_id,platform_type,sku',
                ignoreDuplicates: false,
              });
              console.log(`[oauth-callback] Synced ${rows.length} Amazon FBA products for user ${userId}`);
            }
          }
        } catch (syncErr: any) {
          console.warn('[oauth-callback] Amazon sync failed (non-critical):', syncErr.message);
        }
      }
    }

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
