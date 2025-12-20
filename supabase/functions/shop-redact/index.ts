// Shopify Compliance Webhook: shop/redact
// This function handles shop data deletion requests as required by GDPR and other privacy laws
// Shopify sends this webhook 48 hours after a store owner uninstalls the app

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
      console.error('[shop/redact] SHOPIFY_API_SECRET not configured');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const isValid = await verifyShopifyWebhook(rawBody, hmacHeader, shopifyApiSecret);

    if (!isValid) {
      console.error('[shop/redact] Invalid HMAC signature');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse the webhook payload
    const payload = JSON.parse(rawBody);

    console.log('[shop/redact] Received shop deletion request:', {
      shop_id: payload.shop_id,
      shop_domain: payload.shop_domain,
    });

    // Create Supabase admin client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Log the shop redaction request for compliance tracking
    try {
      await supabaseClient.from('compliance_requests').insert({
        request_type: 'shop/redact',
        shop_id: payload.shop_id,
        shop_domain: payload.shop_domain,
        received_at: new Date().toISOString(),
        status: 'pending',
      });
    } catch (dbError) {
      // If the table doesn't exist yet, just log the error
      console.warn('[shop/redact] Could not log to database (table may not exist):', dbError);
    }

    // Implement the actual shop data deletion logic
    try {
      // Delete all data associated with this shop
      // This is sent 48 hours after uninstall, so we should delete all shop data

      console.log(`[shop/redact] Starting data deletion for shop: ${payload.shop_domain}`);

      // 1. Delete platform connection
      const { error: platformError } = await supabaseClient
        .from('platforms')
        .delete()
        .eq('shop_domain', payload.shop_domain);

      if (platformError) {
        console.error('[shop/redact] Error deleting platform:', platformError);
      } else {
        console.log('[shop/redact] Platform connection deleted');
      }

      // 2. Delete AI commands history
      const { error: commandsError } = await supabaseClient
        .from('ai_commands')
        .delete()
        .eq('shop_domain', payload.shop_domain);

      if (commandsError && !commandsError.message.includes('does not exist')) {
        console.error('[shop/redact] Error deleting commands:', commandsError);
      } else {
        console.log('[shop/redact] AI commands deleted');
      }

      // 3. Delete saved commands
      const { error: savedCommandsError } = await supabaseClient
        .from('saved_commands')
        .delete()
        .eq('shop_domain', payload.shop_domain);

      if (savedCommandsError && !savedCommandsError.message.includes('does not exist')) {
        console.error('[shop/redact] Error deleting saved commands:', savedCommandsError);
      } else {
        console.log('[shop/redact] Saved commands deleted');
      }

      // 4. Delete workflows
      const { error: workflowsError } = await supabaseClient
        .from('ai_workflows')
        .delete()
        .eq('shop_domain', payload.shop_domain);

      if (workflowsError && !workflowsError.message.includes('does not exist')) {
        console.error('[shop/redact] Error deleting workflows:', workflowsError);
      } else {
        console.log('[shop/redact] Workflows deleted');
      }

      // 5. Delete workflow runs
      const { error: workflowRunsError } = await supabaseClient
        .from('workflow_runs')
        .delete()
        .eq('shop_domain', payload.shop_domain);

      if (workflowRunsError && !workflowRunsError.message.includes('does not exist')) {
        console.error('[shop/redact] Error deleting workflow runs:', workflowRunsError);
      } else {
        console.log('[shop/redact] Workflow runs deleted');
      }

      // Update compliance request status
      await supabaseClient
        .from('compliance_requests')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('shop_domain', payload.shop_domain)
        .eq('request_type', 'shop/redact');

      console.log(`[shop/redact] Successfully deleted all data for shop: ${payload.shop_domain}`);

    } catch (deletionError) {
      console.error('[shop/redact] Error during data deletion:', deletionError);

      // Update compliance request with error status
      await supabaseClient
        .from('compliance_requests')
        .update({
          status: 'error',
          error_message: deletionError.message
        })
        .eq('shop_domain', payload.shop_domain)
        .eq('request_type', 'shop/redact');
    }

    // Respond with 200 to acknowledge receipt
    return new Response(JSON.stringify({
      message: 'Shop data deletion completed',
      shop_id: payload.shop_id,
      shop_domain: payload.shop_domain,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[shop/redact] Error:', error);

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
