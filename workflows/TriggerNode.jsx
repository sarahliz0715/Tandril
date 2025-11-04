import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Zap, MousePointerClick } from 'lucide-react';

const triggerTypes = {
    schedule: { label: "Schedule", icon: Clock, description: "Run at a specific time or interval." },
    event: { label: "Event", icon: Zap, description: "Run when something happens in your store." },
    manual: { label: "Manual", icon: MousePointerClick, description: "Run only when you click a button." },
};

const scheduleOptions = [
    { value: '0 * * * *', label: 'Every Hour' },
    { value: '0 9 * * *', label: 'Every Day at 9 AM' },
    { value: '0 9 * * 1', label: 'Every Monday at 9 AM' },
];

const eventOptions = [
    { value: 'new_order', label: 'New Order Received' },
    { value: 'new_customer', label: 'New Customer Signed Up' },
    { value: 'product_updated', label: 'Product Updated' },
];

export default function TriggerNode({ config, type, onUpdate }) {
    const { icon: Icon, label } = triggerTypes[type] || {};

    return (
        <Card className="bg-slate-50 border-slate-200 shadow-none">
            <CardHeader className="p-4">
                <CardTitle className="text-base flex items-center gap-2">
                    <Icon className="w-5 h-5 text-indigo-600" />
                    Trigger: {label}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
                {type === 'schedule' && (
                    <Select onValueChange={(v) => onUpdate({ cron: v, label: scheduleOptions.find(o => o.value === v).label })} value={config.cron}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a schedule..." />
                        </SelectTrigger>
                        <SelectContent>
                            {scheduleOptions.map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
                {type === 'event' && (
                    <Select onValueChange={(v) => onUpdate({ event_name: v, label: eventOptions.find(o => o.value === v).label })} value={config.event_name}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select an event..." />
                        </SelectTrigger>
                        <SelectContent>
                            {eventOptions.map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
                {type === 'manual' && (
                    <p className="text-sm text-slate-500">This workflow can only be run manually from the main page.</p>
                )}
            </CardContent>
        </Card>
    );
}