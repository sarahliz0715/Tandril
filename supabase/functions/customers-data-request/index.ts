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

    // Implement GDPR data export
    // Note: Tandril stores shop owner data, not individual customer data
    // However, customer data might exist in command/workflow execution results
    try {
      await supabaseClient
        .from('compliance_requests')
        .update({ status: 'in_progress', processed_at: new Date().toISOString() })
        .eq('shop_domain', payload.shop_domain)
        .eq('customer_id', payload.customer?.id)
        .eq('request_type', 'customers/data_request');

      const customerId = payload.customer?.id?.toString();
      const customerEmail = payload.customer?.email;
      const customerPhone = payload.customer?.phone;

      const exportData = {
        request_info: {
          shop_domain: payload.shop_domain,
          customer_id: customerId,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          data_request_id: payload.data_request?.id,
          orders_requested: payload.orders_requested,
          export_date: new Date().toISOString()
        },
        customer_data_found: {
          commands: [],
          workflow_runs: [],
          command_history: []
        }
      };

      // 1. Find customer data in AI command execution results
      if (customerId || customerEmail || customerPhone) {
        const { data: commands } = await supabaseClient
          .from('ai_commands')
          .select('id, command_text, status, execution_results, executed_at, created_at')
          .contains('execution_results', { shop_domain: payload.shop_domain });

        if (commands && commands.length > 0) {
          for (const command of commands) {
            const resultsStr = JSON.stringify(command.execution_results);
            if ((customerId && resultsStr.includes(customerId)) ||
                (customerEmail && resultsStr.includes(customerEmail)) ||
                (customerPhone && resultsStr.includes(customerPhone))) {

              exportData.customer_data_found.commands.push({
                command_id: command.id,
                command_text: command.command_text,
                status: command.status,
                execution_results: command.execution_results,
                executed_at: command.executed_at,
                created_at: command.created_at
              });
            }
          }
        }

        // 2. Find customer data in workflow run results
        const { data: workflowRuns } = await supabaseClient
          .from('workflow_runs')
          .select('id, workflow_id, status, execution_results, started_at, completed_at')
          .contains('execution_results', { shop_domain: payload.shop_domain });

        if (workflowRuns && workflowRuns.length > 0) {
          for (const run of workflowRuns) {
            const resultsStr = JSON.stringify(run.execution_results);
            if ((customerId && resultsStr.includes(customerId)) ||
                (customerEmail && resultsStr.includes(customerEmail)) ||
                (customerPhone && resultsStr.includes(customerPhone))) {

              exportData.customer_data_found.workflow_runs.push({
                run_id: run.id,
                workflow_id: run.workflow_id,
                status: run.status,
                execution_results: run.execution_results,
                started_at: run.started_at,
                completed_at: run.completed_at
              });
            }
          }
        }

        // 3. Find customer data in command history snapshots
        const { data: commandHistory } = await supabaseClient
          .from('command_history')
          .select('id, command_id, change_snapshots, executed_at, undo_results');

        if (commandHistory && commandHistory.length > 0) {
          for (const history of commandHistory) {
            const snapshotsStr = JSON.stringify(history.change_snapshots);
            const undoStr = JSON.stringify(history.undo_results);

            if ((customerId && (snapshotsStr.includes(customerId) || undoStr.includes(customerId))) ||
                (customerEmail && (snapshotsStr.includes(customerEmail) || undoStr.includes(customerEmail))) ||
                (customerPhone && (snapshotsStr.includes(customerPhone) || undoStr.includes(customerPhone)))) {

              exportData.customer_data_found.command_history.push({
                history_id: history.id,
                command_id: history.command_id,
                change_snapshots: history.change_snapshots,
                undo_results: history.undo_results,
                executed_at: history.executed_at
              });
            }
          }
        }
      }

      // 4. Store the export data in the compliance request
      await supabaseClient
        .from('compliance_requests')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          error_message: JSON.stringify(exportData) // Store export data for retrieval
        })
        .eq('shop_domain', payload.shop_domain)
        .eq('customer_id', payload.customer?.id)
        .eq('request_type', 'customers/data_request');

      console.log('[customers/data_request] Successfully exported customer data');
      console.log(`[customers/data_request] Found ${exportData.customer_data_found.commands.length} commands, ${exportData.customer_data_found.workflow_runs.length} workflow runs, ${exportData.customer_data_found.command_history.length} history entries`);

    } catch (exportError) {
      console.error('[customers/data_request] Error during export:', exportError);

      await supabaseClient
        .from('compliance_requests')
        .update({
          status: 'error',
          error_message: exportError.message,
          processed_at: new Date().toISOString()
        })
        .eq('shop_domain', payload.shop_domain)
        .eq('customer_id', payload.customer?.id)
        .eq('request_type', 'customers/data_request');
    }

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
