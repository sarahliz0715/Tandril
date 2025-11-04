import React from 'react';
import { DollarSign, ShoppingCart, TrendingUp, Package } from 'lucide-react';
import MetricCard from './MetricCard';

export default function KeyMetrics({ metrics, timeRange }) {
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            notation: 'compact',
            compactDisplay: 'short'
        }).format(value);
    };

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard 
                title="Total Revenue"
                value={formatCurrency(metrics.revenue.value)}
                growth={metrics.revenue.growth}
                icon={DollarSign}
                iconColor="text-green-500"
                timeRange={timeRange}
            />
            <MetricCard 
                title="Total Orders"
                value={metrics.orders.value.toLocaleString()}
                growth={metrics.orders.growth}
                icon={ShoppingCart}
                iconColor="text-blue-500"
                timeRange={timeRange}
            />
            <MetricCard 
                title="Average Order Value"
                value={formatCurrency(metrics.aov.value)}
                growth={metrics.aov.growth}
                icon={TrendingUp}
                iconColor="text-purple-500"
                timeRange={timeRange}
            />
            <MetricCard 
                title="Active Products"
                value={metrics.products.active.toLocaleString()}
                growth={(metrics.products.total > 0 ? (metrics.products.active / metrics.products.total * 100) : 0).toFixed(1)}
                growthLabel="% of total"
                isPercentage={true}
                icon={Package}
                iconColor="text-orange-500"
                timeRange={timeRange}
            />
        </div>
    );
}