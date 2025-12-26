// Shopify Compliance Webhook: customers/redact
// This function handles customer data deletion requests as required by GDPR and other privacy laws
// Shopify sends this webhook when a store owner requests customer data deletion

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
      console.error('[customers/redact] SHOPIFY_API_SECRET not configured');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const isValid = await verifyShopifyWebhook(rawBody, hmacHeader, shopifyApiSecret);

    if (!isValid) {
      console.error('[customers/redact] Invalid HMAC signature');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse the webhook payload
    const payload = JSON.parse(rawBody);

    console.log('[customers/redact] Received redaction request:', {
      shop_id: payload.shop_id,
      shop_domain: payload.shop_domain,
      customer_id: payload.customer?.id,
      customer_email: payload.customer?.email,
      orders_to_redact: payload.orders_to_redact?.length || 0,
    });

    // Create Supabase admin client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Log the redaction request for compliance tracking
    try {
      await supabaseClient.from('compliance_requests').insert({
        request_type: 'customers/redact',
        shop_id: payload.shop_id,
        shop_domain: payload.shop_domain,
        customer_id: payload.customer?.id,
        customer_email: payload.customer?.email,
        customer_phone: payload.customer?.phone,
        orders_to_redact: payload.orders_to_redact,
        received_at: new Date().toISOString(),
        status: 'pending',
      });
    } catch (dbError) {
      // If the table doesn't exist yet, just log the error
      console.warn('[customers/redact] Could not log to database (table may not exist):', dbError);
    }

    // TODO: Implement the actual data deletion logic
    // This should:
    // 1. Find all customer data in your database matching the customer_id or email
    // 2. Delete or anonymize customer personal data
    // 3. Delete or anonymize order data for orders in orders_to_redact array
    // 4. Ensure compliance with data retention laws (if legally required to retain data, don't delete)
    // 5. Complete this action within 30 days as required by Shopify
    // 6. Update the compliance_requests table with status: 'completed'

    // Example deletion logic (uncomment and adapt to your schema):
    /*
    if (payload.customer?.id) {
      // Delete customer-related data
      await supabaseClient
        .from('ai_commands')
        .delete()
        .eq('shop_domain', payload.shop_domain)
        .eq('customer_id', payload.customer.id);

      await supabaseClient
        .from('ai_workflows')
        .delete()
        .eq('shop_domain', payload.shop_domain)
        .eq('customer_id', payload.customer.id);

      // Delete any other customer-specific data you may have stored
    }

    if (payload.orders_to_redact && payload.orders_to_redact.length > 0) {
      // Delete order-related data
      for (const orderId of payload.orders_to_redact) {
        await supabaseClient
          .from('order_data')
          .delete()
          .eq('order_id', orderId);
      }
    }
    */

    console.log('[customers/redact] Redaction request acknowledged. Action required: Delete customer data.');
    console.log(`[customers/redact] Shop: ${payload.shop_domain}, Customer: ${payload.customer?.email}`);

    if (payload.orders_to_redact && payload.orders_to_redact.length > 0) {
      console.log(`[customers/redact] Orders to redact: ${payload.orders_to_redact.join(', ')}`);
    }

    // Respond with 200 to acknowledge receipt
    return new Response(JSON.stringify({
      message: 'Redaction request received and will be processed',
      customer_id: payload.customer?.id,
      shop_domain: payload.shop_domain,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[customers/redact] Error:', error);

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
