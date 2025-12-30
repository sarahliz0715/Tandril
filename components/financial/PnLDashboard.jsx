import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Package,
  Truck,
  CreditCard,
  AlertTriangle,
  Calendar,
  RefreshCw,
  Loader2,
  ChevronDown,
  Store
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { handleAuthError } from '@/utils/authHelpers';
import { useNavigate } from 'react-router-dom';

export default function PnLDashboard() {
  const [pnlData, setPnlData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('30days');
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const navigate = useNavigate();

  const periods = {
    '7days': { label: 'Last 7 Days', days: 7 },
    '30days': { label: 'Last 30 Days', days: 30 },
    '90days': { label: 'Last 90 Days', days: 90 },
    'ytd': { label: 'Year to Date', days: null }
  };

  const loadPnLData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Calculate date range
      const endDate = new Date();
      let startDate;

      if (selectedPeriod === 'ytd') {
        startDate = new Date(endDate.getFullYear(), 0, 1); // Jan 1st of current year
      } else {
        const days = periods[selectedPeriod].days;
        startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
      }

      const params = {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString()
      };

      if (selectedPlatform !== 'all') {
        params.platform_id = selectedPlatform;
      }

      const data = await base44.functions.calculatePnL(params);
      setPnlData(data);
    } catch (error) {
      console.error('Failed to load P&L data:', error);

      if (handleAuthError(error, navigate, { showToast: true })) {
        return;
      }

      toast.error("Failed to load P&L data", {
        description: "Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedPeriod, selectedPlatform, navigate]);

  useEffect(() => {
    loadPnLData();
  }, [loadPnLData]);

  // Calculate metrics
  const metrics = pnlData ? {
    revenue: pnlData.revenue || 0,
    cogs: pnlData.cogs || 0,
    shippingCosts: pnlData.shipping_costs || 0,
    platformFees: pnlData.platform_fees || 0,
    adSpend: pnlData.ad_spend || 0,
    refunds: pnlData.refunds || 0,
    netProfit: pnlData.net_profit || 0,
    profitMargin: pnlData.profit_margin || 0,
    totalOrders: pnlData.total_orders || 0,
    avgOrderValue: pnlData.total_orders > 0 ? pnlData.revenue / pnlData.total_orders : 0
  } : null;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatPercent = (percent) => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(1)}%`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-slate-600">Loading financial data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Profit & Loss Dashboard</h2>
          <p className="text-slate-600 mt-1">Real-time financial performance across all platforms</p>
        </div>
        <div className="flex gap-2">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {Object.entries(periods).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <Button
            onClick={loadPnLData}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-slate-600">Total Revenue</p>
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(metrics.revenue)}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                {metrics.totalOrders} orders
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Net Profit */}
        <Card className={metrics.netProfit >= 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-slate-600">Net Profit</p>
              {metrics.netProfit >= 0 ? (
                <TrendingUp className="w-5 h-5 text-green-600" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-600" />
              )}
            </div>
            <p className={`text-2xl font-bold ${metrics.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(metrics.netProfit)}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Badge className={metrics.profitMargin >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                {formatPercent(metrics.profitMargin)} margin
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Average Order Value */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-slate-600">Avg Order Value</p>
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(metrics.avgOrderValue)}</p>
            <p className="text-xs text-slate-500 mt-2">Per transaction</p>
          </CardContent>
        </Card>

        {/* Total Costs */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-slate-600">Total Costs</p>
              <CreditCard className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {formatCurrency(metrics.cogs + metrics.shippingCosts + metrics.platformFees + metrics.adSpend + metrics.refunds)}
            </p>
            <p className="text-xs text-slate-500 mt-2">All expenses</p>
          </CardContent>
        </Card>
      </div>

      {/* Cost Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-red-600" />
            Cost Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* COGS */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-slate-600" />
                <div>
                  <p className="font-medium text-slate-900">Cost of Goods Sold (COGS)</p>
                  <p className="text-xs text-slate-500">Product costs</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-slate-900">{formatCurrency(metrics.cogs)}</p>
                {metrics.cogs === 0 && pnlData?.needs_cogs_data && (
                  <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Missing data
                  </Badge>
                )}
              </div>
            </div>

            {/* Shipping Costs */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-3">
                <Truck className="w-5 h-5 text-slate-600" />
                <div>
                  <p className="font-medium text-slate-900">Shipping Costs</p>
                  <p className="text-xs text-slate-500">Fulfillment expenses</p>
                </div>
              </div>
              <p className="font-bold text-slate-900">{formatCurrency(metrics.shippingCosts)}</p>
            </div>

            {/* Platform Fees */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-slate-600" />
                <div>
                  <p className="font-medium text-slate-900">Platform & Transaction Fees</p>
                  <p className="text-xs text-slate-500">Shopify, payment processing</p>
                </div>
              </div>
              <p className="font-bold text-slate-900">{formatCurrency(metrics.platformFees)}</p>
            </div>

            {/* Ad Spend */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-slate-600" />
                <div>
                  <p className="font-medium text-slate-900">Advertising Spend</p>
                  <p className="text-xs text-slate-500">Marketing costs</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-slate-900">{formatCurrency(metrics.adSpend)}</p>
                {metrics.adSpend === 0 && (
                  <Badge variant="outline" className="text-xs text-slate-500">
                    Not tracked yet
                  </Badge>
                )}
              </div>
            </div>

            {/* Refunds */}
            {metrics.refunds > 0 && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 border border-red-200">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <div>
                    <p className="font-medium text-slate-900">Refunds</p>
                    <p className="text-xs text-slate-500">Returns processed</p>
                  </div>
                </div>
                <p className="font-bold text-red-600">{formatCurrency(metrics.refunds)}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Platform Breakdown */}
      {pnlData?.platforms && pnlData.platforms.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="w-5 h-5 text-blue-600" />
              Platform Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pnlData.platforms.map((platform, index) => (
                <div key={platform.platform_id || index} className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-slate-900">{platform.platform_name}</h4>
                    {platform.success ? (
                      <Badge className="bg-green-100 text-green-700">Active</Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-700">Error</Badge>
                    )}
                  </div>

                  {platform.success ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                      <div>
                        <p className="text-xs text-slate-500">Revenue</p>
                        <p className="font-bold text-green-600">{formatCurrency(platform.revenue || 0)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Orders</p>
                        <p className="font-bold text-slate-900">{platform.total_orders || 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Fees</p>
                        <p className="font-bold text-orange-600">{formatCurrency(platform.platform_fees || 0)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Products</p>
                        <p className="font-bold text-blue-600">{platform.unique_products || 0}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-red-600">{platform.error}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Quality Alerts */}
      {pnlData?.needs_cogs_data && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900">COGS Data Missing</p>
                <p className="text-sm text-amber-700 mt-1">
                  Product cost data is not available. Net profit calculations will be inaccurate.
                  To get accurate P&L, ensure your products have cost data in Shopify under "Cost per item".
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
