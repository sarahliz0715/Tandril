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

    // Implement GDPR data deletion
    // Note: Tandril stores shop owner data, not individual customer data
    // However, customer data might exist in command/workflow execution results
    try {
      await supabaseClient
        .from('compliance_requests')
        .update({ status: 'in_progress', processed_at: new Date().toISOString() })
        .eq('shop_domain', payload.shop_domain)
        .eq('customer_id', payload.customer?.id)
        .eq('request_type', 'customers/redact');

      const customerId = payload.customer?.id?.toString();
      const customerEmail = payload.customer?.email;
      const customerPhone = payload.customer?.phone;

      // 1. Find and anonymize customer data in AI command execution results
      if (customerId || customerEmail || customerPhone) {
        const { data: commands } = await supabaseClient
          .from('ai_commands')
          .select('id, execution_results')
          .contains('execution_results', { shop_domain: payload.shop_domain });

        if (commands && commands.length > 0) {
          for (const command of commands) {
            let updated = false;
            let results = command.execution_results;

            // Check if execution results contain customer data
            const resultsStr = JSON.stringify(results);
            if ((customerId && resultsStr.includes(customerId)) ||
                (customerEmail && resultsStr.includes(customerEmail)) ||
                (customerPhone && resultsStr.includes(customerPhone))) {

              // Anonymize the customer data
              results = JSON.parse(
                resultsStr
                  .replace(new RegExp(customerEmail, 'g'), '[REDACTED_EMAIL]')
                  .replace(new RegExp(customerPhone || 'NO_PHONE', 'g'), '[REDACTED_PHONE]')
                  .replace(new RegExp(customerId, 'g'), '[REDACTED_CUSTOMER_ID]')
              );
              updated = true;
            }

            if (updated) {
              await supabaseClient
                .from('ai_commands')
                .update({ execution_results: results })
                .eq('id', command.id);
            }
          }
        }

        // 2. Anonymize customer data in workflow run results
        const { data: workflowRuns } = await supabaseClient
          .from('workflow_runs')
          .select('id, execution_results')
          .contains('execution_results', { shop_domain: payload.shop_domain });

        if (workflowRuns && workflowRuns.length > 0) {
          for (const run of workflowRuns) {
            let updated = false;
            let results = run.execution_results;

            const resultsStr = JSON.stringify(results);
            if ((customerId && resultsStr.includes(customerId)) ||
                (customerEmail && resultsStr.includes(customerEmail)) ||
                (customerPhone && resultsStr.includes(customerPhone))) {

              results = JSON.parse(
                resultsStr
                  .replace(new RegExp(customerEmail, 'g'), '[REDACTED_EMAIL]')
                  .replace(new RegExp(customerPhone || 'NO_PHONE', 'g'), '[REDACTED_PHONE]')
                  .replace(new RegExp(customerId, 'g'), '[REDACTED_CUSTOMER_ID]')
              );
              updated = true;
            }

            if (updated) {
              await supabaseClient
                .from('workflow_runs')
                .update({ execution_results: results })
                .eq('id', run.id);
            }
          }
        }

        // 3. Anonymize customer data in command history snapshots
        const { data: commandHistory } = await supabaseClient
          .from('command_history')
          .select('id, change_snapshots, undo_results');

        if (commandHistory && commandHistory.length > 0) {
          for (const history of commandHistory) {
            let updated = false;
            const snapshotsStr = JSON.stringify(history.change_snapshots);
            const undoStr = JSON.stringify(history.undo_results);

            if ((customerId && (snapshotsStr.includes(customerId) || undoStr.includes(customerId))) ||
                (customerEmail && (snapshotsStr.includes(customerEmail) || undoStr.includes(customerEmail))) ||
                (customerPhone && (snapshotsStr.includes(customerPhone) || undoStr.includes(customerPhone)))) {

              const newSnapshots = JSON.parse(
                snapshotsStr
                  .replace(new RegExp(customerEmail, 'g'), '[REDACTED_EMAIL]')
                  .replace(new RegExp(customerPhone || 'NO_PHONE', 'g'), '[REDACTED_PHONE]')
                  .replace(new RegExp(customerId, 'g'), '[REDACTED_CUSTOMER_ID]')
              );

              const newUndo = history.undo_results ? JSON.parse(
                undoStr
                  .replace(new RegExp(customerEmail, 'g'), '[REDACTED_EMAIL]')
                  .replace(new RegExp(customerPhone || 'NO_PHONE', 'g'), '[REDACTED_PHONE]')
                  .replace(new RegExp(customerId, 'g'), '[REDACTED_CUSTOMER_ID]')
              ) : null;

              await supabaseClient
                .from('command_history')
                .update({
                  change_snapshots: newSnapshots,
                  undo_results: newUndo
                })
                .eq('id', history.id);

              updated = true;
            }
          }
        }
      }

      // 4. Update compliance request status to completed
      await supabaseClient
        .from('compliance_requests')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('shop_domain', payload.shop_domain)
        .eq('customer_id', payload.customer?.id)
        .eq('request_type', 'customers/redact');

      console.log('[customers/redact] Successfully redacted customer data');

    } catch (redactError) {
      console.error('[customers/redact] Error during redaction:', redactError);

      await supabaseClient
        .from('compliance_requests')
        .update({
          status: 'error',
          error_message: redactError.message,
          processed_at: new Date().toISOString()
        })
        .eq('shop_domain', payload.shop_domain)
        .eq('customer_id', payload.customer?.id)
        .eq('request_type', 'customers/redact');
    }

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
