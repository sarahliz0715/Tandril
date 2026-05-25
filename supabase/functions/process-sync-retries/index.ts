import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Called by pg_cron every 15 minutes.
// Processes sync_retry_queue with exponential backoff:
//   attempt 1 → retry after  5 min
//   attempt 2 → retry after 15 min
//   attempt 3 → retry after  1 hr
//   attempt 4 → retry after  4 hrs
//   attempt 5+ → give up (entry stays visible in UI for manual retry)

const MAX_ATTEMPTS = 5;

const BACKOFF_MINUTES: Record<number, number> = {
  1: 5,
  2: 15,
  3: 60,
  4: 240,
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const now = new Date();

    // Fetch unresolved entries that are due for retry
    const { data: queue, error: qErr } = await supabase
      .from('sync_retry_queue')
      .select('*')
      .is('resolved_at', null)
      .lt('attempt_count', MAX_ATTEMPTS)
      .order('created_at', { ascending: true });

    if (qErr) throw new Error(`Queue fetch failed: ${qErr.message}`);
    if (!queue?.length) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: 'No retries due' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filter to entries where enough time has passed since last attempt
    const due = queue.filter(entry => {
      const backoffMinutes = BACKOFF_MINUTES[entry.attempt_count] ?? 240;
      const lastAttempt = entry.last_attempted_at ? new Date(entry.last_attempted_at) : new Date(entry.created_at);
      const dueAt = new Date(lastAttempt.getTime() + backoffMinutes * 60 * 1000);
      return now >= dueAt;
    });

    console.log(`[process-sync-retries] ${due.length} of ${queue.length} queued entries are due`);

    const syncUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/sync-inventory-levels`;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    let succeeded = 0;
    let failed = 0;

    for (const entry of due) {
      try {
        const res = await fetch(syncUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceKey}` },
          body: JSON.stringify({
            user_id: entry.user_id,
            sku: entry.sku,
            new_quantity: entry.quantity,
            source_platform_type: entry.source_platform_type,
            triggered_by: 'retry',
          }),
        });

        const result = await res.json();
        const thisLinkSucceeded = result?.success && (result?.synced ?? 0) > 0;

        if (thisLinkSucceeded) {
          // sync-inventory-levels already marks resolved_at on the queue entry on success
          succeeded++;
          console.log(`[process-sync-retries] ✓ SKU=${entry.sku} platform=${entry.target_platform_type}`);
        } else {
          throw new Error(result?.error ?? 'Sync returned success=false');
        }
      } catch (err: any) {
        failed++;
        console.warn(`[process-sync-retries] ✗ SKU=${entry.sku} attempt=${entry.attempt_count + 1}: ${err.message}`);

        const newAttemptCount = entry.attempt_count + 1;
        await supabase
          .from('sync_retry_queue')
          .update({
            attempt_count: newAttemptCount,
            last_attempted_at: now.toISOString(),
            last_error: err.message,
            // If max attempts reached, mark resolved_at with a sentinel so it stops being processed
            // but stays visible in UI (negative resolved marker — resolved_at set but last_error present)
            ...(newAttemptCount >= MAX_ATTEMPTS ? { resolved_at: now.toISOString() } : {}),
          })
          .eq('id', entry.id);

        if (newAttemptCount >= MAX_ATTEMPTS) {
          // Update the link to show a permanent error so the user sees it in the UI
          await supabase
            .from('platform_product_links')
            .update({
              last_sync_error: `Gave up after ${MAX_ATTEMPTS} attempts: ${err.message}`,
              last_sync_failed_at: now.toISOString(),
            })
            .eq('user_id', entry.user_id)
            .eq('sku', entry.sku)
            .eq('platform_id', entry.target_platform_id);
        }
      }
    }

    console.log(`[process-sync-retries] Done: ${succeeded} succeeded, ${failed} failed`);
    return new Response(
      JSON.stringify({ success: true, processed: due.length, succeeded, failed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[process-sync-retries] Fatal error:', error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
