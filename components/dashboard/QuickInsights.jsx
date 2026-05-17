
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, AlertTriangle, Package, DollarSign, ArrowUpRight, ArrowDownRight, Zap, Store } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function QuickInsights({ products, platforms, alerts, recommendations, stats }) {
    const navigate = useNavigate();

    const generateInsights = () => {
        const insights = [];

        // Real: total products from connected store
        const productCount = products?.length || 0;
        if (productCount > 0) {
            insights.push({
                title: 'Products in Store',
                value: productCount.toString(),
                change: 'Live data',
                trend: 'up',
                description: 'from connected store',
                color: 'green',
                icon: Package,
                action: () => navigate(createPageUrl('Products'))
            });
        }

        // Real: low / out of stock items
        const lowStockCount = products?.filter(p =>
            p.status === 'low_stock' || p.status === 'out_of_stock'
        ).length || 0;
        if (lowStockCount > 0) {
            insights.push({
                title: 'Low Stock Items',
                value: lowStockCount.toString(),
                change: 'Needs attention',
                trend: 'warning',
                description: 'below reorder point',
                color: 'red',
                icon: AlertTriangle,
                action: () => navigate(createPageUrl('Inventory'))
            });
        }

        // Real: orders this week (only show if > 0 so we don't display a meaningless $0)
        if (stats?.recentOrders > 0) {
            insights.push({
                title: 'Orders This Week',
                value: stats.recentOrders.toString(),
                change: stats.recentRevenue > 0 ? `$${Number(stats.recentRevenue).toFixed(0)} revenue` : '',
                trend: 'up',
                description: 'in the last 7 days',
                color: 'blue',
                icon: Package,
                action: () => navigate(createPageUrl('Orders'))
            });
        }

        // Real: revenue this week (only if not already covered by orders card)
        if (stats?.recentRevenue > 0 && !insights.find(i => i.title === 'Orders This Week')) {
            insights.push({
                title: 'Revenue This Week',
                value: `$${Number(stats.recentRevenue).toFixed(0)}`,
                change: '',
                trend: 'up',
                description: 'in the last 7 days',
                color: 'green',
                icon: DollarSign,
                action: () => navigate(createPageUrl('Analytics'))
            });
        }

        // Real: time saved from automation commands
        if (stats?.automationsRun > 0 && stats?.timeAutomated) {
            insights.push({
                title: 'Time Saved This Week',
                value: stats.timeAutomated,
                change: `${stats.automationsRun} command${stats.automationsRun !== 1 ? 's' : ''}`,
                trend: 'up',
                description: 'through automation',
                color: 'emerald',
                icon: Zap,
                action: () => navigate(createPageUrl('History'))
            });
        }

        // Real: critical alerts
        const criticalCount = stats?.criticalAlerts ||
            (alerts || []).filter(a => a.priority === 'high' || a.priority === 'urgent').length;
        if (criticalCount > 0) {
            insights.push({
                title: 'Critical Alerts',
                value: criticalCount.toString(),
                change: 'Needs attention',
                trend: 'warning',
                description: 'require action',
                color: 'red',
                icon: AlertTriangle,
                action: () => navigate(createPageUrl('Inbox'))
            });
        }

        // Real: connected platforms (good filler if not enough cards)
        if (platforms?.length > 0 && insights.length < 3) {
            insights.push({
                title: 'Connected Platforms',
                value: platforms.length.toString(),
                change: 'Live mode',
                trend: 'up',
                description: platforms.slice(0, 2).map(p => p.platform_type || p.shop_name || 'Store').join(', '),
                color: 'blue',
                icon: Store,
                action: () => navigate(createPageUrl('Platforms'))
            });
        }

        // Real: growth opportunities from AI recommendations
        if (insights.length < 3 && recommendations?.length > 0) {
            const highImpact = recommendations.filter(
                r => r.impact_level === 'High' || r.impact_level === 'Critical'
            ).length;
            if (highImpact > 0) {
                insights.push({
                    title: 'Growth Opportunities',
                    value: highImpact.toString(),
                    change: 'High impact',
                    trend: 'up',
                    description: 'ready to implement',
                    color: 'green',
                    icon: TrendingUp,
                    action: () => navigate(createPageUrl('AIAdvisor'))
                });
            }
        }

        // If still empty (brand new account, no data yet), show a helpful prompt
        if (insights.length === 0) {
            insights.push({
                title: 'Connect a Store',
                value: '—',
                change: 'Get started',
                trend: 'up',
                description: 'to see live insights',
                color: 'green',
                icon: Store,
                action: () => navigate(createPageUrl('Platforms'))
            });
        }

        return insights.slice(0, 4);
    };

    const insights = generateInsights();

    const getIcon = (trend) => {
        switch (trend) {
            case 'up': return <ArrowUpRight className="w-4 h-4" />;
            case 'down': return <ArrowDownRight className="w-4 h-4" />;
            case 'warning': return <AlertTriangle className="w-4 h-4" />;
            default: return null;
        }
    };

    const getColorClasses = (color) => ({
        green: 'text-green-600',
        blue: 'text-blue-600',
        red: 'text-red-600',
        emerald: 'text-emerald-600'
    }[color] || 'text-slate-600');

    const getBgColorClasses = (color) => ({
        green: 'bg-green-50 border-green-200',
        blue: 'bg-blue-50 border-blue-200',
        red: 'bg-red-50 border-red-200',
        emerald: 'bg-emerald-50 border-emerald-200'
    }[color] || 'bg-slate-50 border-slate-200');

    return (
        <Card className="bg-white/80 backdrop-blur-sm shadow-none border-none">
            <CardHeader className="p-0 pb-3">
                <CardTitle className="flex items-center gap-2 sm:gap-3 text-lg sm:text-xl">
                    <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                    Quick Insights
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {insights.map((insight, index) => (
                        <div
                            key={index}
                            onClick={insight.action}
                            className={`group cursor-pointer p-4 rounded-lg border transition-all duration-200 hover:shadow-md ${getBgColorClasses(insight.color)}`}
                        >
                            <div className="flex items-start justify-between mb-2">
                                <insight.icon className={`w-5 h-5 ${getColorClasses(insight.color)}`} />
                                <div className={`flex items-center gap-1 text-xs ${getColorClasses(insight.color)}`}>
                                    {getIcon(insight.trend)}
                                    <span className="font-medium">{insight.change}</span>
                                </div>
                            </div>
                            <h3 className="font-medium text-slate-900 text-sm">{insight.title}</h3>
                            <p className="text-2xl font-bold text-slate-900 my-1">{insight.value}</p>
                            <p className="text-xs text-slate-500">{insight.description}</p>
                        </div>
                    ))}
                </div>

                <div className="mt-4 pt-4 border-t border-slate-200">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(createPageUrl('Analytics'))}
                        className="w-full"
                    >
                        View Full Analytics
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
