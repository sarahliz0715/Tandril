import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, DollarSign, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/apiClient';

const positionConfig = {
  below: { label: 'Below Market', color: 'bg-blue-100 text-blue-800', icon: TrendingDown },
  competitive: { label: 'Competitively Priced', color: 'bg-green-100 text-green-800', icon: Minus },
  premium: { label: 'Premium Priced', color: 'bg-amber-100 text-amber-800', icon: TrendingUp },
};

export default function PriceBenchmarkCard() {
  const [productName, setProductName] = useState('');
  const [myPrice, setMyPrice] = useState('');
  const [keywords, setKeywords] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleBenchmark = async (e) => {
    e.preventDefault();
    if (!productName || !myPrice) return;

    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await api.functions.invoke('price-benchmark', {
        product_name: productName,
        my_price: parseFloat(myPrice),
        keywords: keywords || undefined,
      });

      if (response?.success) {
        setResult(response);
        toast.success('Benchmark complete');
      } else {
        throw new Error(response?.error || 'Benchmark failed');
      }
    } catch (err) {
      setError(err.message || 'Failed to run benchmark');
      toast.error('Benchmark failed', { description: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const stats = result?.market_data;
  const position = result?.position ? positionConfig[result.position] : null;
  const PositionIcon = position?.icon;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-emerald-600" />
          Price Benchmark
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleBenchmark} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="pb-product">Product Name</Label>
            <Input
              id="pb-product"
              placeholder="e.g. custom plant themed high top sneakers"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="pb-price">My Price ($)</Label>
              <Input
                id="pb-price"
                type="number"
                step="0.01"
                min="0"
                placeholder="75.00"
                value={myPrice}
                onChange={(e) => setMyPrice(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pb-keywords">Search Keywords <span className="text-slate-400 font-normal">(optional)</span></Label>
              <Input
                id="pb-keywords"
                placeholder="plant themed shoes"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>
          <Button type="submit" disabled={isLoading || !productName || !myPrice} className="w-full">
            {isLoading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Benchmarking...</>
            ) : (
              'Run Price Benchmark'
            )}
          </Button>
        </form>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && (
          <div className="space-y-4 pt-2 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Your price: <strong>${parseFloat(result.my_price).toFixed(2)}</strong></span>
              {position && (
                <Badge className={`${position.color} flex items-center gap-1`}>
                  <PositionIcon className="w-3 h-3" />
                  {position.label}
                </Badge>
              )}
            </div>

            {stats?.ebay_sold && (
              <div className="bg-slate-50 rounded-lg p-3 space-y-1 text-sm">
                <p className="font-medium text-slate-700">eBay Recently Sold ({stats.ebay_sold.count} items)</p>
                <div className="grid grid-cols-3 gap-2 text-slate-600">
                  <div><span className="text-xs text-slate-400 block">Median</span>${stats.ebay_sold.median.toFixed(2)}</div>
                  <div><span className="text-xs text-slate-400 block">Range</span>${stats.ebay_sold.min.toFixed(2)}–${stats.ebay_sold.max.toFixed(2)}</div>
                  <div><span className="text-xs text-slate-400 block">Mid 50%</span>${stats.ebay_sold.p25.toFixed(2)}–${stats.ebay_sold.p75.toFixed(2)}</div>
                </div>
              </div>
            )}

            {stats?.ebay_active && (
              <div className="bg-slate-50 rounded-lg p-3 space-y-1 text-sm">
                <p className="font-medium text-slate-700">eBay Active Listings ({stats.ebay_active.count} items)</p>
                <div className="grid grid-cols-3 gap-2 text-slate-600">
                  <div><span className="text-xs text-slate-400 block">Median</span>${stats.ebay_active.median.toFixed(2)}</div>
                  <div><span className="text-xs text-slate-400 block">Range</span>${stats.ebay_active.min.toFixed(2)}–${stats.ebay_active.max.toFixed(2)}</div>
                  <div><span className="text-xs text-slate-400 block">Mid 50%</span>${stats.ebay_active.p25.toFixed(2)}–${stats.ebay_active.p75.toFixed(2)}</div>
                </div>
              </div>
            )}

            {result.analysis && (
              <div className="text-sm text-slate-700 leading-relaxed bg-emerald-50 rounded-lg p-3 border border-emerald-100">
                {result.analysis}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
