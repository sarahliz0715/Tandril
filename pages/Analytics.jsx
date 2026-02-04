import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Order } from '@/lib/entities';
import { InventoryItem } from '@/lib/entities';
import { Platform } from '@/lib/entities';
import { AdCampaign } from '@/lib/entities';
import { User } from '@/lib/entities';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Loader2, 
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Package,
  Download,
  Calendar,
  BarChart3
} from 'lucide-react';
import { toast } from 'sonner';
import AnalyticsOverview from '../components/analytics/AnalyticsOverview';
import SalesTrendChart from '../components/analytics/SalesTrendChart';
import PlatformBreakdown from '../components/analytics/PlatformBreakdown';
import TopPerformingProducts from '../components/analytics/TopPerformingProducts';
import KeyMetrics from '../components/analytics/KeyMetrics';
import { DateRangePicker } from '../components/ui/date-range-picker';
import { handleAuthError } from '@/utils/authHelpers';
import { NoDataEmptyState } from '../components/common/EmptyState';

export default function Analytics() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    to: new Date()
  });
  const [timeRange, setTimeRange] = useState('30d');
  const navigate = useNavigate();

  // Memoize beta access check
  const hasBetaAccess = useMemo(() => {
    return currentUser && currentUser.user_mode === 'beta';
  }, [currentUser]);

  // Load analytics data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [user, ordersData, productsData, platformsData, campaignsData] = await Promise.all([
        User.me(),
        Order.list('-order_date', 500).catch(err => {
          console.error('Error fetching orders:', err);
          return [];
        }),
        InventoryItem.list().catch(err => {
          console.error('Error fetching products:', err);
          return [];
        }),
        Platform.list().catch(err => {
          console.error('Error fetching platforms:', err);
          return [];
        }),
        AdCampaign.list().catch(err => {
          console.error('Error fetching campaigns:', err);
          return [];
        })
      ]);

      setCurrentUser(user);
      
      // Filter valid data
      const validOrders = ordersData.filter(o => 
        o && typeof o === 'object' && o.id
      );
      const validProducts = productsData.filter(p => 
        p && typeof p === 'object' && p.id
      );
      const validPlatforms = platformsData.filter(p => 
        p && typeof p === 'object' && p.id
      );
      const validCampaigns = campaignsData.filter(c => 
        c && typeof c === 'object' && c.id
      );
      
      setOrders(validOrders);
      setProducts(validProducts);
      setPlatforms(validPlatforms);
      setCampaigns(validCampaigns);
    } catch (error) {
      console.error('Failed to load analytics:', error);
      
      if (handleAuthError(error, navigate, { showToast: true })) {
        return;
      }
      
      toast.error("Failed to load analytics", {
        description: "Please try refreshing the page."
      });
      
      setOrders([]);
      setProducts([]);
      setPlatforms([]);
      setCampaigns([]);
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter orders by date range
  const filteredOrders = useMemo(() => {
    if (!dateRange.from || !dateRange.to) return orders;
    
    return orders.filter(order => {
      const orderDate = new Date(order.order_date);
      return orderDate >= dateRange.from && orderDate <= dateRange.to;
    });
  }, [orders, dateRange]);

  // Calculate key metrics
  const metrics = useMemo(() => {
    if (filteredOrders.length === 0) {
      return {
        totalRevenue: 0,
        totalOrders: 0,
        averageOrderValue: 0,
        totalProducts: products.length,
        conversionRate: 0,
        topPlatform: null
      };
    }

    const totalRevenue = filteredOrders.reduce((sum, o) => sum + (o.total_price || 0), 0);
    const totalOrders = filteredOrders.length;
    const averageOrderValue = totalRevenue / totalOrders;

    // Calculate platform performance
    const platformRevenue = {};
    filteredOrders.forEach(order => {
      const platform = order.platform || 'Unknown';
      platformRevenue[platform] = (platformRevenue[platform] || 0) + (order.total_price || 0);
    });

    const topPlatform = Object.entries(platformRevenue).sort((a, b) => b[1] - a[1])[0];

    return {
      totalRevenue,
      totalOrders,
      averageOrderValue,
      totalProducts: products.length,
      conversionRate: 0, // Would need traffic data
      topPlatform: topPlatform ? topPlatform[0] : null
    };
  }, [filteredOrders, products]);

  // Handle time range change
  const handleTimeRangeChange = useCallback((range) => {
    setTimeRange(range);
    
    const now = new Date();
    let from;
    
    switch (range) {
      case '7d':
        from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        from = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    
    setDateRange({ from, to: now });
  }, []);

  // Handle export
  const handleExport = useCallback(() => {
    toast.info("Export feature coming soon!");
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-slate-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-indigo-600" />
              Analytics
            </h1>
            <p className="text-slate-600 mt-2">
              Track your business performance and growth
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <DateRangePicker
              date={dateRange}
              onDateChange={setDateRange}
            />
            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Quick Time Range Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {['7d', '30d', '90d', '1y'].map(range => (
            <Button
              key={range}
              variant={timeRange === range ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleTimeRangeChange(range)}
            >
              {range === '7d' && 'Last 7 Days'}
              {range === '30d' && 'Last 30 Days'}
              {range === '90d' && 'Last 90 Days'}
              {range === '1y' && 'Last Year'}
            </Button>
          ))}
        </div>

        {/* Key Metrics */}
        <KeyMetrics metrics={metrics} />

        {/* Main Analytics Content */}
        {filteredOrders.length > 0 ? (
          <Tabs defaultValue="overview" className="mt-6">
            <TabsList className="mb-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="sales">Sales</TabsTrigger>
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="platforms">Platforms</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <AnalyticsOverview
                orders={filteredOrders}
                products={products}
                platforms={platforms}
                timeRange={timeRange}
              />
            </TabsContent>

            <TabsContent value="sales">
              <SalesTrendChart orders={filteredOrders} timeRange={timeRange} />
            </TabsContent>

            <TabsContent value="products">
              <TopPerformingProducts products={products} orders={filteredOrders} />
            </TabsContent>

            <TabsContent value="platforms">
              <PlatformBreakdown platforms={platforms} orders={filteredOrders} />
            </TabsContent>
          </Tabs>
        ) : orders.length > 0 ? (
          <Card className="mt-6">
            <CardContent className="p-12 text-center">
              <Calendar className="w-12 h-12 mx-auto text-slate-400 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                No Data for Selected Range
              </h3>
              <p className="text-slate-500 mb-4">
                Try selecting a different date range to see your analytics.
              </p>
              <Button onClick={() => handleTimeRangeChange('30d')}>
                View Last 30 Days
              </Button>
            </CardContent>
          </Card>
        ) : (
          <NoDataEmptyState
            entityName="Orders"
            onCreate={() => navigate(createPageUrl('Orders'))}
          />
        )}
      </div>
    </div>
  );
}