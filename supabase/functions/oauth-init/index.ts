// Unified OAuth Initiation Edge Function
// Generates the OAuth authorization URL for all supported platforms.
// Env vars required per platform:
//   Etsy:              ETSY_CLIENT_ID, ETSY_CLIENT_SECRET
//   TikTok Shop:       TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET
//   Meta/Facebook/IG:  META_APP_ID, META_APP_SECRET  (shared by meta_ads + instagram)
//   Amazon:            AMAZON_CLIENT_ID, AMAZON_CLIENT_SECRET
//   Square:            SQUARE_APPLICATION_ID, SQUARE_APPLICATION_SECRET
//   Wix:               WIX_CLIENT_ID, WIX_CLIENT_SECRET
//   Squarespace:       SQUARESPACE_CLIENT_ID, SQUARESPACE_CLIENT_SECRET
//   BigCommerce:       BIGCOMMERCE_CLIENT_ID, BIGCOMMERCE_CLIENT_SECRET
//   Faire:             FAIRE_CLIENT_ID, FAIRE_CLIENT_SECRET

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

// ─── PKCE helpers ─────────────────────────────────────────────────────────────

function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// ─── Per-platform OAuth config ────────────────────────────────────────────────

interface PlatformConfig {
  authUrl: string;
  scopes: string;
  extraParams?: Record<string, string>;
  requiresPKCE?: boolean;
  clientIdEnv: string;
  scopeSeparator?: string; // default ' '
  clientIdParam?: string;  // query param name for client id, defaults to 'client_id'
}

const APP_URL = Deno.env.get('APP_URL') || 'http://localhost:5173';
const CALLBACK_URL = `${APP_URL}/oauth-callback`;

const PLATFORM_CONFIG: Record<string, PlatformConfig> = {
  etsy: {
    authUrl: 'https://www.etsy.com/oauth/connect',
    scopes: 'listings_r listings_w shops_r transactions_r',
    requiresPKCE: true,
    clientIdEnv: 'ETSY_CLIENT_ID',
    scopeSeparator: ' ',
  },
  tiktok_shop: {
    authUrl: 'https://auth.tiktok-shops.com/oauth/authorize',
    scopes: 'product.list product.read order.list order.read inventory.list inventory.read',
    clientIdEnv: 'TIKTOK_CLIENT_KEY',
    scopeSeparator: ',',
  },
  meta_ads: {
    authUrl: 'https://www.facebook.com/v19.0/dialog/oauth',
    scopes: 'catalog_management pages_show_list business_management ads_management',
    clientIdEnv: 'META_APP_ID',
    scopeSeparator: ',',
  },
  instagram: {
    // Instagram Shopping uses the same Meta OAuth dialog but with Instagram-specific scopes.
    // Requires the same META_APP_ID / META_APP_SECRET credentials.
    authUrl: 'https://www.facebook.com/v19.0/dialog/oauth',
    scopes: 'instagram_basic,catalog_management,pages_show_list,pages_read_engagement,business_management,instagram_manage_insights',
    clientIdEnv: 'META_APP_ID',
    scopeSeparator: ',',
  },
  amazon: {
    // SP-API consent URL uses 'application_id' (= LWA client_id) not 'client_id'
    authUrl: 'https://sellercentral.amazon.com/apps/authorize/consent',
    scopes: '',
    clientIdEnv: 'AMAZON_CLIENT_ID',
    clientIdParam: 'application_id',
    extraParams: { version: 'beta' },
  },
  square: {
    authUrl: 'https://connect.squareup.com/oauth2/authorize',
    scopes: 'MERCHANT_PROFILE_READ ORDERS_READ ORDERS_WRITE ITEMS_READ ITEMS_WRITE INVENTORY_READ INVENTORY_WRITE',
    clientIdEnv: 'SQUARE_APPLICATION_ID',
    scopeSeparator: '+',
  },
  wix: {
    authUrl: 'https://manage.wix.com/oauth/authorize',
    scopes: '',
    clientIdEnv: 'WIX_CLIENT_ID',
  },
  squarespace: {
    authUrl: 'https://login.squarespace.com/api/1/login/oauth/provider/authorize',
    scopes: 'website.orders.read website.orders.write website.inventory.read website.inventory.write website.products.read website.products.write',
    clientIdEnv: 'SQUARESPACE_CLIENT_ID',
    scopeSeparator: ' ',
  },
  bigcommerce: {
    authUrl: 'https://login.bigcommerce.com/oauth2/authorize',
    scopes: 'store_v2_products store_v2_orders store_v2_customers store_v2_information_read_only',
    clientIdEnv: 'BIGCOMMERCE_CLIENT_ID',
    scopeSeparator: ' ',
  },
  faire: {
    authUrl: 'https://app.faire.com/oauth/authorize',
    scopes: 'read:products write:products read:orders write:orders',
    clientIdEnv: 'FAIRE_CLIENT_ID',
    scopeSeparator: ' ',
  },
  tiktok_ads: {
    // TikTok Ads (Marketing API) — separate app from TikTok Shop
    // Requires TIKTOK_ADS_APP_ID + TIKTOK_ADS_APP_SECRET in Supabase secrets
    authUrl: 'https://business-api.tiktok.com/portal/auth',
    scopes: '',
    clientIdEnv: 'TIKTOK_ADS_APP_ID',
    clientIdParam: 'app_id',
  },
};

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) throw new Error('Unauthorized');

    const body = await req.json();
    const platform: string = body.platform;
    if (!platform) throw new Error('Missing platform parameter');

    const config = PLATFORM_CONFIG[platform];
    if (!config) throw new Error(`Unsupported platform: ${platform}`);

    const clientId = Deno.env.get(config.clientIdEnv);
    if (!clientId) throw new Error(`${platform} client ID not configured (${config.clientIdEnv})`);

    const state = crypto.randomUUID();
    const metadata: Record<string, string> = {};

    // PKCE for Etsy
    let codeChallenge: string | undefined;
    if (config.requiresPKCE) {
      const codeVerifier = generateCodeVerifier();
      codeChallenge = await generateCodeChallenge(codeVerifier);
      metadata.code_verifier = codeVerifier;
    }

    // Store state in DB
    const { error: stateError } = await supabaseClient
      .from('oauth_states')
      .insert({
        user_id: user.id,
        state,
        platform,
        metadata,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      });

    if (stateError) {
      console.error(`[oauth-init:${platform}] State insert error:`, stateError);
      throw new Error('Failed to initialize OAuth session');
    }

    const separator = config.scopeSeparator ?? ' ';

    // Build auth URL
    const clientIdParamName = config.clientIdParam ?? 'client_id';
    const params: Record<string, string> = {
      [clientIdParamName]: clientId,
      response_type: 'code',
      redirect_uri: CALLBACK_URL,
      state,
      ...(config.scopes ? { scope: config.scopes.split(' ').join(separator) } : {}),
      ...(config.extraParams ?? {}),
    };

    if (codeChallenge) {
      params.code_challenge = codeChallenge;
      params.code_challenge_method = 'S256';
    }

    const authUrl = `${config.authUrl}?${new URLSearchParams(params).toString()}`;

    console.log(`[oauth-init] Generated ${platform} auth URL for user ${user.id}`);

    return new Response(
      JSON.stringify({ success: true, auth_url: authUrl, platform }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error('[oauth-init] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
