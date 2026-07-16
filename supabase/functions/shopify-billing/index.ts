import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// --- Decryption helpers (mirrors shopify-auth-exchange encryption) ---
const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;

async function getEncryptionKey(): Promise<CryptoKey> {
  const secret = Deno.env.get('ENCRYPTION_SECRET');
  if (!secret) throw new Error('ENCRYPTION_SECRET not set');
  const enc = new TextEncoder();
  const km = await crypto.subtle.importKey('raw', enc.encode(secret), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: enc.encode('tandril-encryption-salt-v1'), iterations: 100000, hash: 'SHA-256' },
    km, { name: ALGORITHM, length: KEY_LENGTH }, false, ['encrypt', 'decrypt']
  );
}

async function decrypt(ciphertext: string): Promise<string> {
  const key = await getEncryptionKey();
  const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
  const iv = combined.slice(0, IV_LENGTH);
  const ct = combined.slice(IV_LENGTH);
  const plain = await crypto.subtle.decrypt({ name: ALGORITHM, iv }, key, ct);
  return new TextDecoder().decode(plain);
}
// --- End decryption helpers ---

const PLAN_CONFIG: Record<string, { name: string; amount: number }> = {
  starter:      { name: 'Tandril Starter',      amount: 39.99  },
  professional: { name: 'Tandril Professional', amount: 129.99 },
  enterprise:   { name: 'Tandril Enterprise',   amount: 299.99 },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const reqBody = await req.json();
    const { action, planId, chargeId, shop: shopParam } = reqBody;

    // --- Auth ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) throw new Error('Unauthorized');

    // --- Get Shopify connection ---
    const { data: platform, error: platformError } = await supabaseClient
      .from('platforms')
      .select('shop_domain, access_token')
      .eq('user_id', user.id)
      .eq('platform_type', 'shopify')
      .single();

    // If not found in platforms table but embedded shop param provided, try service-role lookup
    let shop_domain: string;
    let access_token: string;

    if (platformError || !platform) {
      if (shopParam) {
        const serviceClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );
        const { data: svcPlatform, error: svcError } = await serviceClient
          .from('platforms')
          .select('shop_domain, access_token')
          .eq('shop_domain', shopParam)
          .eq('platform_type', 'shopify')
          .single();
        if (svcError || !svcPlatform) throw new Error('No Shopify store connected');
        shop_domain = svcPlatform.shop_domain;
        access_token = svcPlatform.access_token;
      } else {
        throw new Error('No Shopify store connected');
      }
    } else {
      shop_domain = platform.shop_domain;
      access_token = platform.access_token;
    }

    // Decrypt the stored access token
    try {
      access_token = await decrypt(access_token);
    } catch (_) {
      // Token may not be encrypted (legacy rows) — use as-is
    }

    const shopifyGraphQL = `https://${shop_domain}/admin/api/2025-10/graphql.json`;

    // =========================================================
    // ACTION: create — create a pending subscription and return
    //                  the Shopify confirmation URL
    // =========================================================
    if (action === 'create') {
      const plan = PLAN_CONFIG[planId];
      if (!plan) throw new Error(`Unknown plan: ${planId}`);

      const appUrl = Deno.env.get('APP_URL') ?? 'https://www.tandril.org';
      const returnUrl = `${appUrl}/shopify-billing-callback?plan=${planId}`;

      const mutation = `
        mutation appSubscriptionCreate(
          $name: String!
          $returnUrl: URL!
          $lineItems: [AppSubscriptionLineItemInput!]!
        ) {
          appSubscriptionCreate(name: $name, returnUrl: $returnUrl, lineItems: $lineItems) {
            userErrors { field message }
            confirmationUrl
            appSubscription { id }
          }
        }
      `;

      const response = await fetch(shopifyGraphQL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': access_token,
        },
        body: JSON.stringify({
          query: mutation,
          variables: {
            name: plan.name,
            returnUrl,
            lineItems: [{
              plan: {
                appRecurringPricingDetails: {
                  price: { amount: plan.amount, currencyCode: 'USD' },
                  interval: 'EVERY_30_DAYS',
                },
              },
            }],
          },
        }),
      });

      const result = await response.json();
      console.log('[shopify-billing] appSubscriptionCreate response:', JSON.stringify(result));
      const { confirmationUrl, userErrors } = result.data?.appSubscriptionCreate ?? {};

      if (userErrors?.length) throw new Error(userErrors[0].message);
      if (!confirmationUrl) throw new Error('Shopify did not return a confirmation URL');

      return new Response(JSON.stringify({ confirmationUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // =========================================================
    // ACTION: activate — activate the subscription after the
    //                    merchant approves it on Shopify
    // =========================================================
    if (action === 'activate') {
      if (!chargeId || !planId) throw new Error('chargeId and planId are required');

      // Shopify returns a numeric charge_id in the URL; convert to GID
      const gid = chargeId.startsWith('gid://')
        ? chargeId
        : `gid://shopify/AppSubscription/${chargeId}`;

      const mutation = `
        mutation appSubscriptionActivate($id: ID!) {
          appSubscriptionActivate(id: $id) {
            userErrors { field message }
            appSubscription { id status }
          }
        }
      `;

      const response = await fetch(shopifyGraphQL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': access_token,
        },
        body: JSON.stringify({ query: mutation, variables: { id: gid } }),
      });

      const result = await response.json();
      const { appSubscription, userErrors } = result.data?.appSubscriptionActivate ?? {};

      if (userErrors?.length) throw new Error(userErrors[0].message);
      if (!appSubscription) throw new Error('Failed to activate subscription');

      // Determine tier limits
      const tierLimits: Record<string, { api_usage_limit: number; platforms_limit: number }> = {
        starter:      { api_usage_limit: 500,   platforms_limit: 4  },
        professional: { api_usage_limit: 2000,  platforms_limit: 10 },
        enterprise:   { api_usage_limit: 10000, platforms_limit: 50 },
      };
      const limits = tierLimits[planId] ?? { api_usage_limit: 500, platforms_limit: 4 };

      // Update user metadata
      await supabaseClient.auth.updateUser({
        data: {
          subscription_tier: planId,
          shopify_subscription_id: appSubscription.id,
          ...limits,
        },
      });

      return new Response(
        JSON.stringify({ success: true, status: appSubscription.status, tier: planId }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // =========================================================
    // ACTION: status — verify active subscription against Shopify
    //                  so the Pricing page always reflects truth
    // =========================================================
    if (action === 'status') {
      const { data: { user: authUser } } = await supabaseClient.auth.getUser();
      const meta = authUser?.user_metadata ?? {};
      const subscriptionId = meta.shopify_subscription_id;

      if (!subscriptionId) {
        return new Response(
          JSON.stringify({ tier: meta.subscription_tier ?? 'free', subscription: null }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const gid = subscriptionId.startsWith('gid://')
        ? subscriptionId
        : `gid://shopify/AppSubscription/${subscriptionId}`;

      const query = `query { node(id: "${gid}") { ... on AppSubscription { id name status } } }`;
      const shopifyRes = await fetch(shopifyGraphQL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': access_token },
        body: JSON.stringify({ query }),
      });

      if (!shopifyRes.ok) {
        return new Response(
          JSON.stringify({ tier: meta.subscription_tier ?? 'free', subscription: null, warning: 'Shopify API unavailable' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const shopifyResult = await shopifyRes.json();
      const subscription = shopifyResult.data?.node ?? null;

      // If Shopify says the subscription is not ACTIVE, sync the tier down
      if (subscription && subscription.status !== 'ACTIVE') {
        const serviceClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );
        await serviceClient.auth.admin.updateUserById(user.id, {
          user_metadata: {
            ...meta,
            subscription_tier: 'free',
            shopify_subscription_id: null,
            api_usage_limit: 50,
            platforms_limit: 2,
          },
        });
      }

      return new Response(
        JSON.stringify({ tier: meta.subscription_tier ?? 'free', subscription }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error(`Unknown action: ${action}`);

  } catch (error) {
    console.error('[shopify-billing] Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
