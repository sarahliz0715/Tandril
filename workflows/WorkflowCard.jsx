import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Play, Pause, Settings, MoreVertical } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export default function WorkflowCard({ workflow, onEdit, onToggle, onDelete }) {
    // Guard against undefined workflow
    if (!workflow) {
        return null;
    }

    // Safely access trigger properties with defaults
    const triggerConfig = workflow.trigger_config || {};
    const triggerType = workflow.trigger_type || 'manual';
    
    const formatTrigger = () => {
        switch (triggerType) {
            case 'schedule':
                const frequency = triggerConfig.frequency || 'daily';
                const hour = triggerConfig.hour || 9;
                return `${frequency.charAt(0).toUpperCase() + frequency.slice(1)} at ${hour}:00`;
            case 'event':
                return `On ${triggerConfig.event_name || 'event'}`;
            case 'manual':
            default:
                return 'Manual trigger';
        }
    };

    return (
        <Card className="bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-semibold">{workflow.name || 'Unnamed Workflow'}</CardTitle>
                <div className="flex items-center gap-2">
                    <Badge variant={workflow.is_active ? "default" : "secondary"}>
                        {workflow.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEdit && onEdit(workflow)}>
                                <Settings className="w-4 h-4 mr-2" />
                                Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onToggle && onToggle(workflow)}>
                                {workflow.is_active ? (
                                    <>
                                        <Pause className="w-4 h-4 mr-2" />
                                        Pause
                                    </>
                                ) : (
                                    <>
                                        <Play className="w-4 h-4 mr-2" />
                                        Activate
                                    </>
                                )}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onDelete && onDelete(workflow)} className="text-red-600">
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-gray-600 mb-4">{workflow.description || 'No description available'}</p>
                <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-gray-500">
                        <Clock className="w-4 h-4" />
                        <span>{formatTrigger()}</span>
                    </div>
                    <span className="text-gray-500">
                        {workflow.commands?.length || 0} command{(workflow.commands?.length || 0) !== 1 ? 's' : ''}
                    </span>
                </div>
                {workflow.last_run && (
                    <div className="mt-2 text-xs text-gray-500">
                        Last run: {new Date(workflow.last_run).toLocaleDateString()}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}