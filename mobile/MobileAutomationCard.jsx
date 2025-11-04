import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Play,
    Pause,
    MoreVertical,
    CheckCircle2,
    XCircle,
    Clock,
    Zap,
    ChevronRight
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function MobileAutomationCard({ automation, onToggle, onView, onEdit, onDelete }) {
    const getStatusColor = () => {
        if (!automation.is_active) return 'bg-slate-100 text-slate-600';
        const stats = automation.statistics;
        if (!stats || stats.total_runs === 0) return 'bg-blue-100 text-blue-600';
        const successRate = (stats.successful_runs / stats.total_runs) * 100;
        if (successRate >= 90) return 'bg-green-100 text-green-600';
        if (successRate >= 70) return 'bg-yellow-100 text-yellow-600';
        return 'bg-red-100 text-red-600';
    };

    const getSuccessRate = () => {
        const stats = automation.statistics;
        if (!stats || stats.total_runs === 0) return 0;
        return Math.round((stats.successful_runs / stats.total_runs) * 100);
    };

    return (
        <Card className="touch-manipulation">
            <CardContent className="p-4">
                <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <Zap className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                                <h3 className="font-semibold text-slate-900 text-sm truncate">
                                    {automation.name}
                                </h3>
                            </div>
                            {automation.description && (
                                <p className="text-xs text-slate-600 line-clamp-2">
                                    {automation.description}
                                </p>
                            )}
                        </div>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-8 w-8 flex-shrink-0">
                                    <MoreVertical className="w-4 h-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => onView(automation)}>
                                    <ChevronRight className="w-4 h-4 mr-2" />
                                    View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onEdit(automation)}>
                                    Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                    onClick={() => onDelete(automation)}
                                    className="text-red-600"
                                >
                                    Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {/* Status & Stats */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={getStatusColor()}>
                            {automation.is_active ? (
                                <>
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    Active
                                </>
                            ) : (
                                <>
                                    <Pause className="w-3 h-3 mr-1" />
                                    Paused
                                </>
                            )}
                        </Badge>

                        {automation.statistics?.total_runs > 0 && (
                            <>
                                <Badge variant="outline" className="text-xs">
                                    {getSuccessRate()}% success
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                    {automation.statistics.total_runs} runs
                                </Badge>
                            </>
                        )}

                        {automation.category && (
                            <Badge variant="outline" className="text-xs">
                                {automation.category}
                            </Badge>
                        )}
                    </div>

                    {/* Last Run */}
                    {automation.statistics?.last_run && (
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Clock className="w-3 h-3" />
                            <span>
                                Last run: {new Date(automation.statistics.last_run).toLocaleDateString()}
                            </span>
                        </div>
                    )}

                    {/* Toggle Button */}
                    <Button
                        onClick={() => onToggle(automation)}
                        className="w-full"
                        variant={automation.is_active ? 'outline' : 'default'}
                        size="sm"
                    >
                        {automation.is_active ? (
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
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}