import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    ChevronDown,
    ChevronRight,
    CheckCircle,
    XCircle,
    Clock,
    PlayCircle,
    Code,
    AlertTriangle,
    Zap,
    ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ExecutionTraceViewer({ trace }) {
    const [expandedSteps, setExpandedSteps] = useState(new Set([0]));

    const toggleStep = (index) => {
        const newExpanded = new Set(expandedSteps);
        if (newExpanded.has(index)) {
            newExpanded.delete(index);
        } else {
            newExpanded.add(index);
        }
        setExpandedSteps(newExpanded);
    };

    const getStepIcon = (step) => {
        if (step.status === 'success') return CheckCircle;
        if (step.status === 'failed' || step.status === 'error') return XCircle;
        if (step.status === 'running') return PlayCircle;
        if (step.status === 'warning') return AlertTriangle;
        return Clock;
    };

    const getStepColor = (step) => {
        if (step.status === 'success') return 'text-green-600';
        if (step.status === 'failed' || step.status === 'error') return 'text-red-600';
        if (step.status === 'running') return 'text-blue-600';
        if (step.status === 'warning') return 'text-yellow-600';
        return 'text-slate-600';
    };

    const getStepBgColor = (step) => {
        if (step.status === 'success') return 'bg-green-50 border-green-200';
        if (step.status === 'failed' || step.status === 'error') return 'bg-red-50 border-red-200';
        if (step.status === 'running') return 'bg-blue-50 border-blue-200';
        if (step.status === 'warning') return 'bg-yellow-50 border-yellow-200';
        return 'bg-slate-50 border-slate-200';
    };

    if (!trace || !trace.steps || trace.steps.length === 0) {
        return null;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-indigo-600" />
                    Execution Trace
                    <Badge className="bg-slate-100 text-slate-800">
                        {trace.steps.length} steps
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {trace.steps.map((step, index) => {
                        const Icon = getStepIcon(step);
                        const isExpanded = expandedSteps.has(index);
                        const isLast = index === trace.steps.length - 1;

                        return (
                            <div key={index} className="relative">
                                {/* Connection Line */}
                                {!isLast && (
                                    <div className="absolute left-4 top-10 bottom-0 w-0.5 bg-slate-200" />
                                )}

                                {/* Step Card */}
                                <div
                                    className={cn(
                                        'border rounded-lg transition-all',
                                        getStepBgColor(step)
                                    )}
                                >
                                    {/* Step Header */}
                                    <button
                                        onClick={() => toggleStep(index)}
                                        className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <Icon className={cn('w-5 h-5 flex-shrink-0', getStepColor(step))} />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Badge className="bg-slate-200 text-slate-800 text-xs">
                                                        Step {index + 1}
                                                    </Badge>
                                                    <span className="font-semibold text-slate-900 truncate">
                                                        {step.name || step.action_type || 'Unknown Step'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-4 text-xs text-slate-600">
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {step.duration_ms || 0}ms
                                                    </span>
                                                    {step.timestamp && (
                                                        <span>
                                                            {new Date(step.timestamp).toLocaleTimeString()}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        {isExpanded ? (
                                            <ChevronDown className="w-5 h-5 text-slate-400" />
                                        ) : (
                                            <ChevronRight className="w-5 h-5 text-slate-400" />
                                        )}
                                    </button>

                                    {/* Step Details */}
                                    {isExpanded && (
                                        <div className="px-4 pb-4 space-y-3 border-t bg-white/50">
                                            {/* Description */}
                                            {step.description && (
                                                <div className="pt-3">
                                                    <p className="text-sm text-slate-600">{step.description}</p>
                                                </div>
                                            )}

                                            {/* Input Data */}
                                            {step.input && (
                                                <div>
                                                    <p className="text-xs font-semibold text-slate-700 mb-2">Input:</p>
                                                    <div className="bg-slate-900 text-slate-100 rounded-lg p-3 text-xs font-mono overflow-x-auto">
                                                        <pre>{JSON.stringify(step.input, null, 2)}</pre>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Output Data */}
                                            {step.output && (
                                                <div>
                                                    <p className="text-xs font-semibold text-slate-700 mb-2">Output:</p>
                                                    <div className="bg-slate-900 text-slate-100 rounded-lg p-3 text-xs font-mono overflow-x-auto">
                                                        <pre>{JSON.stringify(step.output, null, 2)}</pre>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Error Details */}
                                            {step.error && (
                                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                                    <p className="text-xs font-semibold text-red-900 mb-1">Error:</p>
                                                    <p className="text-xs text-red-800">{step.error}</p>
                                                    {step.error_stack && (
                                                        <details className="mt-2">
                                                            <summary className="text-xs text-red-700 cursor-pointer">
                                                                Stack trace
                                                            </summary>
                                                            <pre className="text-xs text-red-600 mt-2 overflow-x-auto">
                                                                {step.error_stack}
                                                            </pre>
                                                        </details>
                                                    )}
                                                </div>
                                            )}

                                            {/* Warnings */}
                                            {step.warnings && step.warnings.length > 0 && (
                                                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                                    <p className="text-xs font-semibold text-yellow-900 mb-2">
                                                        Warnings:
                                                    </p>
                                                    <ul className="space-y-1">
                                                        {step.warnings.map((warning, i) => (
                                                            <li key={i} className="text-xs text-yellow-800">
                                                                • {warning}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            {/* Metadata */}
                                            {step.metadata && Object.keys(step.metadata).length > 0 && (
                                                <div>
                                                    <p className="text-xs font-semibold text-slate-700 mb-2">
                                                        Metadata:
                                                    </p>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {Object.entries(step.metadata).map(([key, value]) => (
                                                            <div
                                                                key={key}
                                                                className="p-2 bg-slate-50 rounded border border-slate-200"
                                                            >
                                                                <p className="text-xs text-slate-500">{key}</p>
                                                                <p className="text-xs font-medium text-slate-900">
                                                                    {String(value)}
                                                                </p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Summary */}
                <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <h4 className="font-semibold text-slate-900 mb-3">Execution Summary</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <p className="text-xs text-slate-600">Total Steps</p>
                            <p className="text-lg font-bold text-slate-900">{trace.steps.length}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-600">Successful</p>
                            <p className="text-lg font-bold text-green-600">
                                {trace.steps.filter(s => s.status === 'success').length}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-600">Failed</p>
                            <p className="text-lg font-bold text-red-600">
                                {trace.steps.filter(s => s.status === 'failed' || s.status === 'error').length}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-600">Total Time</p>
                            <p className="text-lg font-bold text-slate-900">
                                {trace.steps.reduce((sum, s) => sum + (s.duration_ms || 0), 0)}ms
                            </p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}