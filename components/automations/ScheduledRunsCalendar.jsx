import React, { useState, useEffect } from 'react';
import { api } from '@/api/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Calendar,
    Clock,
    Zap,
    ChevronLeft,
    ChevronRight,
    Play,
    Loader2
} from 'lucide-react';
import { toast } from 'sonner';

export default function ScheduledRunsCalendar() {
    const [scheduledTriggers, setScheduledTriggers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());

    useEffect(() => {
        loadScheduledTriggers();
    }, []);

    const loadScheduledTriggers = async () => {
        try {
            const triggers = await api.entities.AutomationTrigger.filter({
                trigger_type: 'schedule',
                is_active: true
            });

            // Calculate next run times
            const triggersWithNextRun = triggers.map(trigger => ({
                ...trigger,
                next_run: calculateNextRun(trigger)
            }));

            setScheduledTriggers(triggersWithNextRun);
        } catch (error) {
            console.error('Error loading scheduled triggers:', error);
            toast.error('Failed to load scheduled automations');
        } finally {
            setLoading(false);
        }
    };

    const calculateNextRun = (trigger) => {
        const schedule = trigger.schedule_config;
        if (!schedule) return null;

        const now = new Date();
        
        switch (schedule.frequency) {
            case 'hourly':
                return new Date(now.getTime() + 60 * 60 * 1000);
            
            case 'daily':
                return getNextDaily(now, schedule.time_of_day);
            
            case 'weekly':
                return getNextWeekly(now, schedule.day_of_week, schedule.time_of_day);
            
            case 'monthly':
                return getNextMonthly(now, schedule.day_of_month, schedule.time_of_day);
            
            default:
                return null;
        }
    };

    const handleManualRun = async (trigger) => {
        try {
            toast.info('Running automation manually...');
            
            const result = await api.functions.invoke('evaluateTriggers', {
                trigger_id: trigger.id,
                event_data: { manual: true }
            });

            if (result.triggered) {
                toast.success(`Automation executed! ${result.automations_executed} workflow(s) ran.`);
            } else {
                toast.info('Automation evaluated but did not trigger.');
            }

            loadScheduledTriggers();
        } catch (error) {
            console.error('Error running automation:', error);
            toast.error('Failed to run automation');
        }
    };

    const upcomingRuns = scheduledTriggers
        .filter(t => t.next_run)
        .sort((a, b) => new Date(a.next_run) - new Date(b.next_run))
        .slice(0, 10);

    if (loading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-indigo-600" />
                        Upcoming Scheduled Runs
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {upcomingRuns.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                            <Clock className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                            <p>No scheduled automations found.</p>
                            <p className="text-sm mt-1">Create automations with scheduled triggers to see them here.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {upcomingRuns.map((trigger) => (
                                <ScheduledRunCard
                                    key={trigger.id}
                                    trigger={trigger}
                                    onManualRun={handleManualRun}
                                />
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Zap className="w-5 h-5 text-indigo-600" />
                        Schedule Summary
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard
                            label="Total Scheduled"
                            value={scheduledTriggers.length}
                            icon={Calendar}
                        />
                        <StatCard
                            label="Hourly"
                            value={scheduledTriggers.filter(t => t.schedule_config?.frequency === 'hourly').length}
                            icon={Clock}
                        />
                        <StatCard
                            label="Daily"
                            value={scheduledTriggers.filter(t => t.schedule_config?.frequency === 'daily').length}
                            icon={Clock}
                        />
                        <StatCard
                            label="Weekly"
                            value={scheduledTriggers.filter(t => t.schedule_config?.frequency === 'weekly').length}
                            icon={Clock}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function ScheduledRunCard({ trigger, onManualRun }) {
    const getTimeUntil = (nextRun) => {
        if (!nextRun) return 'Not scheduled';
        
        const now = new Date();
        const next = new Date(nextRun);
        const diff = next - now;
        
        if (diff < 0) return 'Overdue';
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        if (hours > 24) {
            const days = Math.floor(hours / 24);
            return `in ${days} day${days > 1 ? 's' : ''}`;
        } else if (hours > 0) {
            return `in ${hours}h ${minutes}m`;
        } else {
            return `in ${minutes}m`;
        }
    };

    const getFrequencyBadge = (frequency) => {
        const colors = {
            hourly: 'bg-blue-100 text-blue-800 border-blue-200',
            daily: 'bg-green-100 text-green-800 border-green-200',
            weekly: 'bg-purple-100 text-purple-800 border-purple-200',
            monthly: 'bg-orange-100 text-orange-800 border-orange-200'
        };
        
        return colors[frequency] || 'bg-slate-100 text-slate-800 border-slate-200';
    };

    const schedule = trigger.schedule_config;

    return (
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-slate-900 truncate">{trigger.name}</h4>
                    <Badge className={`text-xs ${getFrequencyBadge(schedule?.frequency)}`}>
                        {schedule?.frequency}
                    </Badge>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-slate-600">
                    <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{getTimeUntil(trigger.next_run)}</span>
                    </div>
                    {trigger.next_run && (
                        <span className="text-xs">
                            {new Date(trigger.next_run).toLocaleString()}
                        </span>
                    )}
                </div>

                {schedule?.time_of_day && (
                    <div className="text-xs text-slate-500 mt-1">
                        Runs at {schedule.time_of_day} {schedule.timezone || 'UTC'}
                    </div>
                )}
            </div>

            <Button
                size="sm"
                variant="outline"
                onClick={() => onManualRun(trigger)}
            >
                <Play className="w-3 h-3 mr-1" />
                Run Now
            </Button>
        </div>
    );
}

function StatCard({ label, value, icon: Icon }) {
    return (
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">{label}</span>
                <Icon className="w-4 h-4 text-indigo-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
        </div>
    );
}

function getNextDaily(now, timeOfDay) {
    if (!timeOfDay) return null;
    
    const [hour, minute] = timeOfDay.split(':').map(Number);
    const next = new Date(now);
    next.setHours(hour, minute, 0, 0);
    
    if (next <= now) {
        next.setDate(next.getDate() + 1);
    }
    
    return next;
}

function getNextWeekly(now, daysOfWeek, timeOfDay) {
    if (!daysOfWeek || daysOfWeek.length === 0) return null;
    
    const [hour, minute] = timeOfDay ? timeOfDay.split(':').map(Number) : [0, 0];
    const currentDay = now.getDay();
    
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayNumbers = daysOfWeek.map(day => days.indexOf(day)).sort((a, b) => a - b);
    
    let nextDay = dayNumbers.find(d => d > currentDay);
    if (!nextDay && nextDay !== 0) {
        nextDay = dayNumbers[0];
    }
    
    const daysToAdd = nextDay > currentDay ? nextDay - currentDay : 7 - currentDay + nextDay;
    
    const next = new Date(now);
    next.setDate(next.getDate() + daysToAdd);
    next.setHours(hour, minute, 0, 0);
    
    return next;
}

function getNextMonthly(now, dayOfMonth, timeOfDay) {
    if (!dayOfMonth) return null;
    
    const [hour, minute] = timeOfDay ? timeOfDay.split(':').map(Number) : [0, 0];
    const next = new Date(now);
    next.setDate(dayOfMonth);
    next.setHours(hour, minute, 0, 0);
    
    if (next <= now) {
        next.setMonth(next.getMonth() + 1);
    }
    
    return next;
}