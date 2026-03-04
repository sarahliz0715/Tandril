import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Package, Search, RefreshCw, ExternalLink, Tag, AlertTriangle, CheckCircle,
  TrendingUp, DollarSign, BarChart3, Bot, Loader2, Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/apiClient';
import { User } from '@/lib/entities';
import { handleAuthError } from '@/utils/authHelpers';
import { NoDataEmptyState, NoResultsEmptyState } from '../components/common/EmptyState';

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-800',
  draft: 'bg-slate-100 text-slate-700',
  archived: 'bg-red-100 text-red-800',
};

export default function Products() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const user = await User.me();
      setCurrentUser(user);

      const response = await api.functions.invoke('smart-api', {
        execute_action: { type: 'get_products', limit: 250 }
      });
      const items = response?.execution_result?.products || response?.products || [];
      setProducts(items);
    } catch (error) {
      console.error('Error loading products:', error);
      if (!handleAuthError(error, navigate, { showToast: false })) {
        toast.error('Failed to load products', {
          description: 'Make sure a Shopify store is connected in Platforms.'
        });
      }
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const filteredProducts = useMemo(() => {
    let result = products;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.title?.toLowerCase().includes(q) ||
        p.product_type?.toLowerCase().includes(q) ||
        p.vendor?.toLowerCase().includes(q) ||
        p.tags?.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') {
      result = result.filter(p => p.status === statusFilter);
    }
    return result;
  }, [products, searchQuery, statusFilter]);

  const stats = useMemo(() => ({
    total: products.length,
    active: products.filter(p => p.status === 'active').length,
    draft: products.filter(p => p.status === 'draft').length,
    outOfStock: products.filter(p =>
      p.variants?.every(v => v.inventory_quantity <= 0)
    ).length,
  }), [products]);

  const getProductImage = (product) => {
    return product.image?.src || product.images?.[0]?.src || null;
  };

  const getTotalInventory = (product) => {
    if (!product.variants) return 0;
    return product.variants.reduce((sum, v) => sum + (v.inventory_quantity || 0), 0);
  };

  const getPrice = (product) => {
    if (!product.variants?.length) return null;
    const prices = product.variants.map(v => parseFloat(v.price || 0));
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return min === max ? `$${min.toFixed(2)}` : `$${min.toFixed(2)} – $${max.toFixed(2)}`;
  };

  const handleAskOrion = (product) => {
    navigate(createPageUrl('AIAdvisor') + `?prompt=${encodeURIComponent(`Tell me about "${product.title}" and suggest optimizations for pricing, SEO, and inventory.`)}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-slate-600">Loading products from Shopify...</p>
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
            <Package className="w-8 h-8 text-indigo-600" />
            Products
          </h1>
          <p className="text-slate-600 mt-1">View and manage your Shopify product catalog</p>
        </div>
        <Button variant="outline" onClick={loadProducts} disabled={isLoading}>
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
            <Package className="w-8 h-8 text-indigo-400" />
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
              <p className="text-sm text-slate-500">Drafts</p>
              <p className="text-2xl font-bold text-slate-500">{stats.draft}</p>
            </div>
            <Tag className="w-8 h-8 text-slate-300" />
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

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title, type, vendor, or tags..."
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Product Grid */}
      {filteredProducts.length === 0 ? (
        searchQuery || statusFilter !== 'all' ? (
          <NoResultsEmptyState onClear={() => { setSearchQuery(''); setStatusFilter('all'); }} />
        ) : (
          <NoDataEmptyState
            entityName="Products"
            onCreate={() => navigate(createPageUrl('Platforms'))}
          />
        )
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((product) => {
            const image = getProductImage(product);
            const inventory = getTotalInventory(product);
            const price = getPrice(product);
            const isOutOfStock = inventory === 0;

            return (
              <Card key={product.id} className="overflow-hidden hover:shadow-md transition-shadow">
                {/* Product Image */}
                <div className="relative h-48 bg-slate-100">
                  {image ? (
                    <img
                      src={image}
                      alt={product.title}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-12 h-12 text-slate-300" />
                    </div>
                  )}
                  {product.status && (
                    <Badge className={`absolute top-2 left-2 text-xs ${STATUS_COLORS[product.status] || STATUS_COLORS.draft}`}>
                      {product.status}
                    </Badge>
                  )}
                  {isOutOfStock && (
                    <Badge className="absolute top-2 right-2 text-xs bg-red-100 text-red-800">
                      Out of Stock
                    </Badge>
                  )}
                </div>

                <CardContent className="p-4 space-y-3">
                  {/* Title & Vendor */}
                  <div>
                    <h3 className="font-semibold text-slate-900 text-sm leading-tight line-clamp-2">
                      {product.title}
                    </h3>
                    {product.vendor && (
                      <p className="text-xs text-slate-500 mt-0.5">{product.vendor}</p>
                    )}
                  </div>

                  {/* Price & Inventory */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-900">{price || '—'}</span>
                    <span className={`text-xs font-medium ${isOutOfStock ? 'text-red-600' : inventory < 5 ? 'text-amber-600' : 'text-green-600'}`}>
                      {inventory} in stock
                    </span>
                  </div>

                  {/* Variants count */}
                  {product.variants?.length > 1 && (
                    <p className="text-xs text-slate-500">{product.variants.length} variants</p>
                  )}

                  {/* Tags */}
                  {product.tags && (
                    <div className="flex flex-wrap gap-1">
                      {product.tags.split(',').slice(0, 3).map((tag, i) => (
                        <Badge key={i} variant="outline" className="text-xs px-1.5 py-0">
                          {tag.trim()}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => handleAskOrion(product)}
                    >
                      <Bot className="w-3 h-3 mr-1" />
                      Ask Orion
                    </Button>
                    {product.handle && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs px-2"
                        onClick={() => window.open(`https://admin.shopify.com/store/products/${product.id}`, '_blank')}
                        title="View in Shopify"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
