// sync-ad-performance
//
// Scheduled job (pg_cron, every 6 hours — see migrations/20260925000001_ad_performance_cron.sql).
// For every launched Meta campaign that Tandril still thinks is active or paused:
//   1. pulls lifetime spend / impressions / clicks / reach from Meta Insights
//   2. picks up status changes made outside Tandril (paused, archived or deleted in Ads Manager)
// and caches both on the ad_campaigns row, so the Ads page and Orion see current numbers
// without anyone having to ask for them.
//
// POST /functions/v1/sync-ad-performance   (service-role bearer only)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GRAPH = 'https://graph.facebook.com/v19.0';

// Meta campaign effective_status → ad_campaigns.status
function mapMetaStatus(effectiveStatus: string | undefined): string | null {
  switch (effectiveStatus) {
    case 'ACTIVE': return 'active';
    case 'PAUSED':
    case 'CAMPAIGN_PAUSED': return 'paused';
    case 'ARCHIVED':
    case 'DELETED': return 'archived';
    default: return null; // IN_PROCESS, WITH_ISSUES, etc. — leave our status alone
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200 });

  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if ((req.headers.get('Authorization') ?? '') !== `Bearer ${serviceKey}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', serviceKey);

  try {
    const { data: campaigns, error } = await supabase
      .from('ad_campaigns')
      .select('id, user_id, name, status, platform_campaign_id, performance_metrics')
      .eq('platform', 'meta_ads')
      .in('status', ['active', 'paused'])
      .not('platform_campaign_id', 'is', null)
      .limit(500);
    if (error) throw new Error(`Failed to load campaigns: ${error.message}`);
    if (!campaigns?.length) {
      return new Response(JSON.stringify({ success: true, synced: 0, message: 'No launched campaigns.' }), { status: 200 });
    }

    // One Meta token per user
    const byUser = new Map<string, any[]>();
    for (const c of campaigns) {
      if (!byUser.has(c.user_id)) byUser.set(c.user_id, []);
      byUser.get(c.user_id)!.push(c);
    }

    let synced = 0;
    const failures: { campaign_id: string; error: string }[] = [];

    for (const [userId, userCampaigns] of byUser) {
      const { data: plat } = await supabase
        .from('platforms')
        .select('credentials, metadata')
        .eq('user_id', userId)
        .eq('platform_type', 'meta_ads')
        .or('is_active.eq.true,status.eq.connected')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const token = plat?.credentials?.access_token;
      const expiresAt = plat?.metadata?.token_expires_at ? new Date(plat.metadata.token_expires_at).getTime() : 0;
      if (!token || (expiresAt && Date.now() > expiresAt)) {
        // Meta tokens can't be refreshed — the user has to reconnect. Leave cached numbers as-is.
        for (const c of userCampaigns) failures.push({ campaign_id: c.id, error: 'Meta connection missing or expired' });
        continue;
      }

      for (const c of userCampaigns) {
        try {
          const [statusRes, insightsRes] = await Promise.all([
            fetch(`${GRAPH}/${c.platform_campaign_id}?fields=effective_status&access_token=${encodeURIComponent(token)}`),
            fetch(`${GRAPH}/${c.platform_campaign_id}/insights?fields=spend,impressions,clicks,reach&date_preset=maximum&access_token=${encodeURIComponent(token)}`),
          ]);
          const statusData = await statusRes.json();
          const insightsData = await insightsRes.json();
          if (insightsData.error) throw new Error(insightsData.error.message);

          const m = insightsData.data?.[0] || {};
          const performance_metrics = {
            ...(c.performance_metrics || {}),
            spend: parseFloat(m.spend || '0'),
            impressions: parseInt(m.impressions || '0', 10),
            clicks: parseInt(m.clicks || '0', 10),
            reach: parseInt(m.reach || '0', 10),
          };

          const update: Record<string, unknown> = { performance_metrics, last_synced_at: new Date().toISOString() };
          const newStatus = statusData.error ? null : mapMetaStatus(statusData.effective_status);
          if (newStatus && newStatus !== c.status) update.status = newStatus;

          const { error: updErr } = await supabase.from('ad_campaigns').update(update).eq('id', c.id);
          if (updErr) throw new Error(updErr.message);
          synced++;
        } catch (e: any) {
          failures.push({ campaign_id: c.id, error: e.message });
        }
      }
    }

    if (failures.length) console.warn('[sync-ad-performance] Failures:', JSON.stringify(failures));
    console.log(`[sync-ad-performance] Synced ${synced}/${campaigns.length} campaigns`);
    return new Response(JSON.stringify({ success: true, synced, failed: failures.length, failures }), { status: 200 });
  } catch (e: any) {
    console.error('[sync-ad-performance] Error:', e.message);
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500 });
  }
});
