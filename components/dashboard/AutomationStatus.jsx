import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    Zap, 
    Play, 
    Pause, 
    CheckCircle2, 
    AlertCircle, 
    TrendingUp,
    ArrowRight 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { api } from '@/api/apiClient';

export default function AutomationStatus() {
    const navigate = useNavigate();
    const [automations, setAutomations] = useState([]);
    const [stats, setStats] = useState({ active: 0, total: 0, executions24h: 0 });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadAutomations();
    }, []);

    const loadAutomations = async () => {
        setIsLoading(true);
        try {
            const data = await api.entities.Automation.list('-updated_date', 5);
            setAutomations(data);

            // Calculate stats
            const active = data.filter(a => a.is_active).length;
            const executions = data.reduce((sum, a) => 
                sum + (a.statistics?.total_runs || 0), 0
            );

            setStats({
                active,
                total: data.length,
                executions24h: executions
            });
        } catch (error) {
            console.error('Error loading automations:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <Card>
                <CardContent className="p-6">
                    <div className="flex items-center justify-center">
                        <Zap className="w-6 h-6 text-slate-300 animate-pulse" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-white/80 backdrop-blur-sm">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <Zap className="w-5 h-5 text-indigo-600" />
                        Active Automations
                    </CardTitle>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(createPageUrl('Automations'))}
                    >
                        View All
                        <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="text-2xl font-bold text-green-600">
                            {stats.active}
                        </div>
                        <div className="text-xs text-green-600 font-medium">Active</div>
                    </div>
                    <div className="text-center p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                        <div className="text-2xl font-bold text-indigo-600">
                            {stats.total}
                        </div>
                        <div className="text-xs text-indigo-600 font-medium">Total</div>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="text-2xl font-bold text-blue-600">
                            {stats.executions24h}
                        </div>
                        <div className="text-xs text-blue-600 font-medium">Runs</div>
                    </div>
                </div>

                {/* Recent Automations */}
                {automations.length > 0 ? (
                    <div className="space-y-2">
                        {automations.slice(0, 3).map((automation) => {
                            const successRate = automation.statistics?.total_runs > 0
                                ? Math.round((automation.statistics.successful_runs / automation.statistics.total_runs) * 100)
                                : 0;

                            return (
                                <div
                                    key={automation.id}
                                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
                                    onClick={() => navigate(createPageUrl(`AutomationSetup?id=${automation.id}`))}
                                >
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        {automation.is_active ? (
                                            <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                                        ) : (
                                            <Pause className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-900 truncate">
                                                {automation.name}
                                            </p>
                                            {automation.statistics?.total_runs > 0 && (
                                                <p className="text-xs text-slate-500">
                                                    {successRate}% success • {automation.statistics.total_runs} runs
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <Badge 
                                        variant="outline"
                                        className={automation.is_active ? 'border-green-500 text-green-700' : 'border-slate-300 text-slate-600'}
                                    >
                                        {automation.is_active ? 'Active' : 'Paused'}
                                    </Badge>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-6">
                        <Zap className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                        <p className="text-sm text-slate-600 mb-3">No automations yet</p>
                        <Button
                            size="sm"
                            onClick={() => navigate(createPageUrl('AutomationMarketplace'))}
                            className="bg-indigo-600 hover:bg-indigo-700"
                        >
                            Browse Templates
                        </Button>
                    </div>
                )}

                {/* Quick Action */}
                {automations.length > 0 && (
                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => navigate(createPageUrl('AutomationMarketplace'))}
                    >
                        <TrendingUp className="w-4 h-4 mr-2" />
                        Discover More Automations
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}