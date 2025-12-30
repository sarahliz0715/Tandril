import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  Package,
  CheckCircle,
  Clock,
  RefreshCw,
  Loader2,
  TrendingDown,
  ShoppingBag,
  Mail,
  ExternalLink
} from 'lucide-react';
import { api } from '@/api/apiClient';
import { toast } from 'sonner';
import { handleAuthError } from '@/utils/authHelpers';
import { useNavigate } from 'react-router-dom';

export default function OrderIntelligence() {
  const [orderData, setOrderData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stuckDays, setStuckDays] = useState(3);
  const [lookbackDays, setLookbackDays] = useState(30);
  const navigate = useNavigate();

  const loadOrderData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.functions.monitorOrders({
        stuck_days: stuckDays,
        lookback_days: lookbackDays,
        include_returns: true
      });
      setOrderData(data);
    } catch (error) {
      console.error('Failed to load order data:', error);

      if (handleAuthError(error, navigate, { showToast: true })) {
        return;
      }

      toast.error("Failed to load order data", {
        description: "Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  }, [stuckDays, lookbackDays, navigate]);

  useEffect(() => {
    loadOrderData();
  }, [loadOrderData]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-slate-600">Loading order intelligence...</p>
        </div>
      </div>
    );
  }

  const { stuck_orders = [], fulfillment_summary = {}, returns_summary = {} } = orderData || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Order Intelligence</h2>
          <p className="text-slate-600 mt-1">Monitor fulfillment, detect stuck orders, and track returns</p>
        </div>
        <div className="flex gap-2">
          <select
            value={stuckDays}
            onChange={(e) => setStuckDays(Number(e.target.value))}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={1}>Stuck: 1+ days</option>
            <option value={2}>Stuck: 2+ days</option>
            <option value={3}>Stuck: 3+ days</option>
            <option value={5}>Stuck: 5+ days</option>
            <option value={7}>Stuck: 7+ days</option>
          </select>
          <select
            value={lookbackDays}
            onChange={(e) => setLookbackDays(Number(e.target.value))}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={7}>Last 7 Days</option>
            <option value={14}>Last 14 Days</option>
            <option value={30}>Last 30 Days</option>
            <option value={60}>Last 60 Days</option>
          </select>
          <Button onClick={loadOrderData} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Orders */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-slate-600">Total Orders</p>
              <ShoppingBag className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{fulfillment_summary.total_orders || 0}</p>
            <p className="text-xs text-slate-500 mt-2">Last {lookbackDays} days</p>
          </CardContent>
        </Card>

        {/* Stuck Orders */}
        <Card className={stuck_orders.length > 0 ? 'border-red-200 bg-red-50' : ''}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-slate-600">Stuck Orders</p>
              <AlertTriangle className={`w-5 h-5 ${stuck_orders.length > 0 ? 'text-red-600' : 'text-slate-400'}`} />
            </div>
            <p className={`text-2xl font-bold ${stuck_orders.length > 0 ? 'text-red-600' : 'text-slate-900'}`}>
              {stuck_orders.length}
            </p>
            <p className="text-xs text-slate-500 mt-2">Unfulfilled {stuckDays}+ days</p>
          </CardContent>
        </Card>

        {/* Fulfillment Rate */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-slate-600">Fulfillment Rate</p>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-600">
              {fulfillment_summary.total_orders > 0
                ? Math.round((fulfillment_summary.fulfilled / fulfillment_summary.total_orders) * 100)
                : 0}%
            </p>
            <p className="text-xs text-slate-500 mt-2">
              {fulfillment_summary.fulfilled || 0} fulfilled
            </p>
          </CardContent>
        </Card>

        {/* Return Rate */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-slate-600">Return Rate</p>
              <TrendingDown className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-orange-600">
              {returns_summary.return_rate?.toFixed(1) || 0}%
            </p>
            <p className="text-xs text-slate-500 mt-2">
              {formatCurrency(returns_summary.total_refund_amount || 0)} refunded
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Stuck Orders List */}
      {stuck_orders.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-5 h-5" />
              Stuck Orders Requiring Attention ({stuck_orders.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stuck_orders.slice(0, 10).map((order, index) => (
                <div
                  key={order.order_id || index}
                  className="p-4 rounded-lg bg-red-50 border border-red-200 hover:bg-red-100 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-slate-900">{order.order_name}</h4>
                        <Badge className="bg-red-100 text-red-700">
                          {order.days_stuck} days stuck
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {order.fulfillment_status || 'unfulfilled'}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-slate-500">Customer</p>
                          <p className="font-medium text-slate-900">{order.customer_name}</p>
                          {order.customer_email && (
                            <a
                              href={`mailto:${order.customer_email}`}
                              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <Mail className="w-3 h-3" />
                              Email
                            </a>
                          )}
                        </div>

                        <div>
                          <p className="text-xs text-slate-500">Order Value</p>
                          <p className="font-bold text-green-600">{formatCurrency(order.total_price)}</p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-500">Items</p>
                          <p className="font-medium text-slate-900">{order.line_items_count}</p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-500">Created</p>
                          <p className="font-medium text-slate-900">{formatDate(order.created_at)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 ml-4">
                      <Button size="sm" variant="outline" className="text-xs">
                        <ExternalLink className="w-3 h-3 mr-1" />
                        View in Shopify
                      </Button>
                      <Button size="sm" className="bg-red-600 hover:bg-red-700 text-xs">
                        <Mail className="w-3 h-3 mr-1" />
                        Contact Customer
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {stuck_orders.length > 10 && (
                <p className="text-center text-sm text-slate-500 mt-4">
                  + {stuck_orders.length - 10} more stuck orders
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fulfillment Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            Fulfillment Status Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-green-50 border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-green-700">Fulfilled</p>
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-700">
                {fulfillment_summary.fulfilled || 0}
              </p>
              <p className="text-xs text-green-600 mt-1">
                {fulfillment_summary.total_orders > 0
                  ? ((fulfillment_summary.fulfilled / fulfillment_summary.total_orders) * 100).toFixed(1)
                  : 0}% of total
              </p>
            </div>

            <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-amber-700">Partially Fulfilled</p>
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <p className="text-2xl font-bold text-amber-700">
                {fulfillment_summary.partially_fulfilled || 0}
              </p>
              <p className="text-xs text-amber-600 mt-1">
                In progress
              </p>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-slate-700">Unfulfilled</p>
                <Package className="w-5 h-5 text-slate-600" />
              </div>
              <p className="text-2xl font-bold text-slate-700">
                {fulfillment_summary.unfulfilled || 0}
              </p>
              <p className="text-xs text-slate-600 mt-1">
                Awaiting fulfillment
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Returns Summary */}
      {returns_summary.total_returns > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-orange-600" />
              Returns & Refunds Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
                <p className="text-sm text-orange-700">Total Returns</p>
                <p className="text-xl font-bold text-orange-700">{returns_summary.total_returns}</p>
              </div>
              <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                <p className="text-sm text-red-700">Total Refunded</p>
                <p className="text-xl font-bold text-red-700">
                  {formatCurrency(returns_summary.total_refund_amount || 0)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <p className="text-sm text-slate-700">Return Rate</p>
                <p className="text-xl font-bold text-slate-700">
                  {returns_summary.return_rate?.toFixed(1) || 0}%
                </p>
              </div>
            </div>

            {returns_summary.return_rate > 5 && (
              <div className="p-4 rounded-lg bg-amber-50 border border-amber-300">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-900">High Return Rate Detected</p>
                    <p className="text-sm text-amber-700 mt-1">
                      Your return rate of {returns_summary.return_rate.toFixed(1)}% is higher than the
                      e-commerce average (2-5%). Consider reviewing product descriptions, sizing guides,
                      or product quality.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {stuck_orders.length === 0 && fulfillment_summary.total_orders === 0 && (
        <Card className="p-12">
          <div className="text-center">
            <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Orders Found</h3>
            <p className="text-slate-600">
              No orders found in the last {lookbackDays} days. Try adjusting the date range.
            </p>
          </div>
        </Card>
      )}

      {stuck_orders.length === 0 && fulfillment_summary.total_orders > 0 && (
        <Card className="p-8 bg-green-50 border-green-200">
          <div className="text-center">
            <CheckCircle className="w-12 h-12 mx-auto text-green-600 mb-4" />
            <h3 className="text-lg font-semibold text-green-900 mb-2">All Clear!</h3>
            <p className="text-green-700">
              No stuck orders found. All orders are being fulfilled on time.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
