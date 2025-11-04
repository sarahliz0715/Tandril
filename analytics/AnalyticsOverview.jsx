import React from 'react';
import SalesTrendChart from './SalesTrendChart';
import PlatformBreakdown from './PlatformBreakdown';
import TopPerformingProducts from './TopPerformingProducts';

export default function AnalyticsOverview({ orders = [], products = [], platforms = [], timeRange = '30d' }) {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <SalesTrendChart orders={orders} timeRange={timeRange} />
                </div>
                <div>
                    <PlatformBreakdown platforms={platforms} orders={orders} />
                </div>
            </div>
            <div>
                <TopPerformingProducts products={products} orders={orders} />
            </div>
        </div>
    );
}