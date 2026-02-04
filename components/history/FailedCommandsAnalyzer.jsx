import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AICommand } from '@/lib/entities';
import { AlertTriangle, XCircle, ChevronDown, ChevronUp, Code, Copy } from 'lucide-react';
import { toast } from 'sonner';

export default function FailedCommandsAnalyzer() {
    const [failedCommands, setFailedCommands] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedCommand, setExpandedCommand] = useState(null);

    useEffect(() => {
        loadFailedCommands();
    }, []);

    const loadFailedCommands = async () => {
        setIsLoading(true);
        try {
            const commands = await AICommand.list('-created_at', 50);
            const failed = commands.filter(cmd => 
                cmd.status === 'failed' || 
                cmd.status === 'partially_completed' ||
                cmd.error
            );
            setFailedCommands(failed);
        } catch (error) {
            console.error('Failed to load commands:', error);
            toast.error('Failed to load command history');
        } finally {
            setIsLoading(false);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        toast.success('Copied to clipboard');
    };

    const analyzeFailure = (command) => {
        const issues = [];
        
        // Check for structure issues
        if (!command.actions_planned || command.actions_planned.length === 0) {
            if (command.actions && command.actions.length > 0) {
                issues.push({
                    type: 'structure',
                    severity: 'high',
                    message: 'Command has "actions" but missing "actions_planned" - this was causing the 400 error',
                    fix: 'This is now fixed in the code. The command will work if you retry it.'
                });
            } else {
                issues.push({
                    type: 'structure',
                    severity: 'medium',
                    message: 'No actions were planned for this command',
                    fix: 'Try rephrasing the command to be more specific about what you want to do.'
                });
            }
        }

        // Check for platform issues
        if (command.platform_targets && command.platform_targets.length === 0) {
            issues.push({
                type: 'platform',
                severity: 'medium',
                message: 'No platforms were targeted',
                fix: 'Make sure you have connected platforms and they are selected.'
            });
        }

        // Check for authentication issues
        if (command.error && (
            command.error.includes('401') || 
            command.error.includes('Unauthorized') ||
            command.error.includes('authentication')
        )) {
            issues.push({
                type: 'auth',
                severity: 'high',
                message: 'Authentication failed',
                fix: 'Reconnect your platform in the Platforms page.'
            });
        }

        // Check for specific error messages
        if (command.error && command.error.includes('actions_planned is required')) {
            issues.push({
                type: 'structure',
                severity: 'high',
                message: 'Command structure mismatch (actions vs actions_planned)',
                fix: 'This bug has been fixed. Retry the command and it should work now.'
            });
        }

        // Check for Redbubble/non-Shopify platforms
        if (command.platform_targets && command.platform_targets.some(p => 
            p.toLowerCase().includes('redbubble') || 
            p.toLowerCase().includes('etsy') ||
            p.toLowerCase().includes('teepublic')
        )) {
            issues.push({
                type: 'platform',
                severity: 'critical',
                message: 'Command targeted a non-Shopify platform',
                fix: 'Currently, only Shopify commands are fully functional. Other platform integrations are in development.'
            });
        }

        return issues;
    };

    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'critical': return 'bg-red-100 text-red-800 border-red-200';
            case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            default: return 'bg-blue-100 text-blue-800 border-blue-200';
        }
    };

    if (isLoading) {
        return <div className="text-center py-8 text-slate-500">Loading failed commands...</div>;
    }

    if (failedCommands.length === 0) {
        return (
            <Card className="bg-green-50 border-green-200">
                <CardContent className="pt-6 text-center">
                    <p className="text-green-800 font-medium">✅ No failed commands found!</p>
                    <p className="text-sm text-green-600 mt-2">All your recent commands executed successfully.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-orange-600" />
                        Failed Commands Analysis
                    </CardTitle>
                    <p className="text-sm text-slate-600">
                        Found {failedCommands.length} command(s) with issues. Click to see details and suggested fixes.
                    </p>
                </CardHeader>
            </Card>

            {failedCommands.map((command) => {
                const issues = analyzeFailure(command);
                const isExpanded = expandedCommand === command.id;

                return (
                    <Card key={command.id} className="border-l-4 border-l-red-400">
                        <CardContent className="pt-6">
                            <div className="space-y-4">
                                {/* Command Header */}
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <XCircle className="w-4 h-4 text-red-500" />
                                            <span className="font-medium text-slate-900">
                                                {command.command_text}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                                {command.status}
                                            </Badge>
                                            <span>
                                                {new Date(command.created_at).toLocaleString()}
                                            </span>
                                            {command.platform_targets && command.platform_targets.length > 0 && (
                                                <Badge variant="outline">
                                                    {command.platform_targets.join(', ')}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setExpandedCommand(isExpanded ? null : command.id)}
                                    >
                                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </Button>
                                </div>

                                {/* Issues Found */}
                                <div className="space-y-2">
                                    <h4 className="text-sm font-semibold text-slate-700">Issues Found:</h4>
                                    {issues.map((issue, idx) => (
                                        <div key={idx} className={`p-3 rounded-lg border ${getSeverityColor(issue.severity)}`}>
                                            <div className="flex items-start gap-2">
                                                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                                <div className="flex-1">
                                                    <p className="font-medium text-sm">{issue.message}</p>
                                                    <p className="text-xs mt-1 opacity-90">
                                                        <strong>Fix:</strong> {issue.fix}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Expanded Details */}
                                {isExpanded && (
                                    <div className="space-y-3 pt-3 border-t">
                                        {/* Error Message */}
                                        {command.error && (
                                            <div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <h5 className="text-sm font-semibold text-slate-700">Error Message:</h5>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => copyToClipboard(command.error)}
                                                    >
                                                        <Copy className="w-3 h-3 mr-1" />
                                                        Copy
                                                    </Button>
                                                </div>
                                                <pre className="text-xs bg-slate-50 p-3 rounded border overflow-auto max-h-40">
                                                    {command.error}
                                                </pre>
                                            </div>
                                        )}

                                        {/* Full Command Data */}
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <h5 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                                    <Code className="w-4 h-4" />
                                                    Full Command Data:
                                                </h5>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => copyToClipboard(JSON.stringify(command, null, 2))}
                                                >
                                                    <Copy className="w-3 h-3 mr-1" />
                                                    Copy JSON
                                                </Button>
                                            </div>
                                            <pre className="text-xs bg-slate-50 p-3 rounded border overflow-auto max-h-60">
                                                {JSON.stringify(command, null, 2)}
                                            </pre>
                                        </div>

                                        {/* Actions Planned vs Actions */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <h5 className="text-xs font-semibold text-slate-700 mb-1">actions_planned:</h5>
                                                <pre className="text-xs bg-slate-50 p-2 rounded border overflow-auto max-h-32">
                                                    {JSON.stringify(command.actions_planned, null, 2) || 'null'}
                                                </pre>
                                            </div>
                                            <div>
                                                <h5 className="text-xs font-semibold text-slate-700 mb-1">actions:</h5>
                                                <pre className="text-xs bg-slate-50 p-2 rounded border overflow-auto max-h-32">
                                                    {JSON.stringify(command.actions, null, 2) || 'null'}
                                                </pre>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}