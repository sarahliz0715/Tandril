import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { api } from '@/lib/apiClient';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Zap, Clock, X, Loader2, ChevronDown, ChevronUp, CalendarClock } from 'lucide-react';
import { toast } from 'sonner';

const PLATFORM_LABELS = {
  shopify: 'Shopify',
  woocommerce: 'WooCommerce',
  etsy: 'Etsy',
  ebay: 'eBay',
};

const PLATFORM_COLORS = {
  shopify: 'bg-green-100 text-green-700',
  woocommerce: 'bg-blue-100 text-blue-700',
  etsy: 'bg-orange-100 text-orange-700',
  ebay: 'bg-yellow-100 text-yellow-700',
};

function fmtTime(iso) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

function useCountdown(iso) {
  const [label, setLabel] = useState('');
  useEffect(() => {
    function tick() {
      const diff = new Date(iso).getTime() - Date.now();
      if (diff <= 0) { setLabel('now'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      if (h > 24) setLabel(`${Math.floor(h / 24)}d ${h % 24}h left`);
      else if (h > 0) setLabel(`${h}h ${m}m left`);
      else if (m > 0) setLabel(`${m}m ${s}s left`);
      else setLabel(`${s}s left`);
    }
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [iso]);
  return label;
}

function PlatformPills({ platforms }) {
  return platforms.map(p => (
    <span key={p} className={`text-xs font-semibold px-1.5 py-0.5 rounded ${PLATFORM_COLORS[p] ?? 'bg-slate-100 text-slate-700'}`}>
      {PLATFORM_LABELS[p] ?? p}
    </span>
  ));
}

// ── Active sale card (currently running) ─────────────────────────────────────
function ActiveSaleCard({ sale, onEnded }) {
  const [expanded, setExpanded] = useState(false);
  const [ending, setEnding] = useState(false);
  const countdown = useCountdown(sale.restore_at);

  const handleEndEarly = async () => {
    setEnding(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const result = await api.functions.invoke('cancel-flash-sale', {
        user_id: user.id,
        flash_sale_id: sale.flash_sale_id,
      });
      const data = result?.data ?? result;
      if (data?.success) {
        toast.success(data.message ?? 'Sale ended — prices restored.');
        onEnded(sale.flash_sale_id);
      } else {
        toast.error(data?.error ?? 'Could not end the sale right now.');
      }
    } catch (err) {
      toast.error(`Failed: ${err.message}`);
    } finally {
      setEnding(false);
    }
  };

  return (
    <Card className="border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0">
            <span className="absolute inline-flex w-3 h-3 rounded-full bg-orange-400 opacity-75 animate-ping" />
            <span className="relative inline-flex w-3 h-3 rounded-full bg-orange-500" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-800 text-sm">{sale.discount_percent}% OFF</span>
              <Badge className="bg-orange-500 text-white text-xs border-0 px-2">LIVE</Badge>
              <PlatformPills platforms={sale.platforms} />
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />{countdown}
              </span>
              <span>Restores {fmtTime(sale.restore_at)}</span>
              {sale.product_count > 0 && (
                <button
                  onClick={() => setExpanded(e => !e)}
                  className="flex items-center gap-0.5 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {sale.product_count} product{sale.product_count !== 1 ? 's' : ''}
                  {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              )}
            </div>
          </div>

          <Button
            size="sm" variant="outline" onClick={handleEndEarly} disabled={ending}
            className="border-orange-300 text-orange-700 hover:bg-orange-100 shrink-0"
          >
            {ending
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <><X className="w-3.5 h-3.5 mr-1" />End Early</>}
          </Button>
        </div>

        {expanded && sale.products.length > 0 && (
          <div className="mt-3 pt-3 border-t border-orange-200 grid grid-cols-1 sm:grid-cols-2 gap-1 max-h-40 overflow-y-auto">
            {sale.products.map((p, i) => (
              <div key={i} className="text-xs text-slate-600 flex items-center justify-between gap-2">
                <span className="truncate">{p.product_name || p.sku || '—'}</span>
                {p.original_price && p.sale_price && (
                  <span className="flex-shrink-0 text-slate-400">
                    <s>${Number(p.original_price).toFixed(2)}</s>
                    {' → '}
                    <span className="text-orange-600 font-medium">${Number(p.sale_price).toFixed(2)}</span>
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Upcoming sale card (scheduled, not started yet) ───────────────────────────
function UpcomingSaleCard({ sale, onCancelled }) {
  const [cancelling, setCancelling] = useState(false);
  const countdown = useCountdown(sale.start_at);
  const endTime = new Date(new Date(sale.start_at).getTime() + sale.duration_hours * 3600 * 1000);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('scheduled_flash_sales')
        .update({ cancelled_at: new Date().toISOString() })
        .eq('id', sale.id)
        .eq('user_id', user.id);
      if (error) throw new Error(error.message);
      toast.success('Scheduled sale cancelled.');
      onCancelled(sale.id);
    } catch (err) {
      toast.error(`Could not cancel: ${err.message}`);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <Card className="border-slate-200 bg-slate-50">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <CalendarClock className="w-4 h-4 text-slate-400 flex-shrink-0" />

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-slate-700 text-sm">{sale.discount_percent}% OFF</span>
              <Badge variant="outline" className="text-xs text-slate-500">Scheduled</Badge>
              <PlatformPills platforms={sale.platforms} />
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />Starts in {countdown}
              </span>
              <span>{fmtTime(sale.start_at)} → {fmtTime(endTime.toISOString())}</span>
            </div>
          </div>

          <Button
            size="sm" variant="ghost" onClick={handleCancel} disabled={cancelling}
            className="text-slate-500 hover:text-red-600 hover:bg-red-50 shrink-0"
          >
            {cancelling
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <><X className="w-3.5 h-3.5 mr-1" />Cancel</>}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function groupActiveSales(rows) {
  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.flash_sale_id)) {
      map.set(row.flash_sale_id, {
        flash_sale_id: row.flash_sale_id,
        restore_at: row.restore_at,
        platforms: new Set(),
        products: [],
        discount_percent: null,
      });
    }
    const sale = map.get(row.flash_sale_id);
    if (row.platform_type) sale.platforms.add(row.platform_type);
    if (row.original_price && row.sale_price && sale.discount_percent === null) {
      sale.discount_percent = Math.round((1 - row.sale_price / row.original_price) * 100);
    }
    if (row.product_name || row.sku) sale.products.push(row);
  }
  return Array.from(map.values()).map(s => ({
    ...s,
    platforms: Array.from(s.platforms),
    product_count: s.products.length,
  }));
}

export default function ActiveFlashSalesPanel() {
  const [activeSales, setActiveSales] = useState([]);
  const [upcomingSales, setUpcomingSales] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [restoresRes, scheduledRes] = await Promise.all([
        supabase
          .from('scheduled_restores')
          .select('*')
          .eq('user_id', user.id)
          .is('restored_at', null)
          .gt('restore_at', new Date().toISOString())
          .order('restore_at', { ascending: true }),
        supabase
          .from('scheduled_flash_sales')
          .select('*')
          .eq('user_id', user.id)
          .is('started_at', null)
          .is('cancelled_at', null)
          .gt('start_at', new Date().toISOString())
          .order('start_at', { ascending: true }),
      ]);

      setActiveSales(groupActiveSales(restoresRes.data ?? []));
      setUpcomingSales(scheduledRes.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleActiveEnded = useCallback((flashSaleId) => {
    setActiveSales(prev => prev.filter(s => s.flash_sale_id !== flashSaleId));
  }, []);

  const handleUpcomingCancelled = useCallback((id) => {
    setUpcomingSales(prev => prev.filter(s => s.id !== id));
  }, []);

  if (loading || (activeSales.length === 0 && upcomingSales.length === 0)) return null;

  return (
    <div className="space-y-3">
      {activeSales.length > 0 && (
        <>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Zap className="w-4 h-4 text-orange-500" />
            Active Flash Sales
          </div>
          {activeSales.map(sale => (
            <ActiveSaleCard key={sale.flash_sale_id} sale={sale} onEnded={handleActiveEnded} />
          ))}
        </>
      )}

      {upcomingSales.length > 0 && (
        <>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <CalendarClock className="w-4 h-4 text-slate-400" />
            Upcoming Sales
          </div>
          {upcomingSales.map(sale => (
            <UpcomingSaleCard key={sale.id} sale={sale} onCancelled={handleUpcomingCancelled} />
          ))}
        </>
      )}
    </div>
  );
}
