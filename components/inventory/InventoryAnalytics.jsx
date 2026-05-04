import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Target, AlertTriangle, Package } from 'lucide-react';

const LOW_STOCK_THRESHOLD = 5;

const MetricCard = ({ title, value, sub, trend, icon: Icon }) => (
    <Card className="bg-white/80 backdrop-blur-sm">
        <CardContent className="p-4">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-slate-600">{title}</p>
                    <p className="text-2xl font-bold text-slate-900">{value}</p>
                    {sub && (
                        <div className="flex items-center gap-1 mt-1">
                            {trend === 'up' && <TrendingUp className="w-4 h-4 text-green-600" />}
                            {trend === 'down' && <TrendingDown className="w-4 h-4 text-red-600" />}
                            <span className={`text-sm ${trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-slate-500'}`}>
                                {sub}
                            </span>
                        </div>
                    )}
                </div>
                <div className="p-2 bg-slate-100 rounded-lg">
                    <Icon className="w-6 h-6 text-slate-600" />
                </div>
            </div>
        </CardContent>
    </Card>
);

const NoDataPlaceholder = ({ message }) => (
    <div className="flex flex-col items-center justify-center h-[250px] text-slate-400 gap-2">
        <Package className="w-8 h-8" />
        <p className="text-sm text-center">{message}</p>
    </div>
);

