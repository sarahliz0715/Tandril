import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Package, Search, RefreshCw, AlertTriangle, CheckCircle,
  Bot, Loader2, Store, ChevronDown, ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient';
import { handleAuthError } from '@/utils/authHelpers';
import { getShopifyInventory } from '@/lib/supabaseFunctions';

const PLATFORM_CONFIG = {
  shopify:     { label: 'Shopify',      light: 'bg-green-50 border-green-200',    badge: 'bg-green-100 text-green-800' },
  woocommerce: { label: 'WooCommerce',  light: 'bg-purple-50 border-purple-200',  badge: 'bg-purple-100 text-purple-800' },
  ebay:        { label: 'eBay',         light: 'bg-blue-50 border-blue-200',      badge: 'bg-blue-100 text-blue-800' },
  etsy:        { label: 'Etsy',         light: 'bg-orange-50 border-orange-200',  badge: 'bg-orange-100 text-orange-800' },
  amazon:      { label: 'Amazon',       light: 'bg-yellow-50 border-yellow-200',  badge: 'bg-yellow-100 text-yellow-800' },
  faire:       { label: 'Faire',        light: 'bg-teal-50 border-teal-200',      badge: 'bg-teal-100 text-teal-800' },
  walmart:     { label: 'Walmart',      light: 'bg-sky-50 border-sky-200',        badge: 'bg-sky-100 text-sky-800' },
  wish:        { label: 'Wish',         light: 'bg-pink-50 border-pink-200',      badge: 'bg-pink-100 text-pink-800' },
  printful:    { label: 'Printful',     light: 'bg-slate-50 border-slate-200',    badge: 'bg-slate-100 text-slate-700' },
  redbubble:   { label: 'Redbubble',   light: 'bg-red-50 border-red-200',        badge: 'bg-red-100 text-red-800' },
  teepublic:   { label: 'TeePublic',   light: 'bg-emerald-50 border-emerald-200', badge: 'bg-emerald-100 text-emerald-800' },
  ecwid:       { label: 'Ecwid',        light: 'bg-indigo-50 border-indigo-200',  badge: 'bg-indigo-100 text-indigo-800' },
  magento:     { label: 'Magento',      light: 'bg-orange-50 border-orange-200',  badge: 'bg-orange-100 text-orange-800' },
  prestashop:  { label: 'PrestaShop',  light: 'bg-blue-50 border-blue-200',      badge: 'bg-blue-100 text-blue-800' },
};

const getPlatformConfig = (type) =>
  PLATFORM_CONFIG[type] || {
    label: type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Unknown',
    light: 'bg-slate-50 border-slate-200',
    badge: 'bg-slate-100 text-slate-700',
  };

const STATUS_COLORS = {
  active:   'bg-green-100 text-green-800',
  inactive: 'bg-slate-100 text-slate-600',
  draft:    'bg-slate-100 text-slate-600',
  archived: 'bg-red-100 text-red-800',
  publish:  'bg-green-100 text-green-800',
};

