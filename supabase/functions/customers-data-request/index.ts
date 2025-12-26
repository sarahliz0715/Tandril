// Shopify Compliance Webhook: customers/data_request
// This function handles customer data access requests as required by GDPR and other privacy laws
// Shopify sends this webhook when a customer requests to view their data

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Verify Shopify HMAC signature
async function verifyShopifyWebhook(
  body: string,
  hmacHeader: string | null,
  secret: string
): Promise<boolean> {
  if (!hmacHeader) {
    return false;
  }

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(body)
    );

    const hashArray = Array.from(new Uint8Array(signature));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    const hashBase64 = btoa(String.fromCharCode(...hashArray));

    return hashBase64 === hmacHeader;
  } catch (error) {
    console.error('[HMAC Verification] Error:', error);
    return false;
  }
}

serve(async (req) => {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Get HMAC header for verification
    const hmacHeader = req.headers.get('X-Shopify-Hmac-Sha256');
    const shopDomain = req.headers.get('X-Shopify-Shop-Domain');

    // Read the raw body for HMAC verification
    const rawBody = await req.text();

    // Verify HMAC signature
    const shopifyApiSecret = Deno.env.get('SHOPIFY_API_SECRET');
    if (!shopifyApiSecret) {
      console.error('[customers/data_request] SHOPIFY_API_SECRET not configured');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const isValid = await verifyShopifyWebhook(rawBody, hmacHeader, shopifyApiSecret);

    if (!isValid) {
      console.error('[customers/data_request] Invalid HMAC signature');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse the webhook payload
    const payload = JSON.parse(rawBody);

    console.log('[customers/data_request] Received data request:', {
      shop_id: payload.shop_id,
      shop_domain: payload.shop_domain,
      customer_id: payload.customer?.id,
      customer_email: payload.customer?.email,
      data_request_id: payload.data_request?.id,
    });

    // Create Supabase admin client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Log the data request for compliance tracking
    // Note: You should extend your database schema to include a compliance_requests table
    try {
      await supabaseClient.from('compliance_requests').insert({
        request_type: 'customers/data_request',
        shop_id: payload.shop_id,
        shop_domain: payload.shop_domain,
        customer_id: payload.customer?.id,
        customer_email: payload.customer?.email,
        customer_phone: payload.customer?.phone,
        orders_requested: payload.orders_requested,
        data_request_id: payload.data_request?.id,
        received_at: new Date().toISOString(),
        status: 'pending',
      });
    } catch (dbError) {
      // If the table doesn't exist yet, just log the error
      console.warn('[customers/data_request] Could not log to database (table may not exist):', dbError);
    }

    // TODO: Implement the actual data retrieval logic
    // This should:
    // 1. Query your database for all customer data related to the customer_id or email
    // 2. Query for all order data if orders_requested is provided
    // 3. Package the data in a format suitable for the merchant
    // 4. Send the data to the store owner (via email or through their admin panel)
    // 5. Complete this action within 30 days as required by Shopify

    console.log('[customers/data_request] Data request acknowledged. Action required: Provide customer data to store owner.');
    console.log(`[customers/data_request] Shop: ${payload.shop_domain}, Customer: ${payload.customer?.email}`);

    if (payload.orders_requested && payload.orders_requested.length > 0) {
      console.log(`[customers/data_request] Orders requested: ${payload.orders_requested.join(', ')}`);
    }

    // Respond with 200 to acknowledge receipt
    return new Response(JSON.stringify({
      message: 'Data request received and will be processed',
      request_id: payload.data_request?.id,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[customers/data_request] Error:', error);

    // Still return 200 to acknowledge receipt, but log the error
    return new Response(JSON.stringify({
      message: 'Request received with errors',
      error: error.message,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