export default function InventoryAnalytics({ inventory }) {
    const stats = useMemo(() => {
        if (!inventory || inventory.length === 0) return null;

        const active = inventory.filter(p => p.status === 'active' || (!p.status && (p.total_stock ?? p.inventory_quantity ?? 0) > LOW_STOCK_THRESHOLD));
        const lowStock = inventory.filter(p => p.status === 'low_stock' || (p.status !== 'out_of_stock' && (p.total_stock ?? p.inventory_quantity ?? 0) > 0 && (p.total_stock ?? p.inventory_quantity ?? 0) <= LOW_STOCK_THRESHOLD));
        const outOfStock = inventory.filter(p => p.status === 'out_of_stock' || (p.total_stock ?? p.inventory_quantity ?? 0) === 0);
        const total = inventory.length;

        // Inventory health pie
        const healthData = [
            { name: 'Well Stocked', value: active.length, color: '#10b981' },
            { name: 'Low Stock', value: lowStock.length, color: '#f59e0b' },
            { name: 'Out of Stock', value: outOfStock.length, color: '#ef4444' },
        ].filter(d => d.value > 0);

        // Stock by category bar chart
        const categoryMap = {};
        inventory.forEach(p => {
            const cat = p.category || p.product_type || p.type || 'Uncategorized';
            if (!categoryMap[cat]) categoryMap[cat] = { category: cat, stock: 0, products: 0 };
            categoryMap[cat].stock += p.total_stock ?? p.inventory_quantity ?? 0;
            categoryMap[cat].products += 1;
        });
        const categoryData = Object.values(categoryMap).sort((a, b) => b.stock - a.stock).slice(0, 6);

        // Low stock items (needs attention)
        const lowStockItems = inventory
            .filter(p => {
                const stock = p.total_stock ?? p.inventory_quantity ?? 0;
                return stock > 0 && stock <= LOW_STOCK_THRESHOLD;
            })
            .sort((a, b) => (a.total_stock ?? a.inventory_quantity ?? 0) - (b.total_stock ?? b.inventory_quantity ?? 0))
            .slice(0, 5);

        // Out of stock items
        const outItems = inventory
            .filter(p => (p.total_stock ?? p.inventory_quantity ?? 0) === 0)
            .slice(0, 5);

        // Total stock value (price × stock)
        const totalValue = inventory.reduce((sum, p) => {
            const price = parseFloat(p.base_price ?? p.price ?? 0) || 0;
            const stock = p.total_stock ?? p.inventory_quantity ?? 0;
            return sum + price * stock;
        }, 0);

        const stockoutRate = total > 0 ? ((outOfStock.length / total) * 100).toFixed(1) : '0.0';

        return { healthData, categoryData, lowStockItems, outItems, totalValue, stockoutRate, total, lowStock, outOfStock, active };
    }, [inventory]);

    if (!stats) {
        return (
            <Card className="bg-white/80 backdrop-blur-sm">
                <CardContent className="p-8 text-center text-slate-400">
                    <Package className="w-10 h-10 mx-auto mb-2" />
                    <p>No inventory data to analyze yet.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <MetricCard
                    title="Total Products"
                    value={stats.total}
                    sub={`${stats.active.length} active`}
                    icon={Package}
                />
                <MetricCard
                    title="Inventory Value"
                    value={`$${stats.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    sub="price × stock"
                    icon={Target}
                />
                <MetricCard
                    title="Low Stock Items"
                    value={stats.lowStock.length}
                    sub={stats.lowStock.length > 0 ? 'need restocking' : 'all good'}
                    trend={stats.lowStock.length > 0 ? 'down' : undefined}
                    icon={TrendingDown}
                />
                <MetricCard
                    title="Stockout Rate"
                    value={`${stats.stockoutRate}%`}
                    sub={`${stats.outOfStock.length} of ${stats.total} products`}
                    trend={parseFloat(stats.stockoutRate) > 0 ? 'down' : undefined}
                    icon={AlertTriangle}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Inventory Health Distribution */}
                <Card className="bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle>Inventory Health</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {stats.healthData.length > 0 ? (
                            <>
                                <ResponsiveContainer width="100%" height={220}>
                                    <PieChart>
                                        <Pie
                                            data={stats.healthData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={55}
                                            outerRadius={90}
                                            paddingAngle={4}
                                            dataKey="value"
                                            label={({ name, value }) => `${value}`}
                                        >
                                            {stats.healthData.map((entry, i) => (
                                                <Cell key={i} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(v, name) => [v, name]} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="flex justify-center gap-4 mt-2">
                                    {stats.healthData.map((entry, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                                            <span className="text-sm text-slate-600">{entry.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <NoDataPlaceholder message="No inventory status data." />
                        )}
                    </CardContent>
                </Card>

                {/* Stock by Category */}
                <Card className="bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle>Stock by Category</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {stats.categoryData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={stats.categoryData} margin={{ left: -10 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis dataKey="category" stroke="#64748b" fontSize={11} />
                                    <YAxis stroke="#64748b" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                                        formatter={(v) => [v, 'Units']}
                                    />
                                    <Bar dataKey="stock" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <NoDataPlaceholder message="No category data available." />
                        )}
                    </CardContent>
                </Card>

                {/* Low Stock Alert */}
                <Card className="bg-amber-50 border-amber-200">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-amber-800">
                            <AlertTriangle className="w-5 h-5" />
                            Low Stock ({stats.lowStock.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {stats.lowStockItems.length > 0 ? (
                            <div className="space-y-2">
                                {stats.lowStockItems.map((p, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 bg-white/80 rounded-lg">
                                        <div>
                                            <p className="font-medium text-slate-900 text-sm">{p.product_name || p.title || p.name}</p>
                                            <p className="text-xs text-slate-500">SKU: {p.sku || 'N/A'}</p>
                                        </div>
                                        <Badge className="bg-amber-100 text-amber-800">
                                            {p.total_stock ?? p.inventory_quantity ?? 0} left
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-amber-700 py-4 text-center">All products are well stocked.</p>
                        )}
                    </CardContent>
                </Card>

                {/* Out of Stock */}
                <Card className="bg-red-50 border-red-200">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-red-800">
                            <AlertTriangle className="w-5 h-5" />
                            Out of Stock ({stats.outOfStock.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {stats.outItems.length > 0 ? (
                            <div className="space-y-2">
                                {stats.outItems.map((p, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 bg-white/80 rounded-lg">
                                        <div>
                                            <p className="font-medium text-slate-900 text-sm">{p.product_name || p.title || p.name}</p>
                                            <p className="text-xs text-slate-500">SKU: {p.sku || 'N/A'}</p>
                                        </div>
                                        <Badge className="bg-red-100 text-red-800">0 units</Badge>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-red-700 py-4 text-center">No products are out of stock.</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Sales analytics note */}
            <Card className="bg-slate-50 border-slate-200">
                <CardContent className="p-4 flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-slate-400 shrink-0" />
                    <p className="text-sm text-slate-500">
                        Sales velocity, top performers, and slow-mover analysis will appear here once your store has order history.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
