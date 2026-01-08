import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Order } from '@/api/entities';
import { OrderItem } from '@/api/entities';
import { User } from '@/api/entities';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  Search, 
  Filter,
  ShoppingCart,
  TrendingUp,
  Package,
  DollarSign,
  Download,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { api } from '@/api/apiClient';
import OrderList from '../components/orders/OrderList';
import OrderDetails from '../components/orders/OrderDetails';
import { handleAuthError } from '@/utils/authHelpers';
import { useConfirmDialog, ConfirmDialog } from '@/hooks/useConfirmDialog';
import { NoDataEmptyState, NoResultsEmptyState } from '../components/common/EmptyState';

export default function Orders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const { isOpen, config, confirm, cancel } = useConfirmDialog();

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const data = await api.entities.Order.list('-order_date');
      setOrders(data || []);
    } catch (error) {
      console.error('Error loading orders:', error);
      // Don't redirect on data loading errors, just show empty state
      if (!handleAuthError(error, navigate, { showToast: false })) {
        setOrders([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-trigger order automations
  useEffect(() => {
    const checkOrderTriggers = async () => {
      if (!orders || orders.length === 0) return;

      const recentOrders = orders.filter(order => {
        const orderTime = new Date(order.order_date).getTime();
        const now = Date.now();
        return (now - orderTime) < 60000;
      });

      for (const order of recentOrders) {
        try {
          await api.functions.invoke('evaluateTriggers', {
            trigger_type: 'order_placed',
            trigger_data: {
              order_id: order.order_id,
              customer_name: order.customer_name,
              customer_email: order.customer_email,
              order_total: order.total_price,
              platform: order.platform,
              order_date: order.order_date
            }
          });

          if (order.status === 'shipped' && order.tracking_number) {
            await api.functions.invoke('evaluateTriggers', {
              trigger_type: 'order_shipped',
              trigger_data: {
                order_id: order.order_id,
                customer_email: order.customer_email,
                tracking_number: order.tracking_number
              }
            });
          }
        } catch (error) {
          console.error('Error triggering order automation:', error);
        }
      }
    };

    checkOrderTriggers();
  }, [orders]);

  const filteredOrders = useMemo(() => {
    let filtered = orders;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(order =>
        order.order_id?.toLowerCase().includes(query) ||
        order.customer_name?.toLowerCase().includes(query) ||
        order.customer_email?.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    return filtered;
  }, [orders, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: orders.length,
      pending: orders.filter(o => o.status === 'pending').length,
      processing: orders.filter(o => o.status === 'processing').length,
      shipped: orders.filter(o => o.status === 'shipped').length,
      totalRevenue: orders.reduce((sum, o) => sum + (o.total_price || 0), 0)
    };
  }, [orders]);

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setShowDetails(true);
  };

  const handleExport = () => {
    const csv = [
      ['Order ID', 'Date', 'Customer', 'Email', 'Status', 'Total', 'Platform'].join(','),
      ...filteredOrders.map(order => [
        order.order_id,
        format(new Date(order.order_date), 'yyyy-MM-dd'),
        order.customer_name,
        order.customer_email,
        order.status,
        order.total_price || 0,
        order.platform
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Orders exported');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Orders</h1>
          <p className="text-slate-600 mt-1">Manage and track your orders</p>
        </div>
        <Button
          variant="outline"
          onClick={handleExport}
          disabled={filteredOrders.length === 0}
        >
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Orders</p>
                <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
              </div>
              <ShoppingCart className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Pending</p>
                <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
              </div>
              <Package className="w-8 h-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Processing</p>
                <p className="text-2xl font-bold text-blue-600">{stats.processing}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Shipped</p>
                <p className="text-2xl font-bold text-green-600">{stats.shipped}</p>
              </div>
              <Package className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Revenue</p>
                <p className="text-2xl font-bold text-green-600">
                  ${stats.totalRevenue.toLocaleString()}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by order ID, customer name, or email..."
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredOrders.length === 0 ? (
            searchQuery || statusFilter !== 'all' ? (
              <NoResultsEmptyState
                title="No orders found"
                description="Try adjusting your search or filters"
                onReset={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
              />
            ) : (
              <NoDataEmptyState
                icon={ShoppingCart}
                title="No orders yet"
                description="Your orders will appear here once customers make purchases"
              />
            )
          ) : (
            <OrderList
              orders={filteredOrders}
              onViewOrder={handleViewOrder}
            />
          )}
        </CardContent>
      </Card>

      {selectedOrder && (
        <OrderDetails
          order={selectedOrder}
          isOpen={showDetails}
          onClose={() => {
            setShowDetails(false);
            setSelectedOrder(null);
          }}
          onRefresh={loadOrders}
        />
      )}

      <ConfirmDialog
        isOpen={isOpen}
        onConfirm={confirm}
        onCancel={cancel}
        {...config}
      />
    </div>
  );
}