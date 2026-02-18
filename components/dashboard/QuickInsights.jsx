
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, AlertTriangle, Package, DollarSign, Users, ArrowUpRight, ArrowDownRight, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { User } from '@/lib/entities';

export default function QuickInsights({ orders, products, recommendations, alerts }) {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const currentUser = await User.me();
                setUser(currentUser);
            } catch (error) {
                if (error.response?.status === 401) {
                    console.log('User not authenticated in QuickInsights');
                    navigate(createPageUrl('Home'));
                    return;
                }
                console.error('Error fetching user in QuickInsights:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchUser();
    }, [navigate]);

    if (loading || !user) {
        return null; // Don't render anything while loading or if user is not authenticated
    }

    // Generate insights based on available data
    const generateInsights = () => {
        const insights = [];
        
        // Revenue insight (mock data for demo)
        insights.push({
            title: 'Revenue Trend',
            value: '$12,450',
            change: '+8.2%',
            trend: 'up',
            description: 'vs last month',
            color: 'green',
            icon: DollarSign,
            action: () => navigate(createPageUrl('Analytics'))
        });

        // Order volume insight
        if (orders && orders.length > 0) {
            insights.push({
                title: 'Orders This Week',
                value: '47',
                change: '+23%',
                trend: 'up',
                description: 'vs last week',
                color: 'blue',
                icon: Package,
                action: () => navigate(createPageUrl('Orders'))
            });
        }

        // Critical alerts
        if (alerts && alerts.length > 0) {
            const criticalCount = alerts.filter(a => a.priority === 'urgent' || a.priority === 'high').length;
            if (criticalCount > 0) {
                insights.push({
                    title: 'Critical Alerts',
                    value: criticalCount.toString(),
                    change: 'Needs attention',
                    trend: 'warning',
                    description: 'Require action',
                    color: 'red',
                    icon: AlertTriangle,
                    action: () => navigate(createPageUrl('Inbox'))
                });
            }
        }

        // Growth opportunities
        if (recommendations && recommendations.length > 0) {
            const highImpactRecs = recommendations.filter(r => r.impact_level === 'High' || r.impact_level === 'Critical').length;
            if (highImpactRecs > 0) {
                insights.push({
                    title: 'Growth Opportunities',
                    value: highImpactRecs.toString(),
                    change: 'High impact',
                    trend: 'up',
                    description: 'Ready to implement',
                    color: 'purple',
                    icon: TrendingUp,
                    action: () => navigate(createPageUrl('AIAdvisor'))
                });
            }
        }

        // If we don't have enough insights, add some general ones
        if (insights.length < 3) {
            insights.push({
                title: 'Automation Score',
                value: '72%',
                change: '+5%',
                trend: 'up',
                description: 'vs last month',
                color: 'indigo',
                icon: Zap,
                action: () => navigate(createPageUrl('Commands'))
            });
        }

        return insights.slice(0, 4); // Show max 4 insights
    };

    const insights = generateInsights();

    const getIcon = (trend) => {
        switch (trend) {
            case 'up':
                return <ArrowUpRight className="w-4 h-4" />;
            case 'down':
                return <ArrowDownRight className="w-4 h-4" />;
            case 'warning':
                return <AlertTriangle className="w-4 h-4" />;
            default:
                return null;
        }
    };

    const getColorClasses = (color, trend) => {
        const baseClasses = {
            green: trend === 'up' ? 'text-green-600' : 'text-green-600',
            blue: 'text-blue-600',
            red: 'text-red-600',
            purple: 'text-purple-600',
            indigo: 'text-indigo-600'
        };
        return baseClasses[color] || 'text-slate-600';
    };

    const getBgColorClasses = (color) => {
        const bgClasses = {
            green: 'bg-green-50 border-green-200',
            blue: 'bg-blue-50 border-blue-200',
            red: 'bg-red-50 border-red-200',
            purple: 'bg-purple-50 border-purple-200',
            indigo: 'bg-indigo-50 border-indigo-200'
        };
        return bgClasses[color] || 'bg-slate-50 border-slate-200';
    };

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
                                <insight.icon className={`w-5 h-5 ${getColorClasses(insight.color, insight.trend)}`} />
                                <div className={`flex items-center gap-1 text-xs ${getColorClasses(insight.color, insight.trend)}`}>
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
