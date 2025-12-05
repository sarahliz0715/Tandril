// Shopify GDPR Webhook - Customer Data Request
// Handles requests from customers asking for their data

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-shopify-hmac-sha256, x-shopify-shop-domain, x-shopify-topic',
};

// Verify HMAC signature from Shopify
async function verifyShopifyWebhook(body: string, hmacHeader: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const algorithm = { name: 'HMAC', hash: 'SHA-256' };

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    algorithm,
    false,
    ['sign', 'verify']
  );

  const signature = await crypto.subtle.sign(
    algorithm.name,
    key,
    encoder.encode(body)
  );

  const hashArray = Array.from(new Uint8Array(signature));
  const hashBase64 = btoa(String.fromCharCode(...hashArray));

  return hashBase64 === hmacHeader;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const shopifyHmac = req.headers.get('x-shopify-hmac-sha256');
    const shopDomain = req.headers.get('x-shopify-shop-domain');
    const topic = req.headers.get('x-shopify-topic');

    if (!shopifyHmac) {
      throw new Error('Missing HMAC signature');
    }

    // Get webhook secret from environment
    const webhookSecret = Deno.env.get('SHOPIFY_API_SECRET');
    if (!webhookSecret) {
      throw new Error('SHOPIFY_API_SECRET not configured');
    }

    // Read the raw body
    const body = await req.text();

    // Verify the webhook signature
    const isValid = await verifyShopifyWebhook(body, shopifyHmac, webhookSecret);
    if (!isValid) {
      throw new Error('Invalid HMAC signature');
    }

    // Parse the webhook payload
    const payload = JSON.parse(body);

    console.log('[GDPR Data Request] Received webhook from:', shopDomain);
    console.log('[GDPR Data Request] Customer ID:', payload.customer?.id);
    console.log('[GDPR Data Request] Orders requested:', payload.orders_requested?.length || 0);

    // Log to database for compliance tracking
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    await supabaseClient
      .from('webhook_logs')
      .insert({
        webhook_type: 'gdpr_data_request',
        shop_domain: shopDomain,
        topic: topic,
        payload: payload,
        processed_at: new Date().toISOString()
      })
      .catch(err => {
        // Log error but don't fail the webhook - table might not exist yet
        console.warn('[GDPR Data Request] Could not log to database:', err.message);
      });

    // For MVP: Just acknowledge receipt
    // TODO: Implement actual data export and email to customer

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Data request received and will be processed'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[GDPR Data Request] Error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
