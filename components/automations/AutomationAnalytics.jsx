import React, { useState, useEffect } from 'react';
import { api } from '@/api/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    BarChart3,
    TrendingUp,
    Clock,
    CheckCircle,
    AlertTriangle,
    Zap,
    Calendar,
    DollarSign,
    Download,
    Loader2,
    ArrowUp,
    ArrowDown
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

export default function AutomationAnalytics() {
    const [automations, setAutomations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState('7d'); // 7d, 30d, 90d, all
    const [analytics, setAnalytics] = useState(null);

    useEffect(() => {
        loadData();
    }, [dateRange]);

    const loadData = async () => {
        try {
            const data = await api.entities.Automation.list();
            setAutomations(data);
            
            const analyticsData = calculateAnalytics(data, dateRange);
            setAnalytics(analyticsData);
        } catch (error) {
            console.error('Error loading automation analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateAnalytics = (automations, range) => {
        const now = new Date();
        const cutoffDate = getCutoffDate(range);

        let totalRuns = 0;
        let successfulRuns = 0;
        let failedRuns = 0;
        let totalExecutionTime = 0;
        let timeSaved = 0;

        const automationStats = [];
        const dailyStats = {};
        const categoryStats = {};

        automations.forEach(automation => {
            const stats = automation.statistics || {};
            const recentLogs = (automation.execution_log || []).filter(log => 
                new Date(log.timestamp) >= cutoffDate
            );

            const runs = recentLogs.length;
            const successful = recentLogs.filter(l => l.status === 'success').length;
            const failed = recentLogs.filter(l => l.status === 'failed').length;

            totalRuns += runs;
            successfulRuns += successful;
            failedRuns += failed;

            recentLogs.forEach(log => {
                totalExecutionTime += log.execution_time_ms || 0;
                
                // Daily stats
                const date = new Date(log.timestamp).toLocaleDateString();
                if (!dailyStats[date]) {
                    dailyStats[date] = { date, runs: 0, successful: 0, failed: 0 };
                }
                dailyStats[date].runs++;
                if (log.status === 'success') dailyStats[date].successful++;
                if (log.status === 'failed') dailyStats[date].failed++;
            });

            // Category stats
            const category = automation.category || 'general';
            if (!categoryStats[category]) {
                categoryStats[category] = { name: category, value: 0, automations: 0 };
            }
            categoryStats[category].value += runs;
            categoryStats[category].automations++;

            // Estimate time saved (30 min per successful run)
            timeSaved += successful * 30;

            automationStats.push({
                id: automation.id,
                name: automation.name,
                runs,
                successful,
                failed,
                successRate: runs > 0 ? (successful / runs * 100).toFixed(1) : 0,
                avgExecutionTime: runs > 0 ? ((stats.average_execution_time_ms || 0) / 1000).toFixed(2) : 0,
                isActive: automation.is_active
            });
        });

        return {
            overview: {
                totalRuns,
                successfulRuns,
                failedRuns,
                successRate: totalRuns > 0 ? ((successfulRuns / totalRuns) * 100).toFixed(1) : 0,
                avgExecutionTime: totalRuns > 0 ? (totalExecutionTime / totalRuns / 1000).toFixed(2) : 0,
                timeSavedHours: (timeSaved / 60).toFixed(1),
                costSaved: ((timeSaved / 60) * 25).toFixed(0) // $25/hour
            },
            dailyStats: Object.values(dailyStats).sort((a, b) => new Date(a.date) - new Date(b.date)),
            categoryStats: Object.values(categoryStats),
            automationStats: automationStats.sort((a, b) => b.runs - a.runs),
            topPerformers: automationStats.filter(a => a.isActive).slice(0, 5),
            failedAutomations: automationStats.filter(a => a.failed > 0).sort((a, b) => b.failed - a.failed)
        };
    };

    const getCutoffDate = (range) => {
        const now = new Date();
        switch (range) {
            case '7d':
                return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            case '30d':
                return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            case '90d':
                return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            default:
                return new Date(0);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (!analytics) return null;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Automation Analytics</h2>
                    <p className="text-slate-600">Performance insights and metrics</p>
                </div>
                <div className="flex items-center gap-2">
                    {['7d', '30d', '90d', 'all'].map(range => (
                        <Button
                            key={range}
                            size="sm"
                            variant={dateRange === range ? 'default' : 'outline'}
                            onClick={() => setDateRange(range)}
                        >
                            {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : range === '90d' ? '90 Days' : 'All Time'}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    label="Total Executions"
                    value={analytics.overview.totalRuns}
                    icon={Zap}
                    color="text-indigo-600"
                    bgColor="bg-indigo-100"
                />
                <StatCard
                    label="Success Rate"
                    value={`${analytics.overview.successRate}%`}
                    icon={CheckCircle}
                    color="text-green-600"
                    bgColor="bg-green-100"
                    trend={parseFloat(analytics.overview.successRate) >= 95 ? 'up' : 'down'}
                />
                <StatCard
                    label="Time Saved"
                    value={`${analytics.overview.timeSavedHours}h`}
                    icon={Clock}
                    color="text-blue-600"
                    bgColor="bg-blue-100"
                    subtitle={`~$${analytics.overview.costSaved} saved`}
                />
                <StatCard
                    label="Avg Execution"
                    value={`${analytics.overview.avgExecutionTime}s`}
                    icon={TrendingUp}
                    color="text-purple-600"
                    bgColor="bg-purple-100"
                />
            </div>

            <Tabs defaultValue="overview" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="performance">Performance</TabsTrigger>
                    <TabsTrigger value="automations">By Automation</TabsTrigger>
                    <TabsTrigger value="failures">Failures</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                    {/* Daily Trend Chart */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Execution Trend</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={analytics.dailyStats}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Line type="monotone" dataKey="successful" stroke="#10b981" name="Successful" strokeWidth={2} />
                                    <Line type="monotone" dataKey="failed" stroke="#ef4444" name="Failed" strokeWidth={2} />
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Category Distribution */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>By Category</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={250}>
                                    <PieChart>
                                        <Pie
                                            data={analytics.categoryStats}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {analytics.categoryStats.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Top Performers</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {analytics.topPerformers.map((auto, index) => (
                                        <div key={auto.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <Badge className="bg-indigo-100 text-indigo-800">#{index + 1}</Badge>
                                                <div>
                                                    <p className="font-medium text-sm">{auto.name}</p>
                                                    <p className="text-xs text-slate-500">{auto.runs} runs</p>
                                                </div>
                                            </div>
                                            <Badge className="bg-green-100 text-green-800">
                                                {auto.successRate}% success
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="performance">
                    <Card>
                        <CardHeader>
                            <CardTitle>Execution Performance</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={400}>
                                <BarChart data={analytics.automationStats.slice(0, 10)}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="successful" fill="#10b981" name="Successful" />
                                    <Bar dataKey="failed" fill="#ef4444" name="Failed" />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="automations">
                    <Card>
                        <CardHeader>
                            <CardTitle>All Automations</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="text-left py-3 px-4 font-semibold text-sm">Automation</th>
                                            <th className="text-left py-3 px-4 font-semibold text-sm">Runs</th>
                                            <th className="text-left py-3 px-4 font-semibold text-sm">Success</th>
                                            <th className="text-left py-3 px-4 font-semibold text-sm">Failed</th>
                                            <th className="text-left py-3 px-4 font-semibold text-sm">Success Rate</th>
                                            <th className="text-left py-3 px-4 font-semibold text-sm">Avg Time</th>
                                            <th className="text-left py-3 px-4 font-semibold text-sm">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {analytics.automationStats.map(auto => (
                                            <tr key={auto.id} className="border-b hover:bg-slate-50">
                                                <td className="py-3 px-4 font-medium">{auto.name}</td>
                                                <td className="py-3 px-4">{auto.runs}</td>
                                                <td className="py-3 px-4 text-green-600">{auto.successful}</td>
                                                <td className="py-3 px-4 text-red-600">{auto.failed}</td>
                                                <td className="py-3 px-4">
                                                    <Badge className={
                                                        parseFloat(auto.successRate) >= 95 ? 'bg-green-100 text-green-800' :
                                                        parseFloat(auto.successRate) >= 80 ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-red-100 text-red-800'
                                                    }>
                                                        {auto.successRate}%
                                                    </Badge>
                                                </td>
                                                <td className="py-3 px-4">{auto.avgExecutionTime}s</td>
                                                <td className="py-3 px-4">
                                                    <Badge variant={auto.isActive ? 'default' : 'outline'}>
                                                        {auto.isActive ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="failures">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-red-600" />
                                Failed Executions
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {analytics.failedAutomations.length === 0 ? (
                                <div className="text-center py-8">
                                    <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
                                    <p className="text-slate-600">No failed executions in this period!</p>
                                    <p className="text-sm text-slate-500 mt-1">All automations are running smoothly.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {analytics.failedAutomations.map(auto => (
                                        <div key={auto.id} className="p-4 bg-red-50 rounded-lg border border-red-200">
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="font-semibold text-slate-900">{auto.name}</h4>
                                                <Badge className="bg-red-100 text-red-800">
                                                    {auto.failed} failures
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-slate-600">
                                                <span>Total runs: {auto.runs}</span>
                                                <span>Success rate: {auto.successRate}%</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function StatCard({ label, value, icon: Icon, color, bgColor, trend, subtitle }) {
    return (
        <Card>
            <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-600">{label}</span>
                    <div className={`p-2 rounded-lg ${bgColor}`}>
                        <Icon className={`w-4 h-4 ${color}`} />
                    </div>
                </div>
                <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold text-slate-900">{value}</p>
                    {trend && (
                        <span className={`flex items-center text-xs ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                            {trend === 'up' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                        </span>
                    )}
                </div>
                {subtitle && (
                    <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
                )}
            </CardContent>
        </Card>
    );
}