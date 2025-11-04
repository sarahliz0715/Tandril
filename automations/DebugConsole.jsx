import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Terminal,
    Download,
    Trash2,
    Filter,
    Search,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Clock,
    Code
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DebugConsole({ executionLogs = [] }) {
    const [logs, setLogs] = useState([]);
    const [filter, setFilter] = useState('all'); // all, success, failed, warning
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        // Process and format logs
        const processedLogs = executionLogs.flatMap(execution => {
            const baseLogs = [];
            
            // Add execution start log
            baseLogs.push({
                timestamp: execution.timestamp,
                level: 'info',
                message: `Execution started`,
                execution_id: execution.execution_id,
                metadata: execution
            });

            // Add action logs
            if (execution.actions_executed) {
                execution.actions_executed.forEach((action, index) => {
                    baseLogs.push({
                        timestamp: new Date(new Date(execution.timestamp).getTime() + index * 100).toISOString(),
                        level: action.status === 'success' ? 'success' : action.status === 'failed' ? 'error' : 'warning',
                        message: `Action: ${action.action_name || 'Unknown'} - ${action.status}`,
                        execution_id: execution.execution_id,
                        action_id: action.action_id,
                        metadata: action
                    });
                });
            }

            // Add completion log
            baseLogs.push({
                timestamp: new Date(new Date(execution.timestamp).getTime() + 1000).toISOString(),
                level: execution.status === 'success' ? 'success' : 'error',
                message: `Execution ${execution.status} in ${execution.execution_time_ms}ms`,
                execution_id: execution.execution_id,
                metadata: execution
            });

            // Add error log if exists
            if (execution.error_message) {
                baseLogs.push({
                    timestamp: execution.timestamp,
                    level: 'error',
                    message: execution.error_message,
                    execution_id: execution.execution_id,
                    metadata: { error: execution.error_message }
                });
            }

            return baseLogs;
        });

        setLogs(processedLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
    }, [executionLogs]);

    const filteredLogs = logs.filter(log => {
        // Filter by level
        if (filter !== 'all') {
            if (filter === 'success' && log.level !== 'success') return false;
            if (filter === 'failed' && log.level !== 'error') return false;
            if (filter === 'warning' && log.level !== 'warning') return false;
        }

        // Filter by search term
        if (searchTerm && !log.message.toLowerCase().includes(searchTerm.toLowerCase())) {
            return false;
        }

        return true;
    });

    const getLevelIcon = (level) => {
        switch (level) {
            case 'success':
                return <CheckCircle className="w-4 h-4 text-green-600" />;
            case 'error':
                return <XCircle className="w-4 h-4 text-red-600" />;
            case 'warning':
                return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
            default:
                return <Clock className="w-4 h-4 text-blue-600" />;
        }
    };

    const getLevelColor = (level) => {
        switch (level) {
            case 'success':
                return 'text-green-600';
            case 'error':
                return 'text-red-600';
            case 'warning':
                return 'text-yellow-600';
            default:
                return 'text-blue-600';
        }
    };

    const exportLogs = () => {
        const content = filteredLogs.map(log => 
            `[${new Date(log.timestamp).toISOString()}] [${log.level.toUpperCase()}] ${log.message}`
        ).join('\n');

        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `automation-logs-${new Date().toISOString()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const clearLogs = () => {
        setLogs([]);
    };

    return (
        <Card className="border-slate-200">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <Terminal className="w-5 h-5 text-slate-600" />
                        Debug Console
                        <Badge className="bg-slate-200 text-slate-800">
                            {filteredLogs.length} logs
                        </Badge>
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={exportLogs}>
                            <Download className="w-4 h-4 mr-2" />
                            Export
                        </Button>
                        <Button size="sm" variant="outline" onClick={clearLogs}>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Clear
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Filters */}
                <div className="flex items-center gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Search logs..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-slate-400" />
                        <Tabs value={filter} onValueChange={setFilter}>
                            <TabsList>
                                <TabsTrigger value="all">All</TabsTrigger>
                                <TabsTrigger value="success">Success</TabsTrigger>
                                <TabsTrigger value="failed">Failed</TabsTrigger>
                                <TabsTrigger value="warning">Warnings</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                </div>

                {/* Console Output */}
                <div className="bg-slate-900 rounded-lg p-4 font-mono text-xs h-96 overflow-y-auto space-y-1">
                    {filteredLogs.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-slate-500">
                            <p>No logs to display</p>
                        </div>
                    ) : (
                        filteredLogs.map((log, index) => (
                            <div
                                key={index}
                                className="flex items-start gap-2 hover:bg-slate-800 p-1 rounded group"
                            >
                                <span className="text-slate-500 flex-shrink-0">
                                    {new Date(log.timestamp).toLocaleTimeString()}
                                </span>
                                <span className={cn('flex-shrink-0', getLevelColor(log.level))}>
                                    [{log.level.toUpperCase()}]
                                </span>
                                <span className="text-slate-100 flex-1">{log.message}</span>
                                {log.metadata && (
                                    <details className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <summary className="cursor-pointer text-slate-400 hover:text-slate-200">
                                            <Code className="w-3 h-3 inline" />
                                        </summary>
                                        <pre className="mt-2 text-slate-300 bg-slate-950 p-2 rounded overflow-x-auto">
                                            {JSON.stringify(log.metadata, null, 2)}
                                        </pre>
                                    </details>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 pt-4 border-t border-slate-200">
                    <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-slate-600">
                            {logs.filter(l => l.level === 'success').length} success
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-red-600" />
                        <span className="text-sm text-slate-600">
                            {logs.filter(l => l.level === 'error').length} errors
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-600" />
                        <span className="text-sm text-slate-600">
                            {logs.filter(l => l.level === 'warning').length} warnings
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}