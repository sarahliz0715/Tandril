import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GitBranch, Edit2, Trash2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ConditionalNode({ node, onEdit, onDelete, onAddBranch }) {
    const getOperatorLabel = (operator) => {
        const labels = {
            'equals': '=',
            'not_equals': '≠',
            'greater_than': '>',
            'less_than': '<',
            'greater_or_equal': '≥',
            'less_or_equal': '≤',
            'contains': '⊃',
            'not_contains': '⊅',
            'is_empty': 'empty',
            'is_not_empty': 'not empty'
        };
        return labels[operator] || operator;
    };

    const condition = node.config?.condition || {};
    const hasCondition = condition.field && condition.operator;

    return (
        <div className="relative">
            <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200 hover:shadow-lg transition-all">
                <div className="p-4">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <GitBranch className="w-4 h-4 text-purple-600" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-slate-900 text-sm">
                                    {node.name || 'Conditional Branch'}
                                </h4>
                                <p className="text-xs text-slate-600">If/Then/Else Logic</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => onEdit(node)}
                            >
                                <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-red-600 hover:text-red-700"
                                onClick={() => onDelete(node)}
                            >
                                <Trash2 className="w-3 h-3" />
                            </Button>
                        </div>
                    </div>

                    {/* Condition Display */}
                    {hasCondition ? (
                        <div className="bg-white rounded-lg p-3 border border-purple-200 mb-3">
                            <div className="flex items-center gap-2 text-sm">
                                <Badge className="bg-purple-100 text-purple-800 font-mono text-xs">
                                    IF
                                </Badge>
                                <span className="font-semibold text-slate-900">
                                    {condition.field}
                                </span>
                                <Badge variant="outline" className="font-mono text-xs">
                                    {getOperatorLabel(condition.operator)}
                                </Badge>
                                {condition.value !== undefined && condition.value !== '' && (
                                    <span className="font-semibold text-indigo-600">
                                        {typeof condition.value === 'object' 
                                            ? JSON.stringify(condition.value)
                                            : String(condition.value)
                                        }
                                    </span>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                            <p className="text-xs text-yellow-800">
                                ⚠️ No condition configured. Click edit to set up logic.
                            </p>
                        </div>
                    )}

                    {/* Branch Actions */}
                    <div className="space-y-2">
                        {/* True Branch */}
                        <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-2">
                            <div className="flex items-center gap-2">
                                <Badge className="bg-green-600 text-white text-xs">TRUE</Badge>
                                <span className="text-xs text-slate-600">
                                    {node.config?.true_action_id ? (
                                        `Action: ${node.config.true_action_name || 'Configured'}`
                                    ) : (
                                        'No action'
                                    )}
                                </span>
                            </div>
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 text-xs"
                                onClick={() => onAddBranch(node, 'true')}
                            >
                                <Plus className="w-3 h-3 mr-1" />
                                {node.config?.true_action_id ? 'Change' : 'Add'}
                            </Button>
                        </div>

                        {/* False Branch */}
                        <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-lg p-2">
                            <div className="flex items-center gap-2">
                                <Badge className="bg-red-600 text-white text-xs">FALSE</Badge>
                                <span className="text-xs text-slate-600">
                                    {node.config?.false_action_id ? (
                                        `Action: ${node.config.false_action_name || 'Configured'}`
                                    ) : (
                                        'No action'
                                    )}
                                </span>
                            </div>
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 text-xs"
                                onClick={() => onAddBranch(node, 'false')}
                            >
                                <Plus className="w-3 h-3 mr-1" />
                                {node.config?.false_action_id ? 'Change' : 'Add'}
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Branch Indicators */}
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex gap-8">
                <div className="w-0.5 h-6 bg-green-300" />
                <div className="w-0.5 h-6 bg-red-300" />
            </div>
        </div>
    );
}