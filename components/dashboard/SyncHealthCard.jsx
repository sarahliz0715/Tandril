import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, CheckCircle2, AlertTriangle, Clock, Link2, ArrowRight } from 'lucide-react';

function timeAgo(iso) {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function SyncHealthCard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const [linksRes, logRes, retriesRes] = await Promise.all([
          supabase
            .from('platform_product_links')
            .select('sku, platform_type, last_synced_at, last_sync_error, last_sync_failed_at')
            .eq('user_id', user.id),
          supabase
            .from('inventory_sync_log')
            .select('created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1),
          supabase
            .from('sync_retry_queue')
            .select('id, attempt_count, last_error')
            .eq('user_id', user.id)
            .is('resolved_at', null),
        ]);

        if (cancelled) return;

        const links = linksRes.data ?? [];
        const skus = [...new Set(links.map(l => l.sku))];
        const failedLinks = links.filter(l => !!l.last_sync_error);
        const lastSyncAt = logRes.data?.[0]?.created_at ?? null;
        const pendingRetries = retriesRes.data ?? [];
        const gaveUp = pendingRetries.filter(r => r.attempt_count >= 5);

        // Count syncs in the last 24h from sync_log
        const { count: syncsToday } = await supabase
          .from('inventory_sync_log')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', new Date(Date.now() - 86400000).toISOString());

        if (!cancelled) {
          setStats({
            linkedSkuCount: skus.length,
            lastSyncAt,
            syncsToday: syncsToday ?? 0,
            pendingRetries: pendingRetries.length,
            gaveUp: gaveUp.length,
            failedLinks: failedLinks.length,
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <Card className="bg-white border border-slate-200">
        <CardContent className="py-6 flex justify-center">
          <RefreshCw className="w-5 h-5 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  if (!stats || stats.linkedSkuCount === 0) {
    return (
      <Card className="bg-white border border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Link2 className="w-4 h-4 text-emerald-600" />
            Cross-Platform Sync
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-slate-500">No products linked yet.</p>
          <Link
            to={createPageUrl('Inventory')}
            className="mt-2 inline-flex items-center gap-1 text-xs text-emerald-600 font-medium hover:underline"
          >
            Set up sync links <ArrowRight className="w-3 h-3" />
          </Link>
        </CardContent>
      </Card>
    );
  }

  const hasIssues = stats.gaveUp > 0 || stats.failedLinks > 0;
  const hasPending = stats.pendingRetries > 0 && stats.gaveUp === 0;

  return (
    <Card className={`bg-white border ${hasIssues ? 'border-red-200' : hasPending ? 'border-amber-200' : 'border-emerald-200'}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Link2 className={`w-4 h-4 ${hasIssues ? 'text-red-500' : 'text-emerald-600'}`} />
            Cross-Platform Sync
          </CardTitle>
          {hasIssues ? (
            <Badge variant="destructive" className="text-xs">Action needed</Badge>
          ) : hasPending ? (
            <Badge className="bg-amber-100 text-amber-700 text-xs border-0">Retrying</Badge>
          ) : (
            <Badge className="bg-emerald-100 text-emerald-700 text-xs border-0">Healthy</Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Stat
            icon={<Link2 className="w-3.5 h-3.5 text-slate-500" />}
            label="Linked SKUs"
            value={stats.linkedSkuCount}
          />
          <Stat
            icon={<Clock className="w-3.5 h-3.5 text-slate-500" />}
            label="Last sync"
            value={timeAgo(stats.lastSyncAt) ?? 'Never'}
          />
          <Stat
            icon={<RefreshCw className="w-3.5 h-3.5 text-slate-500" />}
            label="Syncs today"
            value={stats.syncsToday}
          />
          <Stat
            icon={
              hasIssues
                ? <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            }
            label="Failures"
            value={stats.gaveUp > 0 ? `${stats.gaveUp} gave up` : stats.failedLinks > 0 ? `${stats.failedLinks} errored` : 'None'}
            valueClass={hasIssues ? 'text-red-600 font-semibold' : 'text-emerald-600'}
          />
        </div>

        {hasPending && !hasIssues && (
          <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1">
            {stats.pendingRetries} sync(s) queued for retry — will resolve automatically.
          </p>
        )}

        {hasIssues && (
          <p className="text-xs text-red-700 bg-red-50 rounded px-2 py-1">
            {stats.gaveUp} link(s) failed all retries. Check Inventory → Sync Links.
          </p>
        )}

        <Link
          to={createPageUrl('Inventory')}
          className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium hover:underline"
        >
          Manage sync links <ArrowRight className="w-3 h-3" />
        </Link>
      </CardContent>
    </Card>
  );
}

function Stat({ icon, label, value, valueClass = 'text-slate-800' }) {
  return (
    <div className="flex items-center gap-1.5">
      {icon}
      <div className="min-w-0">
        <div className={`text-sm font-semibold truncate ${valueClass}`}>{value}</div>
        <div className="text-xs text-slate-400 truncate">{label}</div>
      </div>
    </div>
  );
}