export default function Products() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [sortBy, setSortBy] = useState('title_asc');
  const [collapsedStores, setCollapsedStores] = useState({});

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const [{ data: platformData }, { data: dbProducts }, liveItems] = await Promise.all([
        supabase.from('platforms').select('id, name, platform_type').eq('user_id', user.id).eq('is_active', true),
        supabase.from('products').select('*').eq('user_id', user.id).limit(1000),
        getShopifyInventory().catch(() => []),
      ]);

      setPlatforms(platformData || []);

      // Platform types handled by the live inventory fetch — pre-seed so that even if a
      // connected platform returns 0 active items (e.g. only listing was just ended), we
      // still exclude stale DB rows for that platform from the fallback list.
      const LIVE_FETCH_PLATFORMS = new Set(['shopify', 'ebay', 'tiktok_shop', 'amazon']);
      const livePlatformTypes = new Set(
        (platformData || []).map(p => p.platform_type).filter(pt => LIVE_FETCH_PLATFORMS.has(pt))
      );

      // Normalize live items (Shopify + eBay) from smart-api format → Products format
      const liveProducts = (liveItems || []).map(item => {
        const pt = item.source || 'shopify';
        livePlatformTypes.add(pt);
        return {
          id: item.id,
          title: item.product_name || item.sku || 'Unnamed',
          sku: item.sku,
          price: item.base_price ?? 0,
          inventory_quantity: item.total_stock ?? 0,
          status: item.status === 'out_of_stock' || item.status === 'low_stock' ? 'active' : (item.status || 'active'),
          vendor: item.vendor || '',
          product_type: item.category || '',
          platform_type: pt,
          image_url: item.image_url || null,
        };
      });

      // DB products for platforms not covered by live fetch (Printful, Ecwid, etc.)
      const dbFiltered = (dbProducts || []).filter(p => !livePlatformTypes.has(p.platform_type));

      setProducts([...liveProducts, ...dbFiltered]);
    } catch (error) {
      console.error('Error loading products:', error);
      if (!handleAuthError(error, navigate, { showToast: false })) {
        toast.error('Failed to load products');
      }
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  useEffect(() => { loadData(); }, [loadData]);

  // Map platform_type → display name from connected platforms
  const platformNameMap = useMemo(() => {
    const map = {};
    platforms.forEach(p => { map[p.platform_type] = p.name; });
    return map;
  }, [platforms]);

  const sortedFilteredProducts = useMemo(() => {
    let result = products;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.title?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.vendor?.toLowerCase().includes(q) ||
        p.product_type?.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') {
      result = result.filter(p => (p.status || '').toLowerCase() === statusFilter);
    }
    if (platformFilter !== 'all') {
      result = result.filter(p => p.platform_type === platformFilter);
    }

    return [...result].sort((a, b) => {
      switch (sortBy) {
        case 'title_asc':  return (a.title || '').localeCompare(b.title || '');
        case 'title_desc': return (b.title || '').localeCompare(a.title || '');
        case 'sku_asc':    return (a.sku || '').localeCompare(b.sku || '');
        case 'sku_desc':   return (b.sku || '').localeCompare(a.sku || '');
        case 'price_asc':  return (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0);
        case 'price_desc': return (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0);
        case 'stock_asc':  return (a.inventory_quantity ?? 999999) - (b.inventory_quantity ?? 999999);
        default: return 0;
      }
    });
  }, [products, searchQuery, statusFilter, platformFilter, sortBy]);

  // Group sorted+filtered products by platform, then sort groups alphabetically
  const groupedByPlatform = useMemo(() => {
    const groups = {};
    sortedFilteredProducts.forEach(p => {
      const pt = p.platform_type || 'unknown';
      if (!groups[pt]) groups[pt] = [];
      groups[pt].push(p);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [sortedFilteredProducts]);

  const stats = useMemo(() => ({
    total: products.length,
    active: products.filter(p => p.status === 'active' || p.status === 'publish').length,
    lowStock: products.filter(p => {
      const q = p.inventory_quantity;
      return q != null && q > 0 && q <= 5;
    }).length,
    outOfStock: products.filter(p => p.inventory_quantity === 0).length,
  }), [products]);

  const connectedPlatformTypes = useMemo(() =>
    [...new Set(products.map(p => p.platform_type).filter(Boolean))],
    [products]
  );

  const toggleStore = (pt) =>
    setCollapsedStores(prev => ({ ...prev, [pt]: !prev[pt] }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <p className="text-slate-600">Loading products from all your stores...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Package className="w-8 h-8 text-emerald-600" />
            Products
          </h1>
          <p className="text-slate-600 mt-1">
            All products across your connected stores
            {platforms.length > 0 && ` · ${platforms.length} store${platforms.length !== 1 ? 's' : ''} connected`}
          </p>
        </div>
        <Button variant="outline" onClick={loadData} disabled={isLoading}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <Package className="w-8 h-8 text-emerald-400" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Active</p>
              <p className="text-2xl font-bold text-green-600">{stats.active}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Low Stock</p>
              <p className="text-2xl font-bold text-amber-600">{stats.lowStock}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-amber-400" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Out of Stock</p>
              <p className="text-2xl font-bold text-red-600">{stats.outOfStock}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </CardContent>
        </Card>
      </div>

      {/* Filters + Sort */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title, SKU, vendor, or type..."
                className="pl-10"
              />
            </div>
            {connectedPlatformTypes.length > 1 && (
              <Select value={platformFilter} onValueChange={setPlatformFilter}>
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue placeholder="All Stores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stores</SelectItem>
                  {connectedPlatformTypes.map(pt => (
                    <SelectItem key={pt} value={pt}>
                      {platformNameMap[pt] || getPlatformConfig(pt).label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="title_asc">Title A → Z</SelectItem>
                <SelectItem value="title_desc">Title Z → A</SelectItem>
                <SelectItem value="sku_asc">SKU A → Z</SelectItem>
                <SelectItem value="sku_desc">SKU Z → A</SelectItem>
                <SelectItem value="price_asc">Price: Low → High</SelectItem>
                <SelectItem value="price_desc">Price: High → Low</SelectItem>
                <SelectItem value="stock_asc">Stock: Low → High</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Product groups */}
      {products.length === 0 ? (
        <Card>
          <CardContent className="p-16 text-center">
            <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-slate-700 font-semibold mb-1">No Products Yet</p>
            <p className="text-slate-500 text-sm mb-4">
              Connect a store in Platforms — products sync automatically on connect.
            </p>
            <Button onClick={() => navigate(createPageUrl('Platforms'))}>
              Go to Platforms
            </Button>
          </CardContent>
        </Card>
      ) : sortedFilteredProducts.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Search className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <p className="text-slate-700 font-medium mb-2">No products match your filters</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setSearchQuery(''); setStatusFilter('all'); setPlatformFilter('all'); }}
            >
              Clear filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {groupedByPlatform.map(([platformType, platformProducts]) => {
            const config = getPlatformConfig(platformType);
            const storeName = platformNameMap[platformType] || config.label;
            const isCollapsed = collapsedStores[platformType];

            return (
              <div key={platformType} className={`rounded-xl border ${config.light} overflow-hidden`}>
                {/* Store section header — click to collapse */}
                <button
                  onClick={() => toggleStore(platformType)}
                  className={`w-full flex items-center justify-between px-5 py-3.5 ${config.light} hover:brightness-95 transition-all text-left`}
                >
                  <div className="flex items-center gap-3">
                    <Store className="w-4 h-4 text-slate-500 flex-shrink-0" />
                    <span className="font-semibold text-slate-800 text-sm">{storeName}</span>
                    <Badge className={`text-xs ${config.badge}`}>
                      {platformProducts.length} product{platformProducts.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  {isCollapsed
                    ? <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    : <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  }
                </button>

                {/* Product table */}
                {!isCollapsed && (
                  <div className="bg-white overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                          <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            Product
                          </th>
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">
                            SKU
                          </th>
                          <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            Price
                          </th>
                          <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">
                            Stock
                          </th>
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">
                            Status
                          </th>
                          <th className="px-4 py-2.5 w-20" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {platformProducts.map((product, i) => {
                          const price = product.price != null
                            ? `$${parseFloat(product.price).toFixed(2)}`
                            : '—';
                          const stock = product.inventory_quantity;
                          const isOutOfStock = stock === 0;
                          const isLowStock = stock != null && stock > 0 && stock <= 5;

                          return (
                            <tr key={product.id || i} className="hover:bg-slate-50/60 transition-colors">
                              <td className="px-5 py-3">
                                <div>
                                  <p className="font-medium text-slate-900 leading-tight">
                                    {product.title || '—'}
                                  </p>
                                  {product.vendor && (
                                    <p className="text-xs text-slate-400 mt-0.5">{product.vendor}</p>
                                  )}
                                  {product.product_type && (
                                    <p className="text-xs text-slate-400">{product.product_type}</p>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 hidden sm:table-cell">
                                <span className="font-mono text-xs text-slate-500">
                                  {product.sku || '—'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className="font-medium text-slate-900">{price}</span>
                              </td>
                              <td className="px-4 py-3 text-right hidden md:table-cell">
                                {stock != null ? (
                                  <span className={`text-xs font-semibold ${
                                    isOutOfStock ? 'text-red-600' :
                                    isLowStock   ? 'text-amber-600' :
                                                   'text-green-600'
                                  }`}>
                                    {isOutOfStock ? 'Out' : stock}
                                  </span>
                                ) : (
                                  <span className="text-slate-300 text-xs">—</span>
                                )}
                              </td>
                              <td className="px-4 py-3 hidden lg:table-cell">
                                {product.status && (
                                  <Badge className={`text-xs ${STATUS_COLORS[product.status] || STATUS_COLORS.draft}`}>
                                    {product.status}
                                  </Badge>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-xs text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 px-2"
                                  title="Ask Orion about this product"
                                  onClick={() => navigate(
                                    createPageUrl('AIAdvisor') +
                                    `?prompt=${encodeURIComponent(`Tell me about "${product.title}" and suggest optimizations for pricing, SEO, and inventory.`)}`
                                  )}
                                >
                                  <Bot className="w-3 h-3 mr-1" />
                                  Orion
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
