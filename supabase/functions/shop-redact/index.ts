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

    const deletionErrors: string[] = [];

    try {
      console.log(`[shop/redact] Starting data deletion for shop: ${payload.shop_domain}`);

      // Resolve the Tandril user this shop belongs to BEFORE deleting the
      // platform row — we need user_id to clean up the rest of their data,
      // and once the platforms row is gone that link is lost. (The previous
      // version of this function tried to filter ai_commands/saved_commands/
      // ai_workflows/workflow_runs directly by a "shop_domain" column — none
      // of those tables actually have one, so every one of those deletes was
      // silently failing.)
      const { data: platformRow, error: platformLookupError } = await supabaseClient
        .from('platforms')
        .select('id, user_id')
        .eq('shop_domain', payload.shop_domain)
        .eq('platform_type', 'shopify')
        .maybeSingle();

      if (platformLookupError) {
        console.error('[shop/redact] Error looking up platform:', platformLookupError.message);
      }

      const userId = platformRow?.user_id;

      if (userId) {
        // Orders (and their line items, via an ON DELETE CASCADE foreign key)
        // are the one table that's reliably scoped to a single platform
        // connection, so this only removes this shop's own orders.
        const { error: ordersError } = await supabaseClient
          .from('orders')
          .delete()
          .eq('user_id', userId)
          .eq('platform_type', 'shopify');
        if (ordersError) deletionErrors.push(`orders: ${ordersError.message}`);
        else console.log('[shop/redact] Shopify orders deleted');

        // ai_commands, saved_commands, and ai_workflows aren't tagged with a
        // specific platform in Tandril's schema — they belong to the whole
        // account, not one store. For an account with only Shopify connected
        // this correctly clears everything; for an account with other
        // platforms connected too, this also clears their AI history for
        // those, since there's no per-platform column to filter on.
        // Deleting ai_workflows also cascades to delete workflow_runs
        // automatically (workflow_runs.workflow_id has ON DELETE CASCADE).
        const userWideTables = ['ai_commands', 'saved_commands', 'ai_workflows'];
        for (const table of userWideTables) {
          const { error } = await supabaseClient.from(table).delete().eq('user_id', userId);
          if (error) {
            deletionErrors.push(`${table}: ${error.message}`);
          } else {
            console.log(`[shop/redact] Deleted ${table} for user ${userId}`);
          }
        }
      } else {
        console.warn(`[shop/redact] No matching platform row found for ${payload.shop_domain} — nothing to resolve to a user; only platform/oauth records (if any) will be removed.`);
      }

      // Delete the platform connection itself
      const { error: platformError } = await supabaseClient
        .from('platforms')
        .delete()
        .eq('shop_domain', payload.shop_domain)
        .eq('platform_type', 'shopify');

      if (platformError) {
        deletionErrors.push(`platforms: ${platformError.message}`);
      } else {
        console.log('[shop/redact] Platform connection deleted');
      }

      // Clean up any leftover OAuth state rows for this shop
      const { error: oauthError } = await supabaseClient
        .from('oauth_states')
        .delete()
        .eq('shop_domain', payload.shop_domain);
      if (oauthError) deletionErrors.push(`oauth_states: ${oauthError.message}`);

      // Update compliance request status
      await supabaseClient
        .from('compliance_requests')
        .update({
          status: deletionErrors.length > 0 ? 'error' : 'completed',
          error_message: deletionErrors.length > 0 ? deletionErrors.join(' | ') : null,
          completed_at: new Date().toISOString()
        })
        .eq('shop_domain', payload.shop_domain)
        .eq('request_type', 'shop/redact');

      if (deletionErrors.length > 0) {
        console.error('[shop/redact] Completed with errors:', deletionErrors.join(' | '));
      } else {
        console.log(`[shop/redact] Successfully deleted all data for shop: ${payload.shop_domain}`);
      }

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
