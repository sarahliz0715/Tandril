import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { api } from '@/lib/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function OrionDigestCard() {
  const [digest, setDigest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('orion_digests')
        .select('digest_text, generated_at, data_snapshot')
        .eq('user_id', user.id)
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setDigest(data ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const result = await api.functions.invoke('generate-orion-digest', { user_id: user.id });
      const data = result?.data ?? result;
      if (data?.success || data?.generated >= 1) {
        await load();
        toast.success('Digest refreshed.');
      } else {
        toast.error(data?.error ?? 'Could not generate digest right now.');
      }
    } catch (err) {
      toast.error(`Failed: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return null;

  const snapshot = digest?.data_snapshot;

  return (
    <Card className="border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-500" />
            <CardTitle className="text-sm font-semibold text-violet-800">Orion Daily Digest</CardTitle>
            {digest?.generated_at && (
              <span className="text-xs text-violet-400">{timeAgo(digest.generated_at)}</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="sm" variant="ghost" onClick={handleGenerate} disabled={generating}
              className="h-7 px-2 text-violet-500 hover:text-violet-700 hover:bg-violet-100"
              title="Refresh digest"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              size="sm" variant="ghost" onClick={() => setExpanded(e => !e)}
              className="h-7 px-2 text-violet-400 hover:text-violet-600 hover:bg-violet-100"
            >
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="px-4 pb-4 pt-0">
          {digest ? (
            <>
              {snapshot && (
                <div className="flex flex-wrap gap-3 mb-3 text-xs text-violet-600">
                  <span className="font-medium">
                    ${Number(snapshot.revenue_24h || 0).toFixed(2)} today
                    {snapshot.revenue_change_pct !== null && snapshot.revenue_change_pct !== undefined && (
                      <span className={snapshot.revenue_change_pct >= 0 ? ' text-green-600' : ' text-red-500'}>
                        {' '}{snapshot.revenue_change_pct >= 0 ? '↑' : '↓'}{Math.abs(snapshot.revenue_change_pct)}%
                      </span>
                    )}
                  </span>
                  <span>{snapshot.orders_24h} orders</span>
                  {snapshot.active_flash_sales > 0 && (
                    <span className="text-orange-500">{snapshot.active_flash_sales} flash sale live</span>
                  )}
                </div>
              )}
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{digest.digest_text}</p>
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-violet-400 mb-3">No digest yet — generate your first one.</p>
              <Button
                size="sm" onClick={handleGenerate} disabled={generating}
                className="bg-violet-600 hover:bg-violet-700 text-white"
              >
                {generating ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
                {generating ? 'Generating…' : 'Generate Digest'}
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
