import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
    CheckCircle, XCircle, AlertTriangle, Clock, ChevronDown, ChevronRight,
    Zap, Mail, Bell, Package, DollarSign, Webhook, Timer, Play
} from 'lucide-react';
import { format } from 'date-fns';

const actionIcons = {
    send_alert: Bell,
    send_email: Mail,
    run_command: Zap,
    update_inventory: Package,
    update_price: DollarSign,
    webhook: Webhook,
    wait: Timer
};

export default function ExecutionLogsViewer({ automation, isOpen, onClose }) {
    const [expandedLogs, setExpandedLogs] = useState(new Set());

    if (!automation) return null;

    const logs = automation.execution_log || [];
    const stats = automation.statistics || {};

    const toggleLogExpansion = (index) => {
        const newExpanded = new Set(expandedLogs);
        if (newExpanded.has(index)) {
            newExpanded.delete(index);
        } else {
            newExpanded.add(index);
        }
        setExpandedLogs(newExpanded);
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'success':
                return <CheckCircle className="w-5 h-5 text-green-500" />;
            case 'partial_success':
                return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
            case 'failed':
                return <XCircle className="w-5 h-5 text-red-500" />;
            default:
                return <Clock className="w-5 h-5 text-slate-400" />;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'success':
                return 'bg-green-100 text-green-700 border-green-200';
            case 'partial_success':
                return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'failed':
                return 'bg-red-100 text-red-700 border-red-200';
            default:
                return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        Execution Logs - {automation.name}
                    </DialogTitle>
                </DialogHeader>

                {/* Statistics Summary */}
                <div className="grid grid-cols-4 gap-3 mb-4">
                    <Card className="bg-slate-50">
                        <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-slate-900">
                                {stats.total_runs || 0}
                            </div>
                            <div className="text-xs text-slate-600">Total Runs</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-green-50">
                        <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-green-700">
                                {stats.successful_runs || 0}
                            </div>
                            <div className="text-xs text-green-600">Successful</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-red-50">
                        <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-red-700">
                                {stats.failed_runs || 0}
                            </div>
                            <div className="text-xs text-red-600">Failed</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-blue-50">
                        <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-blue-700">
                                {Math.round(stats.average_execution_time_ms || 0)}
                            </div>
                            <div className="text-xs text-blue-600">Avg ms</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Execution Logs */}
                <ScrollArea className="h-[400px] pr-4">
                    {logs.length > 0 ? (
                        <div className="space-y-3">
                            {logs.map((log, index) => (
                                <Card 
                                    key={index} 
                                    className={`border-l-4 ${
                                        log.status === 'success' ? 'border-l-green-500' :
                                        log.status === 'partial_success' ? 'border-l-yellow-500' :
                                        'border-l-red-500'
                                    }`}
                                >
                                    <CardContent className="p-4">
                                        <div 
                                            className="flex items-center justify-between cursor-pointer"
                                            onClick={() => toggleLogExpansion(index)}
                                        >
                                            <div className="flex items-center gap-3">
                                                {getStatusIcon(log.status)}
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-slate-900">
                                                            Execution #{logs.length - index}
                                                        </span>
                                                        <Badge className={getStatusColor(log.status)}>
                                                            {log.status}
                                                        </Badge>
                                                        {log.trigger_data?.test_mode && (
                                                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                                                <Play className="w-3 h-3 mr-1" />
                                                                Test
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-slate-500 mt-1">
                                                        {format(new Date(log.timestamp), 'PPpp')} • 
                                                        {' '}{log.execution_time_ms}ms
                                                    </div>
                                                </div>
                                            </div>
                                            {expandedLogs.has(index) ? (
                                                <ChevronDown className="w-5 h-5 text-slate-400" />
                                            ) : (
                                                <ChevronRight className="w-5 h-5 text-slate-400" />
                                            )}
                                        </div>

                                        {expandedLogs.has(index) && (
                                            <div className="mt-4 space-y-3">
                                                {/* Trigger Data */}
                                                {log.trigger_data && (
                                                    <div>
                                                        <div className="text-xs font-semibold text-slate-700 mb-2">
                                                            Trigger Information:
                                                        </div>
                                                        <div className="bg-slate-50 rounded-lg p-3 text-xs">
                                                            <pre className="text-slate-600 whitespace-pre-wrap">
                                                                {JSON.stringify(log.trigger_data, null, 2)}
                                                            </pre>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Actions Executed */}
                                                {log.actions_executed && log.actions_executed.length > 0 && (
                                                    <div>
                                                        <div className="text-xs font-semibold text-slate-700 mb-2">
                                                            Actions Executed:
                                                        </div>
                                                        <div className="space-y-2">
                                                            {log.actions_executed.map((action, actionIndex) => {
                                                                const ActionIcon = actionIcons[action.action_type] || Zap;
                                                                return (
                                                                    <div 
                                                                        key={actionIndex}
                                                                        className={`flex items-start gap-3 p-3 rounded-lg border ${
                                                                            action.status === 'success' 
                                                                                ? 'bg-green-50 border-green-200' 
                                                                                : 'bg-red-50 border-red-200'
                                                                        }`}
                                                                    >
                                                                        <div className="mt-0.5">
                                                                            {action.status === 'success' ? (
                                                                                <CheckCircle className="w-4 h-4 text-green-600" />
                                                                            ) : (
                                                                                <XCircle className="w-4 h-4 text-red-600" />
                                                                            )}
                                                                        </div>
                                                                        <div className="flex-1">
                                                                            <div className="flex items-center gap-2">
                                                                                <ActionIcon className="w-4 h-4 text-slate-600" />
                                                                                <span className="font-semibold text-sm text-slate-900">
                                                                                    {action.action_name}
                                                                                </span>
                                                                                <Badge variant="outline" className="text-xs">
                                                                                    {action.action_type}
                                                                                </Badge>
                                                                            </div>
                                                                            {action.result && (
                                                                                <div className="mt-2 text-xs text-slate-600">
                                                                                    {typeof action.result === 'object' ? (
                                                                                        <pre className="whitespace-pre-wrap">
                                                                                            {JSON.stringify(action.result, null, 2)}
                                                                                        </pre>
                                                                                    ) : (
                                                                                        action.result
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                            {action.error && (
                                                                                <div className="mt-2 text-xs text-red-600">
                                                                                    Error: {action.error}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Error Message */}
                                                {log.error_message && (
                                                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                                        <div className="text-xs font-semibold text-red-700 mb-1">
                                                            Error:
                                                        </div>
                                                        <div className="text-xs text-red-600">
                                                            {log.error_message}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <Clock className="mx-auto h-12 w-12 text-slate-300" />
                            <h3 className="mt-4 text-lg font-medium text-slate-900">No execution logs yet</h3>
                            <p className="mt-2 text-sm text-slate-500">
                                Run a test to see execution logs appear here
                            </p>
                        </div>
                    )}
                </ScrollArea>

                <div className="flex justify-end pt-4 border-t">
                    <Button onClick={onClose}>Close</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}