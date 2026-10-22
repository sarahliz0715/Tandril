// Periodic cross-platform inventory reconciliation sweep.
//
// Documented as "planned, not built" in CLAUDE.md since Sept 25, 2026 — the backstop for
// drift that doesn't depend on webhooks (a manual edit on a non-Shopify platform, a missed
// or failed webhook delivery, eBay's real-time notification never actually having worked
// — see the ebay-auth-callback fix from the same day this was built). Runs the same
// lowest-wins sync (`sync-inventory-levels`, mode: 'lowest') already used for reconnect
// catch-up and made-to-order top-up, just swept across every multi-platform-linked SKU on
// an interval instead of waiting for a specific trigger.
//
// Secret key on the apikey header only (deployed with --no-verify-jwt), scheduled via pg_cron every ~20 minutes (see the matching migration).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getSecretKey, isServiceRequest, serviceHeaders } from '../_shared/supabaseKeys.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Skip a SKU synced more recently than this — avoids redoing work a webhook or another
// sweep step (made-to-order top-up, reconnect catch-up) just finished.
const SKIP_IF_SYNCED_WITHIN_MS = 10 * 60 * 1000;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (!isServiceRequest(req)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabase = createClient(supabaseUrl, getSecretKey());

    // Every (user_id, sku) with 2+ platform links is a candidate — a single-platform link
    // has nothing to reconcile against.
    const { data: links, error: linksError } = await supabase
      .from('platform_product_links')
      .select('user_id, sku, last_synced_at');
    if (linksError) throw linksError;

    const groups = new Map<string, { user_id: string; sku: string; count: number; mostRecentSync: string | null }>();
    for (const link of links || []) {
      const key = `${link.user_id}|${link.sku}`;
      const existing = groups.get(key);
      if (existing) {
        existing.count++;
        if (link.last_synced_at && (!existing.mostRecentSync || link.last_synced_at > existing.mostRecentSync)) {
          existing.mostRecentSync = link.last_synced_at;
        }
      } else {
        groups.set(key, { user_id: link.user_id, sku: link.sku, count: 1, mostRecentSync: link.last_synced_at });
      }
    }

    const now = Date.now();
    const candidates = [...groups.values()].filter((g) => {
      if (g.count < 2) return false;
      if (g.mostRecentSync && now - new Date(g.mostRecentSync).getTime() < SKIP_IF_SYNCED_WITHIN_MS) return false;
      return true;
    });

    let synced = 0;
    let skipped = 0;
    let errors = 0;
    const errorDetails: Array<{ sku: string; error: string }> = [];

    for (const candidate of candidates) {
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/sync-inventory-levels`, {
          method: 'POST',
          headers: serviceHeaders(),
          body: JSON.stringify({ user_id: candidate.user_id, sku: candidate.sku, mode: 'lowest', triggered_by: 'reconciliation_sweep' }),
        });
        const out = await res.json().catch(() => ({}));
        if (!res.ok) {
          errors++;
          errorDetails.push({ sku: candidate.sku, error: out?.error || `HTTP ${res.status}` });
        } else if ((out?.synced ?? 0) > 0) {
          synced++;
        } else {
          skipped++;
        }
      } catch (err: any) {
        errors++;
        errorDetails.push({ sku: candidate.sku, error: err.message });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        checked: candidates.length,
        linked_sku_count: groups.size,
        synced,
        skipped,
        errors,
        error_details: errorDetails.slice(0, 20),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (err: any) {
    console.error('[reconcile-inventory-sync] Fatal error:', err.message);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
