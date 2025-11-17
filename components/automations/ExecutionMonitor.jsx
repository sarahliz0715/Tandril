import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
    Play, 
    Pause, 
    CheckCircle, 
    XCircle, 
    Clock, 
    Loader2,
    AlertCircle,
    Activity,
    ChevronRight
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function ExecutionMonitor({ automationId = null }) {
    const [executions, setExecutions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedExecution, setExpandedExecution] = useState(null);

    useEffect(() => {
        loadExecutions();
        
        // Poll for updates every 5 seconds
        const interval = setInterval(loadExecutions, 5000);
        return () => clearInterval(interval);
    }, [automationId]);

    const loadExecutions = async () => {
        try {
            const automations = automationId 
                ? [await base44.entities.Automation.get(automationId)]
                : await base44.entities.Automation.list('-updated_date', 50);

            // Extract recent executions from all automations
            const allExecutions = [];
            automations.forEach(automation => {
                if (automation.execution_log && automation.execution_log.length > 0) {
                    automation.execution_log.slice(0, 10).forEach(log => {
                        allExecutions.push({
                            ...log,
                            automation_id: automation.id,
                            automation_name: automation.name,
                            automation_icon: automation.icon
                        });
                    });
                }
            });

            // Sort by timestamp
            allExecutions.sort((a, b) => 
                new Date(b.timestamp) - new Date(a.timestamp)
            );

            setExecutions(allExecutions.slice(0, 20));
        } catch (error) {
            console.error('Error loading executions:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'success':
                return <CheckCircle className="w-5 h-5 text-green-600" />;
            case 'failed':
                return <XCircle className="w-5 h-5 text-red-600" />;
            case 'partial_success':
                return <AlertCircle className="w-5 h-5 text-yellow-600" />;
            case 'running':
                return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
            default:
                return <Clock className="w-5 h-5 text-slate-400" />;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'success':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'failed':
                return 'bg-red-100 text-red-800 border-red-200';
            case 'partial_success':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'running':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            default:
                return 'bg-slate-100 text-slate-800 border-slate-200';
        }
    };

    const formatDuration = (ms) => {
        if (!ms) return 'N/A';
        if (ms < 1000) return `${ms}ms`;
        return `${(ms / 1000).toFixed(1)}s`;
    };

    const formatTimestamp = (timestamp) => {
        if (!timestamp) return 'Unknown';
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
        return date.toLocaleDateString();
    };

    const calculateProgress = (execution) => {
        if (!execution.actions_executed || execution.actions_executed.length === 0) return 0;
        
        const completed = execution.actions_executed.filter(a => a.status === 'completed').length;
        const total = execution.actions_executed.length;
        return (completed / total) * 100;
    };

    if (isLoading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center p-8">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </CardContent>
            </Card>
        );
    }

    const runningExecutions = executions.filter(e => e.status === 'running');
    const recentExecutions = executions.filter(e => e.status !== 'running');

    return (
        <div className="space-y-6">
            {/* Currently Running */}
            {runningExecutions.length > 0 && (
                <Card className="border-blue-200 bg-blue-50">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Activity className="w-5 h-5 text-blue-600 animate-pulse" />
                            Currently Running ({runningExecutions.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {runningExecutions.map((execution, index) => (
                            <div key={index} className="bg-white rounded-lg p-4 border border-blue-200">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                                        <div>
                                            <h4 className="font-semibold text-slate-900">
                                                {execution.automation_name}
                                            </h4>
                                            <p className="text-xs text-slate-500">
                                                Started {formatTimestamp(execution.timestamp)}
                                            </p>
                                        </div>
                                    </div>
                                    <Badge className="bg-blue-600 text-white">
                                        Running
                                    </Badge>
                                </div>
                                
                                <div className="mt-3">
                                    <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                                        <span>Progress</span>
                                        <span>{Math.round(calculateProgress(execution))}%</span>
                                    </div>
                                    <Progress value={calculateProgress(execution)} className="h-2" />
                                </div>

                                {execution.actions_executed && execution.actions_executed.length > 0 && (
                                    <div className="mt-3 space-y-1">
                                        {execution.actions_executed.map((action, idx) => (
                                            <div key={idx} className="flex items-center gap-2 text-xs">
                                                {action.status === 'completed' ? (
                                                    <CheckCircle className="w-3 h-3 text-green-600" />
                                                ) : action.status === 'running' ? (
                                                    <Loader2 className="w-3 h-3 text-blue-600 animate-spin" />
                                                ) : (
                                                    <Clock className="w-3 h-3 text-slate-400" />
                                                )}
                                                <span className="text-slate-600">
                                                    {action.action_name || `Step ${idx + 1}`}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Recent Executions */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Clock className="w-5 h-5 text-slate-600" />
                        Recent Executions
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {recentExecutions.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                            <Activity className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                            <p className="text-sm">No recent executions</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {recentExecutions.map((execution, index) => (
                                <div 
                                    key={index} 
                                    className="border rounded-lg p-3 hover:bg-slate-50 transition-colors cursor-pointer"
                                    onClick={() => setExpandedExecution(
                                        expandedExecution === index ? null : index
                                    )}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 flex-1">
                                            {getStatusIcon(execution.status)}
                                            <div className="flex-1">
                                                <h4 className="font-medium text-slate-900 text-sm">
                                                    {execution.automation_name}
                                                </h4>
                                                <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                                                    <span>{formatTimestamp(execution.timestamp)}</span>
                                                    <span>•</span>
                                                    <span>{formatDuration(execution.execution_time_ms)}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge className={getStatusColor(execution.status)}>
                                                {execution.status}
                                            </Badge>
                                            <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${
                                                expandedExecution === index ? 'rotate-90' : ''
                                            }`} />
                                        </div>
                                    </div>

                                    {/* Expanded Details */}
                                    {expandedExecution === index && (
                                        <div className="mt-3 pt-3 border-t space-y-2">
                                            {execution.trigger_data && (
                                                <div className="bg-slate-50 rounded p-2">
                                                    <p className="text-xs font-semibold text-slate-700 mb-1">
                                                        Trigger Data:
                                                    </p>
                                                    <pre className="text-xs text-slate-600 overflow-x-auto">
                                                        {JSON.stringify(execution.trigger_data, null, 2)}
                                                    </pre>
                                                </div>
                                            )}

                                            {execution.actions_executed && execution.actions_executed.length > 0 && (
                                                <div>
                                                    <p className="text-xs font-semibold text-slate-700 mb-2">
                                                        Actions Executed:
                                                    </p>
                                                    <div className="space-y-1">
                                                        {execution.actions_executed.map((action, idx) => (
                                                            <div key={idx} className="flex items-start gap-2 text-xs">
                                                                {action.status === 'completed' ? (
                                                                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                                                                ) : (
                                                                    <XCircle className="w-4 h-4 text-red-600 mt-0.5" />
                                                                )}
                                                                <div className="flex-1">
                                                                    <p className="text-slate-700">
                                                                        {action.action_name || `Action ${idx + 1}`}
                                                                    </p>
                                                                    {action.error && (
                                                                        <p className="text-red-600 text-xs mt-0.5">
                                                                            Error: {action.error}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {execution.error_message && (
                                                <div className="bg-red-50 rounded p-2">
                                                    <p className="text-xs font-semibold text-red-700 mb-1">
                                                        Error:
                                                    </p>
                                                    <p className="text-xs text-red-600">
                                                        {execution.error_message}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}