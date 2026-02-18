
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch'; // New import for Switch component
import { useToast } from '@/components/ui/use-toast'; // New import for toast notifications
import {
    Play, Pause, Edit, Trash2, Eye, MoreVertical, CheckCircle, XCircle,
    Clock, TrendingUp, Zap, Loader2, Edit2 // Loader2 and Edit2 are new icons
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { api } from '@/lib/apiClient'; // New import for API client

export default function AutomationCard({ automation, onToggleActive, onEdit, onDelete, onViewDetails }) {
    const [isRunning, setIsRunning] = useState(false);
    const { toast } = useToast();

    const getCategoryColor = (category) => {
        const colors = {
            inventory: 'bg-blue-100 text-blue-700',
            marketing: 'bg-purple-100 text-purple-700',
            customer_service: 'bg-green-100 text-green-700',
            operations: 'bg-orange-100 text-orange-700',
            analytics: 'bg-indigo-100 text-indigo-700',
            general: 'bg-slate-100 text-slate-700'
        };
        return colors[category] || colors.general;
    };

    const stats = automation.statistics || {};
    const successRate = stats.total_runs > 0
        ? Math.round((stats.successful_runs / stats.total_runs) * 100)
        : 0;

    const handleTestRun = async (e) => {
        e.stopPropagation();
        setIsRunning(true);

        try {
            const response = await api.functions.invoke('testAutomation', {
                automation_id: automation.id
            });

            if (response.data.success) {
                toast({
                    title: 'Test completed successfully!',
                    description: `${response.data.successful_actions} actions executed in ${response.data.execution_time_ms}ms`,
                    variant: 'success'
                });
            } else {
                toast({
                    title: 'Test failed',
                    description: response.data.error || 'Some actions failed',
                    variant: 'destructive'
                });
            }

            // Refresh to show updated statistics
            // This is generally not ideal in React; a better approach would be to update local state or re-fetch data for this specific automation.
            // For now, following the outline's instruction.
            window.location.reload();
        } catch (error) {
            console.error('Test execution error:', error);
            toast({
                title: 'Test failed',
                description: error.message || 'Could not execute automation',
                variant: 'destructive'
            });
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <Card className="group hover:shadow-lg transition-all">
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        {/* The icon's background and text color now reflect the category color */}
                        <div className={`p-2 rounded-lg ${getCategoryColor(automation.category)}`}>
                            <Zap className="w-5 h-5" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">{automation.name}</CardTitle>
                            {/* Description moved to CardDescription in header */}
                            <CardDescription className="text-sm mt-1">
                                {automation.description || 'No description provided'}
                            </CardDescription>
                        </div>
                    </div>
                    {/* Replaced DropdownMenu for active/pause with a Switch component */}
                    <Switch
                        checked={automation.is_active}
                        onCheckedChange={(checked) => onToggleActive(automation.id, checked)}
                    />
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {/* Statistics display remains as in original code */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-slate-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                            <Clock className="w-3 h-3" />
                            Total Runs
                        </div>
                        <div className="text-xl font-bold text-slate-900">
                            {stats.total_runs || 0}
                        </div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                            <TrendingUp className="w-3 h-3" />
                            Success Rate
                        </div>
                        <div className={`text-xl font-bold ${successRate >= 90 ? 'text-green-600' : successRate >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {successRate}%
                        </div>
                    </div>
                </div>

                {/* Action chain count remains as in original code */}
                {automation.action_chain && (
                    <div className="text-xs text-slate-500">
                        {automation.action_chain.length} action{automation.action_chain.length !== 1 ? 's' : ''} configured
                    </div>
                )}

                {/* New button layout for Test Run and View Logs */}
                <div className="flex flex-wrap gap-2 pt-2">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={handleTestRun}
                        disabled={isRunning}
                        className="flex-1"
                    >
                        {isRunning ? (
                            <>
                                <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                                Testing...
                            </>
                        ) : (
                            <>
                                <Play className="w-3 h-3 mr-2" />
                                Test Run
                            </>
                        )}
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                            e.stopPropagation();
                            onViewDetails(automation); // Call onViewDetails prop
                        }}
                        className="flex-1"
                    >
                        <Clock className="w-3 h-3 mr-2" />
                        View Logs
                    </Button>
                </div>

                {/* New button layout for Edit and Delete */}
                <div className="flex gap-2">
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit(automation);
                        }}
                        className="flex-1"
                    >
                        <Edit2 className="w-3 h-3 mr-2" /> {/* Changed to Edit2 as per outline, or Edit */}
                        Edit
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(automation.id);
                        }}
                        className="flex-1 text-red-600 hover:text-red-700"
                    >
                        <Trash2 className="w-3 h-3 mr-2" />
                        Delete
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
