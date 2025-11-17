import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Target, AlertTriangle } from 'lucide-react';

// Mock data for charts
const salesVelocityData = [
    { month: 'Jan', velocity: 4.2 },
    { month: 'Feb', velocity: 5.1 },
    { month: 'Mar', velocity: 6.8 },
    { month: 'Apr', velocity: 5.9 },
    { month: 'May', velocity: 7.2 },
    { month: 'Jun', velocity: 8.1 }
];

const profitMarginData = [
    { category: 'Electronics', margin: 22, products: 15 },
    { category: 'Clothing', margin: 45, products: 32 },
    { category: 'Home & Garden', margin: 38, products: 18 },
    { category: 'Sports', margin: 29, products: 12 },
    { category: 'Beauty', margin: 52, products: 8 }
];

const inventoryHealthData = [
    { name: 'Well Stocked', value: 65, color: '#10b981' },
    { name: 'Low Stock', value: 25, color: '#f59e0b' },
    { name: 'Out of Stock', value: 10, color: '#ef4444' }
];

const topPerformersData = [
    { name: 'Vintage Leather Wallet', sales: 156, profit: 2340, velocity: 8.2 },
    { name: 'Organic Cotton Tee', sales: 134, profit: 1870, velocity: 7.1 },
    { name: 'Hand-Stitched Canvas Bag', sales: 98, profit: 2940, velocity: 6.8 },
    { name: 'Silk Scarf Collection', sales: 87, profit: 1560, velocity: 5.9 },
    { name: 'Ceramic Mug Set', sales: 76, profit: 912, velocity: 5.2 }
];

const slowMoversData = [
    { name: 'Vintage Clock', daysStagnant: 45, stock: 23, suggestedAction: 'Discount 20%' },
    { name: 'Crystal Vase', daysStagnant: 38, stock: 12, suggestedAction: 'Bundle Offer' },
    { name: 'Wooden Picture Frame', daysStagnant: 32, stock: 18, suggestedAction: 'Social Media Push' },
    { name: 'Decorative Pillow', daysStagnant: 28, stock: 31, suggestedAction: 'Category Change' }
];

const MetricCard = ({ title, value, change, trend, icon: Icon }) => (
    <Card className="bg-white/80 backdrop-blur-sm">
        <CardContent className="p-4">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-slate-600">{title}</p>
                    <p className="text-2xl font-bold text-slate-900">{value}</p>
                    <div className="flex items-center gap-1 mt-1">
                        {trend === 'up' ? (
                            <TrendingUp className="w-4 h-4 text-green-600" />
                        ) : (
                            <TrendingDown className="w-4 h-4 text-red-600" />
                        )}
                        <span className={`text-sm ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                            {change}
                        </span>
                    </div>
                </div>
                <div className="p-2 bg-slate-100 rounded-lg">
                    <Icon className="w-6 h-6 text-slate-600" />
                </div>
            </div>
        </CardContent>
    </Card>
);

export default function InventoryAnalytics({ inventory }) {
    return (
        <div className="space-y-6">
            {/* Key Performance Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <MetricCard
                    title="Avg Sales Velocity"
                    value="6.8/day"
                    change="+12% vs last month"
                    trend="up"
                    icon={TrendingUp}
                />
                <MetricCard
                    title="Inventory Turnover"
                    value="8.2x"
                    change="+0.3x vs last quarter"
                    trend="up"
                    icon={Target}
                />
                <MetricCard
                    title="Stockout Rate"
                    value="2.1%"
                    change="-0.8% vs last month"
                    trend="up"
                    icon={AlertTriangle}
                />
                <MetricCard
                    title="Profit Margin"
                    value="34%"
                    change="+2% vs last month"
                    trend="up"
                    icon={TrendingUp}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Sales Velocity Trend */}
                <Card className="bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle>Sales Velocity Trend</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                            <LineChart data={salesVelocityData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="month" stroke="#64748b" />
                                <YAxis stroke="#64748b" />
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: 'white', 
                                        border: '1px solid #e2e8f0', 
                                        borderRadius: '8px' 
                                    }}
                                />
                                <Line 
                                    type="monotone" 
                                    dataKey="velocity" 
                                    stroke="#3b82f6" 
                                    strokeWidth={3}
                                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Inventory Health Distribution */}
                <Card className="bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle>Inventory Health Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie
                                    data={inventoryHealthData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {inventoryHealthData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="flex justify-center gap-4 mt-4">
                            {inventoryHealthData.map((entry, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <div 
                                        className="w-3 h-3 rounded-full" 
                                        style={{ backgroundColor: entry.color }}
                                    />
                                    <span className="text-sm text-slate-600">{entry.name}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Profit Margin by Category */}
                <Card className="bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle>Profit Margin by Category</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={profitMarginData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="category" stroke="#64748b" fontSize={12} />
                                <YAxis stroke="#64748b" />
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: 'white', 
                                        border: '1px solid #e2e8f0', 
                                        borderRadius: '8px' 
                                    }}
                                    formatter={(value) => [`${value}%`, 'Profit Margin']}
                                />
                                <Bar 
                                    dataKey="margin" 
                                    fill="#10b981"
                                    radius={[4, 4, 0, 0]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Top Performers */}
                <Card className="bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle>Top Performing Products</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {topPerformersData.map((product, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                    <div>
                                        <p className="font-medium text-slate-900">{product.name}</p>
                                        <p className="text-sm text-slate-600">{product.sales} sales • ${product.profit} profit</p>
                                    </div>
                                    <Badge className="bg-green-100 text-green-800">
                                        {product.velocity}/day
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Slow Movers Alert */}
            <Card className="bg-orange-50 border-orange-200">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-orange-800">
                        <AlertTriangle className="w-5 h-5" />
                        Slow-Moving Inventory Alert
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {slowMoversData.map((product, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-white/80 rounded-lg">
                                <div>
                                    <p className="font-medium text-slate-900">{product.name}</p>
                                    <p className="text-sm text-slate-600">
                                        {product.daysStagnant} days without sale • {product.stock} units in stock
                                    </p>
                                </div>
                                <Badge variant="outline" className="text-orange-700 border-orange-300">
                                    {product.suggestedAction}
                                </Badge>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}