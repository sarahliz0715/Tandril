import React, { useState, useEffect } from 'react';
import { Platform, AICommand, SmartAlert } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    TrendingUp, Package, DollarSign, Zap, AlertTriangle, 
    Bot, Plus, RefreshCw, ArrowRight, MoreHorizontal
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const StatCard = ({ title, value, change, icon: Icon, color, onClick }) => (
    <Card className="cursor-pointer hover:shadow-md transition-all" onClick={onClick}>
        <CardContent className="p-4">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{title}</p>
                    <p className="text-2xl font-bold text-slate-900">{value}</p>
                    {change && (
                        <p className={`text-xs font-medium ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {change > 0 ? '+' : ''}{change}% from last week
                        </p>
                    )}
                </div>
                <div className={`p-3 rounded-full ${color}`}>
                    <Icon className="w-6 h-6 text-white" />
                </div>
            </div>
        </CardContent>
    </Card>
);

const AlertCard = ({ alert, onTakeAction }) => (
    <Card className="border-l-4 border-l-orange-500">
        <CardContent className="p-4">
            <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-slate-900 text-sm">{alert.title}</h4>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2">{alert.message}</p>
                    <Button 
                        size="sm" 
                        className="mt-2 h-7 text-xs"
                        onClick={() => onTakeAction(alert)}
                    >
                        <Bot className="w-3 h-3 mr-1" />
                        AI Fix
                    </Button>
                </div>
            </div>
        </CardContent>
    </Card>
);

const RecentCommandCard = ({ command }) => (
    <Card>
        <CardContent className="p-4">
            <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${
                    command.status === 'completed' ? 'bg-green-500' : 
                    command.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'
                }`} />
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                        {command.command_text}
                    </p>
                    <p className="text-xs text-slate-500">
                        {new Date(command.created_at).toLocaleTimeString()}
                    </p>
                </div>
                <Badge variant={command.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                    {command.status}
                </Badge>
            </div>
        </CardContent>
    </Card>
);

export default function MobileDashboard() {
    const [platforms, setPlatforms] = useState([]);
    const [recentCommands, setRecentCommands] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [stats, setStats] = useState({
        revenue: { value: '$12.4K', change: 8.2 },
        orders: { value: '147', change: 12.1 },
        products: { value: '1,247', change: -2.3 },
        platforms: { value: '3', change: 0 }
    });
    const [isRefreshing, setIsRefreshing] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            const [platformData, commandData, alertData] = await Promise.all([
                Platform.list('-created_at', 5),
                AICommand.list('-created_at', 3),
                SmartAlert.filter({ is_dismissed: false }, '-created_at', 2)
            ]);
            
            setPlatforms(platformData);
            setRecentCommands(commandData);
            setAlerts(alertData);
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        }
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await loadDashboardData();
        setTimeout(() => setIsRefreshing(false), 500); // UX delay
    };

    const handleTakeAction = (alert) => {
        navigate(createPageUrl(`Commands?prompt=${encodeURIComponent(`Fix: ${alert.title}`)}`));
    };

    return (
        <div className="space-y-6 pb-20"> {/* Extra padding for mobile navigation */}
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
                    <p className="text-sm text-slate-600">Your business at a glance</p>
                </div>
                <Button 
                    variant="outline" 
                    size="icon"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                >
                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </Button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
                <StatCard
                    title="Revenue"
                    value={stats.revenue.value}
                    change={stats.revenue.change}
                    icon={DollarSign}
                    color="bg-green-500"
                    onClick={() => navigate(createPageUrl('Analytics'))}
                />
                <StatCard
                    title="Orders"
                    value={stats.orders.value}
                    change={stats.orders.change}
                    icon={TrendingUp}
                    color="bg-blue-500"
                    onClick={() => navigate(createPageUrl('Orders'))}
                />
                <StatCard
                    title="Products"
                    value={stats.products.value}
                    change={stats.products.change}
                    icon={Package}
                    color="bg-purple-500"
                    onClick={() => navigate(createPageUrl('Inventory'))}
                />
                <StatCard
                    title="Platforms"
                    value={stats.platforms.value}
                    icon={Zap}
                    color="bg-indigo-500"
                    onClick={() => navigate(createPageUrl('Platforms'))}
                />
            </div>

            {/* Critical Alerts */}
            {alerts.length > 0 && (
                <section>
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="font-semibold text-slate-900">Critical Alerts</h2>
                        <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                        </Button>
                    </div>
                    <div className="space-y-3">
                        {alerts.map((alert, index) => (
                            <AlertCard 
                                key={index} 
                                alert={alert} 
                                onTakeAction={handleTakeAction}
                            />
                        ))}
                    </div>
                </section>
            )}

            {/* Recent AI Commands */}
            <section>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="font-semibold text-slate-900">Recent AI Commands</h2>
                    <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => navigate(createPageUrl('Commands'))}
                    >
                        View All <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                </div>
                {recentCommands.length > 0 ? (
                    <div className="space-y-2">
                        {recentCommands.map((command, index) => (
                            <RecentCommandCard key={index} command={command} />
                        ))}
                    </div>
                ) : (
                    <Card>
                        <CardContent className="p-8 text-center">
                            <Bot className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-600 mb-3">No AI commands yet</p>
                            <Button onClick={() => navigate(createPageUrl('Commands'))}>
                                <Plus className="w-4 h-4 mr-2" />
                                Create First Command
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </section>

            {/* Quick Actions */}
            <section>
                <h2 className="font-semibold text-slate-900 mb-3">Quick Actions</h2>
                <div className="grid grid-cols-2 gap-3">
                    <Button 
                        variant="outline" 
                        className="h-16 flex-col gap-1"
                        onClick={() => navigate(createPageUrl('Commands'))}
                    >
                        <Bot className="w-5 h-5" />
                        <span className="text-xs">AI Command</span>
                    </Button>
                    <Button 
                        variant="outline" 
                        className="h-16 flex-col gap-1"
                        onClick={() => navigate(createPageUrl('Inventory'))}
                    >
                        <Package className="w-5 h-5" />
                        <span className="text-xs">Check Stock</span>
                    </Button>
                    <Button 
                        variant="outline" 
                        className="h-16 flex-col gap-1"
                        onClick={() => navigate(createPageUrl('Analytics'))}
                    >
                        <TrendingUp className="w-5 h-5" />
                        <span className="text-xs">View Analytics</span>
                    </Button>
                    <Button 
                        variant="outline" 
                        className="h-16 flex-col gap-1"
                        onClick={() => navigate(createPageUrl('Platforms'))}
                    >
                        <Zap className="w-5 h-5" />
                        <span className="text-xs">Add Platform</span>
                    </Button>
                </div>
            </section>
        </div>
    );
}