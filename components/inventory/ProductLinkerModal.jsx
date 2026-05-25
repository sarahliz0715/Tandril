import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { api } from '@/lib/apiClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Search, Link2, Loader2, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';

const PLATFORM_COLORS = {
  shopify: 'bg-green-100 text-green-700',
  woocommerce: 'bg-blue-100 text-blue-700',
  etsy: 'bg-orange-100 text-orange-700',
  ebay: 'bg-yellow-100 text-yellow-700',
};

function PlatformColumn({ label, platforms, selectedPlatformId, onPlatformChange, products, isLoading,
  search, onSearch, page, onPage, selectedProduct, onSelectProduct, selectedVariant, onSelectVariant,
  variants, isLoadingVariants, linkedMap }) {

  return (
    <div className="flex flex-col gap-3 flex-1 min-w-0">
      <div className="font-semibold text-sm text-slate-600">{label}</div>

      <Select value={selectedPlatformId} onValueChange={onPlatformChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select platform…" />
        </SelectTrigger>
        <SelectContent>
          {platforms.map(p => (
            <SelectItem key={p.id} value={p.id}>
              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded mr-2 ${PLATFORM_COLORS[p.platform_type] ?? 'bg-slate-100 text-slate-700'}`}>
                {p.platform_type}
              </span>
              {p.shop_name || p.shop_domain}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedPlatformId && (
        <>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
            <Input
              className="pl-8"
              placeholder="Search products…"
              value={search}
              onChange={e => onSearch(e.target.value)}
            />
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            {isLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-10 text-sm text-slate-400">No products found</div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {products.map(product => {
                  const isSelected = selectedProduct?.id === product.id;
                  const linkedSku = linkedMap?.get(product.id);
                  const isLinked = !!linkedSku;
                  return (
                    <button
                      key={product.id}
                      onClick={() => onSelectProduct(isSelected ? null : product)}
                      className={`w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-slate-50 transition-colors ${
                        isSelected ? 'bg-emerald-50 border-l-2 border-emerald-500' :
                        isLinked ? 'bg-slate-50/60' : ''
                      }`}
                    >
                      {product.image_url ? (
                        <img src={product.image_url} alt="" className="w-9 h-9 rounded object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded bg-slate-100 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-800 truncate">{product.title}</div>
                        <div className="text-xs text-slate-400 flex gap-2 flex-wrap">
                          {product.sku && <span>SKU: {product.sku}</span>}
                          <span>qty {product.quantity}</span>
                          {isLinked && (
                            <span className="text-emerald-600 font-medium flex items-center gap-0.5">
                              <Link2 className="w-3 h-3" /> linked · {linkedSku}
                            </span>
                          )}
                        </div>
                      </div>
                      {isSelected
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        : isLinked
                        ? <Link2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        : null}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex items-center justify-between px-3 py-2 border-t border-slate-100 bg-slate-50 text-xs text-slate-500">
              <button onClick={() => onPage(page - 1)} disabled={page <= 1} className="disabled:opacity-40 hover:text-slate-800">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span>Page {page}</span>
              <button onClick={() => onPage(page + 1)} disabled={products.length < 20} className="disabled:opacity-40 hover:text-slate-800">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Variant picker — shown when selected product has variants */}
          {selectedProduct && (
            <div>
              {isLoadingVariants ? (
                <div className="flex items-center gap-2 text-xs text-slate-500 py-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Loading variants…
                </div>
              ) : variants.length > 1 ? (
                <Select value={selectedVariant ?? ''} onValueChange={onSelectVariant}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Select variant (optional)…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">All / no specific variant</SelectItem>
                    {variants.map(v => (
                      <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function ProductLinkerModal({ open, onClose, platforms, onLinked }) {
  const [leftPlatformId, setLeftPlatformId] = useState('');
  const [rightPlatformId, setRightPlatformId] = useState('');

  const [leftSearch, setLeftSearch] = useState('');
  const [rightSearch, setRightSearch] = useState('');
  const [leftPage, setLeftPage] = useState(1);
  const [rightPage, setRightPage] = useState(1);

  const [leftProducts, setLeftProducts] = useState([]);
  const [rightProducts, setRightProducts] = useState([]);
  const [leftLoading, setLeftLoading] = useState(false);
  const [rightLoading, setRightLoading] = useState(false);

  const [leftSelected, setLeftSelected] = useState(null);
  const [rightSelected, setRightSelected] = useState(null);
  const [leftVariants, setLeftVariants] = useState([]);
  const [rightVariants, setRightVariants] = useState([]);
  const [leftVariantId, setLeftVariantId] = useState('');
  const [rightVariantId, setRightVariantId] = useState('');
  const [leftVariantsLoading, setLeftVariantsLoading] = useState(false);
  const [rightVariantsLoading, setRightVariantsLoading] = useState(false);

  // Map of platform_product_id → sku for already-linked products
  const [leftLinkedMap, setLeftLinkedMap] = useState(new Map());
  const [rightLinkedMap, setRightLinkedMap] = useState(new Map());

  const [skuOverride, setSkuOverride] = useState('');
  const [isLinking, setIsLinking] = useState(false);

  const fetchProducts = useCallback(async (platformId, search, page, setSide, setLoading) => {
    if (!platformId) return;
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const result = await api.functions.invoke('fetch-platform-products', {
        user_id: user.id, platform_id: platformId, search, page,
      });
      const data = result?.data ?? result;
      setSide(data?.products ?? []);
    } catch (err) {
      toast.error(`Could not load products: ${err.message}`);
      setSide([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLinkedMap = useCallback(async (platformId, setMap) => {
    if (!platformId) { setMap(new Map()); return; }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase
        .from('platform_product_links')
        .select('platform_product_id, sku')
        .eq('user_id', user.id)
        .eq('platform_id', platformId);
      setMap(new Map((data ?? []).map(r => [r.platform_product_id, r.sku])));
    } catch {
      setMap(new Map());
    }
  }, []);

  const fetchVariants = useCallback(async (platformId, productId, setVariants, setLoading) => {
    if (!platformId || !productId) return;
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const result = await api.functions.invoke('fetch-product-variants', {
        user_id: user.id, platform_id: platformId, product_id: productId,
      });
      const data = result?.data ?? result;
      setVariants(data?.variants ?? []);
    } catch { setVariants([]); }
    finally { setLoading(false); }
  }, []);

  // Load products when platform/search/page changes
  useEffect(() => {
    const t = setTimeout(() => fetchProducts(leftPlatformId, leftSearch, leftPage, setLeftProducts, setLeftLoading), 300);
    return () => clearTimeout(t);
  }, [leftPlatformId, leftSearch, leftPage, fetchProducts]);

  useEffect(() => {
    const t = setTimeout(() => fetchProducts(rightPlatformId, rightSearch, rightPage, setRightProducts, setRightLoading), 300);
    return () => clearTimeout(t);
  }, [rightPlatformId, rightSearch, rightPage, fetchProducts]);

  // Load linked maps when platform changes
  useEffect(() => { fetchLinkedMap(leftPlatformId, setLeftLinkedMap); }, [leftPlatformId, fetchLinkedMap]);
  useEffect(() => { fetchLinkedMap(rightPlatformId, setRightLinkedMap); }, [rightPlatformId, fetchLinkedMap]);

  // Load variants when a product is selected
  useEffect(() => {
    if (leftSelected) {
      setLeftVariantId('');
      fetchVariants(leftPlatformId, leftSelected.id, setLeftVariants, setLeftVariantsLoading);
    } else {
      setLeftVariants([]);
    }
  }, [leftSelected, leftPlatformId, fetchVariants]);

  useEffect(() => {
    if (rightSelected) {
      setRightVariantId('');
      fetchVariants(rightPlatformId, rightSelected.id, setRightVariants, setRightVariantsLoading);
    } else {
      setRightVariants([]);
    }
  }, [rightSelected, rightPlatformId, fetchVariants]);

  // Auto-fill SKU from whichever side has one
  useEffect(() => {
    if (!skuOverride) {
      const sku = leftSelected?.sku || rightSelected?.sku || '';
      setSkuOverride(sku);
    }
  }, [leftSelected, rightSelected]);

  const handleLink = async () => {
    if (!leftSelected || !rightSelected) {
      toast.error('Select a product on both sides first');
      return;
    }
    if (!skuOverride.trim()) {
      toast.error('A SKU is required to link products — enter one above');
      return;
    }
    setIsLinking(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const leftPlatform = platforms.find(p => p.id === leftPlatformId);
      const rightPlatform = platforms.find(p => p.id === rightPlatformId);

      const inserts = [
        {
          user_id: user.id,
          sku: skuOverride.trim(),
          platform_id: leftPlatformId,
          platform_type: leftPlatform.platform_type,
          platform_product_id: leftSelected.id,
          platform_variant_id: leftVariantId && leftVariantId !== '__none__' ? leftVariantId : null,
        },
        {
          user_id: user.id,
          sku: skuOverride.trim(),
          platform_id: rightPlatformId,
          platform_type: rightPlatform.platform_type,
          platform_product_id: rightSelected.id,
          platform_variant_id: rightVariantId && rightVariantId !== '__none__' ? rightVariantId : null,
        },
      ];

      const { error } = await supabase
        .from('platform_product_links')
        .upsert(inserts, { onConflict: 'user_id,sku,platform_id', ignoreDuplicates: false });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success(`Linked "${leftSelected.title}" ↔ "${rightSelected.title}" under SKU ${skuOverride.trim()}`);
      onLinked?.();

      // Refresh linked maps so the badges appear immediately
      fetchLinkedMap(leftPlatformId, setLeftLinkedMap);
      fetchLinkedMap(rightPlatformId, setRightLinkedMap);

      // Reset for next link without closing
      setLeftSelected(null);
      setRightSelected(null);
      setLeftVariantId('');
      setRightVariantId('');
      setSkuOverride('');
    } catch (err) {
      toast.error(`Link failed: ${err.message}`);
    } finally {
      setIsLinking(false);
    }
  };

  const handleClose = () => {
    setLeftPlatformId(''); setRightPlatformId('');
    setLeftSearch(''); setRightSearch('');
    setLeftPage(1); setRightPage(1);
    setLeftSelected(null); setRightSelected(null);
    setLeftLinkedMap(new Map()); setRightLinkedMap(new Map());
    setSkuOverride('');
    onClose();
  };

  const canLink = leftSelected && rightSelected && skuOverride.trim();

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-emerald-600" />
            Link Products Across Platforms
          </DialogTitle>
          <p className="text-sm text-slate-500 mt-1">
            Pick one product from each platform. They'll be kept in sync whenever a sale, cancellation, or manual sync occurs.
          </p>
        </DialogHeader>

        <div className="flex gap-6 py-2">
          <PlatformColumn
            label="Platform A"
            platforms={platforms.filter(p => p.id !== rightPlatformId)}
            selectedPlatformId={leftPlatformId}
            onPlatformChange={id => { setLeftPlatformId(id); setLeftSelected(null); setLeftPage(1); setLeftSearch(''); }}
            products={leftProducts}
            isLoading={leftLoading}
            search={leftSearch}
            onSearch={s => { setLeftSearch(s); setLeftPage(1); }}
            page={leftPage}
            onPage={setLeftPage}
            selectedProduct={leftSelected}
            onSelectProduct={setLeftSelected}
            selectedVariant={leftVariantId}
            onSelectVariant={setLeftVariantId}
            variants={leftVariants}
            isLoadingVariants={leftVariantsLoading}
            linkedMap={leftLinkedMap}
          />

          <div className="flex flex-col items-center justify-center gap-2 pt-8">
            <div className="w-px flex-1 bg-slate-200" />
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
              <Link2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="w-px flex-1 bg-slate-200" />
          </div>

          <PlatformColumn
            label="Platform B"
            platforms={platforms.filter(p => p.id !== leftPlatformId)}
            selectedPlatformId={rightPlatformId}
            onPlatformChange={id => { setRightPlatformId(id); setRightSelected(null); setRightPage(1); setRightSearch(''); }}
            products={rightProducts}
            isLoading={rightLoading}
            search={rightSearch}
            onSearch={s => { setRightSearch(s); setRightPage(1); }}
            page={rightPage}
            onPage={setRightPage}
            selectedProduct={rightSelected}
            onSelectProduct={setRightSelected}
            selectedVariant={rightVariantId}
            onSelectVariant={setRightVariantId}
            variants={rightVariants}
            isLoadingVariants={rightVariantsLoading}
            linkedMap={rightLinkedMap}
          />
        </div>

        {/* SKU field + link button */}
        {(leftSelected || rightSelected) && (
          <div className="flex items-end gap-3 pt-2 border-t border-slate-100">
            <div className="flex-1">
              <label className="text-xs font-medium text-slate-600 mb-1 block">
                SKU for this link <span className="text-slate-400">(shared identifier across platforms)</span>
              </label>
              <Input
                placeholder="e.g. SHIRT-BLK-M"
                value={skuOverride}
                onChange={e => setSkuOverride(e.target.value)}
              />
            </div>
            <Button
              onClick={handleLink}
              disabled={!canLink || isLinking}
              className="bg-emerald-600 hover:bg-emerald-700 shrink-0"
            >
              {isLinking
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Linking…</>
                : <><Link2 className="w-4 h-4 mr-2" />Link These</>}
            </Button>
          </div>
        )}

        {leftSelected && rightSelected && (
          <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="truncate">
              <strong>{leftSelected.title}</strong>
              {leftVariantId && leftVariantId !== '__none__' && ` (${leftVariants.find(v => v.id === leftVariantId)?.label ?? leftVariantId})`}
              {' ↔ '}
              <strong>{rightSelected.title}</strong>
              {rightVariantId && rightVariantId !== '__none__' && ` (${rightVariants.find(v => v.id === rightVariantId)?.label ?? rightVariantId})`}
            </span>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
