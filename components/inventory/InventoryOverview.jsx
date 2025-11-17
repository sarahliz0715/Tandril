import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
    Package, DollarSign, TrendingUp, AlertTriangle, 
    ArrowUpRight, ArrowDownRight, Target, Clock,
    Sparkles, BarChart3
} from 'lucide-react';

const MetricCard = ({ title, value, subtitle, icon: Icon, trend, trendValue, color = "text-indigo-600", bgColor = "bg-indigo-50" }) => (
    <Card className="bg-white/80 backdrop-blur-sm shadow-sm">
        <CardContent className="p-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-slate-600">{title}</p>
                    <p className="text-2xl font-bold text-slate-900">{value}</p>
                    <div className="flex items-center gap-1 mt-1">
                        {trend === 'up' ? (
                            <ArrowUpRight className="w-4 h-4 text-green-600" />
                        ) : trend === 'down' ? (
                            <ArrowDownRight className="w-4 h-4 text-red-600" />
                        ) : null}
                        <span className={`text-sm ${trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-slate-500'}`}>
                            {trendValue || subtitle}
                        </span>
                    </div>
                </div>
                <div className={`p-3 rounded-full ${bgColor}`}>
                    <Icon className={`w-6 h-6 ${color}`} />
                </div>
            </div>
        </CardContent>
    </Card>
);

const OpportunityCard = ({ title, description, impact, urgency, onTakeAction }) => (
    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-4">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-4 h-4 text-blue-600" />
                        <h4 className="font-semibold text-slate-900">{title}</h4>
                        <Badge variant={impact === 'High' ? 'destructive' : impact === 'Medium' ? 'default' : 'secondary'} className="text-xs">
                            {impact} Impact
                        </Badge>
                    </div>
                    <p className="text-sm text-slate-600 mb-3">{description}</p>
                </div>
            </div>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span className="text-xs text-slate-500">{urgency}</span>
                </div>
                <Button size="sm" onClick={onTakeAction}>
                    Take Action
                </Button>
            </div>
        </CardContent>
    </Card>
);

export default function InventoryOverview({ stats }) {
    const inventoryHealth = Math.round((stats.totalProducts - stats.outOfStock) / stats.totalProducts * 100);
    const stockTurnover = 8.2; // Mock calculated turnover rate
    const avgProfitMargin = 34; // Mock calculated average margin

    const opportunities = [
        {
            title: "Price Optimization Available",
            description: "12 products could be repriced for 15% more profit without impacting demand",
            impact: "High",
            urgency: "Next 48 hours"
        },
        {
            title: "Restock Alert",
            description: "5 fast-moving products will be out of stock within 7 days",
            impact: "Medium", 
            urgency: "This week"
        },
        {
            title: "Slow Inventory Detected",
            description: "8 products haven't sold in 30 days - consider promotion or liquidation",
            impact: "Medium",
            urgency: "This month"
        }
    ];

    return (
        <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    title="Inventory Health"
                    value={`${inventoryHealth}%`}
                    subtitle={`${stats.totalProducts - stats.outOfStock} active products`}
                    icon={Package}
                    trend="up"
                    trendValue="+2% vs last month"
                    color="text-green-600"
                    bgColor="bg-green-50"
                />
                <MetricCard
                    title="Total Inventory Value"
                    value={`$${stats.totalValue.toLocaleString()}`}
                    subtitle="Across all platforms"
                    icon={DollarSign}
                    trend="up"
                    trendValue="+$4,200 vs last month"
                />
                <MetricCard
                    title="Stock Turnover Rate"
                    value={`${stockTurnover}x`}
                    subtitle="Times per year"
                    icon={BarChart3}
                    trend="up"
                    trendValue="Above industry avg"
                    color="text-purple-600"
                    bgColor="bg-purple-50"
                />
                <MetricCard
                    title="Avg Profit Margin"
                    value={`${avgProfitMargin}%`}
                    subtitle="Gross margin"
                    icon={Target}
                    trend="up"
                    trendValue="+3% vs last quarter"
                    color="text-emerald-600"
                    bgColor="bg-emerald-50"
                />
            </div>

            {/* Critical Issues */}
            {(stats.lowStock > 0 || stats.outOfStock > 0) && (
                <Card className="bg-red-50 border-red-200">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-red-800">
                            <AlertTriangle className="w-5 h-5" />
                            Immediate Attention Required
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {stats.outOfStock > 0 && (
                            <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-200">
                                <div>
                                    <p className="font-medium text-red-800">Out of Stock</p>
                                    <p className="text-sm text-red-600">{stats.outOfStock} products unavailable to customers</p>
                                </div>
                                <Button size="sm" variant="destructive">
                                    Restock Now
                                </Button>
                            </div>
                        )}
                        {stats.lowStock > 0 && (
                            <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-orange-200">
                                <div>
                                    <p className="font-medium text-orange-800">Low Stock</p>
                                    <p className="text-sm text-orange-600">{stats.lowStock} products running low</p>
                                </div>
                                <Button size="sm" variant="outline">
                                    Review Items
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* AI Opportunities */}
            <Card className="bg-white/80 backdrop-blur-sm shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-blue-600" />
                        AI-Identified Opportunities
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {opportunities.map((opportunity, index) => (
                        <OpportunityCard
                            key={index}
                            {...opportunity}
                            onTakeAction={() => {
                                // This would trigger specific actions based on the opportunity
                                console.log('Taking action on:', opportunity.title);
                            }}
                        />
                    ))}
                </CardContent>
            </Card>

            {/* Inventory Health Progress */}
            <Card className="bg-white/80 backdrop-blur-sm shadow-sm">
                <CardHeader>
                    <CardTitle>Inventory Health Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <div className="flex justify-between text-sm mb-2">
                            <span>Active Products</span>
                            <span className="font-medium">{stats.totalProducts - stats.outOfStock}/{stats.totalProducts}</span>
                        </div>
                        <Progress value={inventoryHealth} className="h-2" />
                    </div>
                    <div className="grid grid-cols-3 gap-4 pt-2">
                        <div className="text-center">
                            <p className="text-2xl font-bold text-green-600">{stats.totalProducts - stats.lowStock - stats.outOfStock}</p>
                            <p className="text-xs text-slate-600">Well Stocked</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-orange-600">{stats.lowStock}</p>
                            <p className="text-xs text-slate-600">Low Stock</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-red-600">{stats.outOfStock}</p>
                            <p className="text-xs text-slate-600">Out of Stock</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}