import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PLAN_CONFIG: Record<string, { name: string; amount: number }> = {
  starter:      { name: 'Tandril Starter',      amount: 39.99  },
  professional: { name: 'Tandril Professional', amount: 129.99 },
  enterprise:   { name: 'Tandril Enterprise',   amount: 299.99 },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { action, planId, chargeId } = await req.json();

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
      .from('platform_connections')
      .select('shop_domain, access_token')
      .eq('user_id', user.id)
      .eq('platform_type', 'shopify')
      .single();

    if (platformError || !platform) throw new Error('No Shopify store connected');

    const { shop_domain, access_token } = platform;
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

    throw new Error(`Unknown action: ${action}`);

  } catch (error) {
    console.error('[shopify-billing] Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
