import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const PLAN_CONFIG: Record<string, { priceEnvKey: string; api_usage_limit: number; platforms_limit: number }> = {
  starter:      { priceEnvKey: 'STRIPE_PRICE_STARTER',      api_usage_limit: 500,   platforms_limit: 4  },
  professional: { priceEnvKey: 'STRIPE_PRICE_PROFESSIONAL', api_usage_limit: 2000,  platforms_limit: 10 },
  enterprise:   { priceEnvKey: 'STRIPE_PRICE_ENTERPRISE',   api_usage_limit: 10000, platforms_limit: 50 },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
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

    const { planId } = await req.json();
    if (!planId || !PLAN_CONFIG[planId]) throw new Error('Invalid plan: ' + planId);

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) throw new Error('Stripe not configured');

    const priceId = Deno.env.get(PLAN_CONFIG[planId].priceEnvKey);
    if (!priceId) throw new Error('Stripe price not configured for ' + planId);

    const appUrl = Deno.env.get('APP_URL') ?? 'https://www.tandril.org';
    const successUrl = appUrl + '/stripe-success?session_id={CHECKOUT_SESSION_ID}';
    const cancelUrl = appUrl + '/Pricing';

    const params = new URLSearchParams();
    params.set('mode', 'subscription');
    params.set('line_items[0][price]', priceId);
    params.set('line_items[0][quantity]', '1');
    params.set('success_url', successUrl);
    params.set('cancel_url', cancelUrl);
    params.set('metadata[user_id]', user.id);
    params.set('metadata[plan_id]', planId);
    params.set('client_reference_id', user.id);
    if (user.email) params.set('customer_email', user.email);

    const sessionRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + stripeKey,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!sessionRes.ok) {
      const err = await sessionRes.json().catch(() => ({}));
      throw new Error('Stripe error: ' + (err.error?.message ?? sessionRes.statusText));
    }

    const session = await sessionRes.json();
    console.log('[stripe-checkout] Created session ' + session.id + ' for user ' + user.id + ' plan ' + planId);

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[stripe-checkout] Error:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
