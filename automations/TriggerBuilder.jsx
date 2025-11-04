
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Package,
    ShoppingCart,
    TrendingUp,
    Clock,
    MessageSquare,
    DollarSign,
    RefreshCw,
    Zap,
    Calendar,
    AlertTriangle,
    Plus,
    Trash2,
    Info
} from 'lucide-react';

const TRIGGER_TYPES = [
    { value: 'inventory_low', label: 'Inventory Low', icon: Package, category: 'Inventory', description: 'When stock drops below threshold' },
    { value: 'inventory_out_of_stock', label: 'Out of Stock', icon: AlertTriangle, category: 'Inventory', description: 'When items are completely sold out' },
    { value: 'order_placed', label: 'Order Placed', icon: ShoppingCart, category: 'Orders', description: 'When a new order is received' },
    { value: 'order_shipped', label: 'Order Shipped', icon: ShoppingCart, category: 'Orders', description: 'When an order is shipped' },
    { value: 'new_product', label: 'New Product', icon: Package, category: 'Products', description: 'When a new product is added' },
    { value: 'price_change', label: 'Price Changed', icon: DollarSign, category: 'Products', description: 'When product prices change' },
    { value: 'customer_message', label: 'Customer Message', icon: MessageSquare, category: 'Customers', description: 'When customer sends a message' },
    { value: 'platform_sync_complete', label: 'Platform Synced', icon: RefreshCw, category: 'Platforms', description: 'When platform sync completes' },
    { value: 'sale_threshold', label: 'Sales Threshold', icon: TrendingUp, category: 'Revenue', description: 'When daily sales hit a target' },
    { value: 'revenue_milestone', label: 'Revenue Milestone', icon: DollarSign, category: 'Revenue', description: 'When total revenue reaches goal' },
    { value: 'no_sales_period', label: 'No Sales Period', icon: AlertTriangle, category: 'Revenue', description: 'When no sales for X days' },
    { value: 'schedule', label: 'Scheduled', icon: Clock, category: 'Time', description: 'Run on a schedule' },
    { value: 'custom_event', label: 'Custom Event', icon: Zap, category: 'Advanced', description: 'Custom conditions' },
];

const TriggerConfigForm = ({ triggerType, config, conditions, onChange, onConditionsChange }) => {
    const updateConfig = (key, value) => {
        // This onChange handler expects to receive a partial config object, 
        // which the parent component will merge into its state.
        onChange({ ...config, [key]: value });
    };

    const updateScheduleConfig = (key, value) => {
        // This onChange handler expects to receive a partial config object, 
        // which the parent component will merge into its state.
        onChange({
            ...config,
            schedule_config: {
                ...(config.schedule_config || {}),
                [key]: value
            }
        });
    };

    const addCondition = () => {
        onConditionsChange([
            ...(conditions || []),
            { field: '', operator: 'equals', value: '' }
        ]);
    };

    const updateCondition = (index, updates) => {
        const newConditions = [...(conditions || [])];
        newConditions[index] = { ...newConditions[index], ...updates };
        onConditionsChange(newConditions);
    };

    const removeCondition = (index) => {
        onConditionsChange((conditions || []).filter((_, i) => i !== index));
    };

    switch (triggerType) {
        case 'inventory_low':
            return (
                <div className="space-y-4">
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                            This trigger fires when inventory drops below the threshold you set.
                        </AlertDescription>
                    </Alert>
                    <div>
                        <Label>Stock Threshold</Label>
                        <Input
                            type="number"
                            placeholder="e.g., 10"
                            value={conditions?.[0]?.value || ''}
                            onChange={(e) => {
                                onConditionsChange([{
                                    field: 'total_stock',
                                    operator: 'less_or_equal',
                                    value: Number(e.target.value)
                                }]);
                            }}
                        />
                        <p className="text-xs text-slate-500 mt-1">Alert when stock is at or below this number</p>
                    </div>
                    <div>
                        <Label>Cooldown (minutes)</Label>
                        <Input
                            type="number"
                            placeholder="60"
                            value={config.cooldown_minutes || ''}
                            onChange={(e) => updateConfig('cooldown_minutes', Number(e.target.value))}
                        />
                        <p className="text-xs text-slate-500 mt-1">Minimum time between alerts</p>
                    </div>
                </div>
            );

        case 'order_placed':
            return (
                <div className="space-y-4">
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                            This trigger fires whenever a new order is placed on your connected platforms.
                        </AlertDescription>
                    </Alert>
                    <div>
                        <Label>Minimum Order Value (optional)</Label>
                        <Input
                            type="number"
                            placeholder="e.g., 50"
                            value={conditions?.[0]?.value || ''}
                            onChange={(e) => {
                                if (e.target.value) {
                                    onConditionsChange([{
                                        field: 'order_total',
                                        operator: 'greater_or_equal',
                                        value: Number(e.target.value)
                                    }]);
                                } else {
                                    onConditionsChange([]);
                                }
                            }}
                        />
                        <p className="text-xs text-slate-500 mt-1">Only trigger for orders above this amount</p>
                    </div>
                </div>
            );

        case 'sale_threshold':
            return (
                <div className="space-y-4">
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                            Trigger when daily sales reach a specific target amount.
                        </AlertDescription>
                    </Alert>
                    <div>
                        <Label>Daily Sales Target ($)</Label>
                        <Input
                            type="number"
                            placeholder="e.g., 1000"
                            value={conditions?.[0]?.value || ''}
                            onChange={(e) => {
                                onConditionsChange([{
                                    field: 'daily_sales',
                                    operator: 'greater_or_equal',
                                    value: Number(e.target.value)
                                }]);
                            }}
                        />
                    </div>
                </div>
            );

        case 'revenue_milestone':
            return (
                <div className="space-y-4">
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                            Trigger when your total all-time revenue hits a milestone.
                        </AlertDescription>
                    </Alert>
                    <div>
                        <Label>Revenue Milestone ($)</Label>
                        <Input
                            type="number"
                            placeholder="e.g., 10000"
                            value={conditions?.[0]?.value || ''}
                            onChange={(e) => {
                                onConditionsChange([{
                                    field: 'total_revenue',
                                    operator: 'greater_or_equal',
                                    value: Number(e.target.value)
                                }]);
                            }}
                        />
                    </div>
                </div>
            );

        case 'no_sales_period':
            return (
                <div className="space-y-4">
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                            Trigger when no sales have been made for a specified number of days.
                        </AlertDescription>
                    </Alert>
                    <div>
                        <Label>Days Without Sales</Label>
                        <Input
                            type="number"
                            placeholder="e.g., 7"
                            value={conditions?.[0]?.value || ''}
                            onChange={(e) => {
                                onConditionsChange([{
                                    field: 'days_without_sales',
                                    operator: 'greater_or_equal',
                                    value: Number(e.target.value)
                                }]);
                            }}
                        />
                    </div>
                </div>
            );

        case 'custom_event':
            return (
                <div className="space-y-4">
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                            Define custom conditions for when this trigger should fire.
                        </AlertDescription>
                    </Alert>
                    
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <Label>Conditions</Label>
                            <Button size="sm" variant="outline" onClick={addCondition}>
                                <Plus className="w-4 h-4 mr-1" />
                                Add Condition
                            </Button>
                        </div>
                        
                        {(conditions || []).length === 0 ? (
                            <div className="text-sm text-slate-500 text-center py-4 border border-dashed rounded-lg">
                                No conditions yet. Add one to get started.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {(conditions || []).map((condition, index) => (
                                    <div key={index} className="flex gap-2 items-end p-3 bg-slate-50 rounded-lg">
                                        <div className="flex-1">
                                            <Label className="text-xs">Field</Label>
                                            <Input
                                                placeholder="e.g., product.price"
                                                value={condition.field}
                                                onChange={(e) => updateCondition(index, { field: e.target.value })}
                                                size="sm"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <Label className="text-xs">Operator</Label>
                                            <Select
                                                value={condition.operator}
                                                onValueChange={(v) => updateCondition(index, { operator: v })}
                                            >
                                                <SelectTrigger className="h-9">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="equals">Equals</SelectItem>
                                                    <SelectItem value="not_equals">Not Equals</SelectItem>
                                                    <SelectItem value="greater_than">Greater Than</SelectItem>
                                                    <SelectItem value="less_than">Less Than</SelectItem>
                                                    <SelectItem value="contains">Contains</SelectItem>
                                                    <SelectItem value="not_contains">Not Contains</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="flex-1">
                                            <Label className="text-xs">Value</Label>
                                            <Input
                                                placeholder="Value"
                                                value={condition.value}
                                                onChange={(e) => updateCondition(index, { value: e.target.value })}
                                                size="sm"
                                            />
                                        </div>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => removeCondition(index)}
                                            className="h-9 w-9"
                                        >
                                            <Trash2 className="w-4 h-4 text-red-500" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            );

        default:
            return (
                <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                        This trigger type requires no additional configuration. It will fire automatically based on system events.
                    </AlertDescription>
                </Alert>
            );
    }
};

export default function TriggerBuilder({ trigger, onUpdate }) {
    // The trigger prop is now the source of truth, no internal state needed for the full trigger object.

    const handleTriggerTypeChange = (newType) => {
        onUpdate({
            ...trigger,
            trigger_type: newType,
            conditions: [], // Reset conditions when trigger type changes
            schedule_config: undefined // Reset schedule config when trigger type changes
        });
    };

    const handleConfigChange = (newPartialConfig) => {
        // This function merges a partial config update from TriggerConfigForm into the main trigger object.
        onUpdate({ ...trigger, ...newPartialConfig });
    };

    const handleConditionsChange = (newConditions) => {
        onUpdate({ ...trigger, conditions: newConditions });
    };

    const handleScheduleChange = (key, value) => {
        onUpdate({
            ...trigger,
            schedule_config: {
                ...(trigger.schedule_config || {}),
                [key]: value
            }
        });
    };

    const triggerType = TRIGGER_TYPES.find(t => t.value === trigger.trigger_type);
    const Icon = triggerType?.icon || Zap;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Trigger Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label>Trigger Type</Label>
                        <Select value={trigger.trigger_type || ''} onValueChange={handleTriggerTypeChange}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select when to trigger..." />
                            </SelectTrigger>
                            <SelectContent>
                                {TRIGGER_TYPES.map(type => (
                                    <SelectItem key={type.value} value={type.value}>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-xs">{type.category}</Badge>
                                            {type.label}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {triggerType && (
                            <p className="text-xs text-slate-500 mt-1">{triggerType.description}</p>
                        )}
                    </div>

                    {trigger.trigger_type && trigger.trigger_type !== 'schedule' && ( // Only render TriggerConfigForm if not 'schedule'
                        <div className="pt-4 border-t">
                            <TriggerConfigForm
                                triggerType={trigger.trigger_type}
                                config={trigger} // Pass the entire trigger object as config
                                conditions={trigger.conditions}
                                onChange={handleConfigChange} // Passes updates to general trigger config
                                onConditionsChange={handleConditionsChange}
                            />
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Schedule Configuration Card - for 'schedule' trigger type */}
            {trigger.trigger_type === 'schedule' && (
                <Card className="border-indigo-200 bg-indigo-50">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Clock className="w-5 h-5 text-indigo-600" />
                            Schedule Configuration
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label>Frequency</Label>
                            <Select
                                value={trigger.schedule_config?.frequency || ''}
                                onValueChange={(value) => handleScheduleChange('frequency', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select frequency..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="hourly">Every Hour</SelectItem>
                                    <SelectItem value="daily">Daily</SelectItem>
                                    <SelectItem value="weekly">Weekly</SelectItem>
                                    <SelectItem value="monthly">Monthly</SelectItem>
                                    <SelectItem value="custom_cron">Custom (Cron)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Time of Day */}
                        {['daily', 'weekly', 'monthly'].includes(trigger.schedule_config?.frequency) && (
                            <div>
                                <Label>Time of Day</Label>
                                <Input
                                    type="time"
                                    value={trigger.schedule_config?.time_of_day || ''}
                                    onChange={(e) => handleScheduleChange('time_of_day', e.target.value)}
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                    When should this automation run?
                                </p>
                            </div>
                        )}

                        {/* Day of Week (for weekly) */}
                        {trigger.schedule_config?.frequency === 'weekly' && (
                            <div>
                                <Label>Days of Week</Label>
                                <div className="grid grid-cols-7 gap-2 mt-2">
                                    {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
                                        <Button
                                            key={day}
                                            type="button"
                                            size="sm"
                                            variant={(trigger.schedule_config?.day_of_week || []).includes(day) ? 'default' : 'outline'}
                                            className="text-xs"
                                            onClick={() => {
                                                const current = trigger.schedule_config?.day_of_week || [];
                                                const updated = current.includes(day)
                                                    ? current.filter(d => d !== day)
                                                    : [...current, day];
                                                handleScheduleChange('day_of_week', updated);
                                            }}
                                        >
                                            {day.slice(0, 3)}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Day of Month (for monthly) */}
                        {trigger.schedule_config?.frequency === 'monthly' && (
                            <div>
                                <Label>Day of Month</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    max="31"
                                    value={trigger.schedule_config?.day_of_month || ''}
                                    onChange={(e) => handleScheduleChange('day_of_month', parseInt(e.target.value))}
                                    placeholder="e.g., 15 for 15th of each month"
                                />
                            </div>
                        )}

                        {/* Custom Cron */}
                        {trigger.schedule_config?.frequency === 'custom_cron' && (
                            <div>
                                <Label>Cron Expression</Label>
                                <Input
                                    value={trigger.schedule_config?.cron_expression || ''}
                                    onChange={(e) => handleScheduleChange('cron_expression', e.target.value)}
                                    placeholder="0 0 * * *"
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                    Use standard cron syntax (minute hour day month weekday)
                                </p>
                            </div>
                        )}

                        {/* Timezone */}
                        <div>
                            <Label>Timezone</Label>
                            <Select
                                value={trigger.schedule_config?.timezone || 'UTC'}
                                onValueChange={(value) => handleScheduleChange('timezone', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="UTC">UTC (Coordinated Universal Time)</SelectItem>
                                    <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                                    <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                                    <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                                    <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                                    <SelectItem value="Europe/London">London (GMT)</SelectItem>
                                    <SelectItem value="Europe/Paris">Paris (CET)</SelectItem>
                                    <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                                    <SelectItem value="Asia/Shanghai">Shanghai (CST)</SelectItem>
                                    <SelectItem value="Australia/Sydney">Sydney (AEDT)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Schedule Summary */}
                        {trigger.schedule_config?.frequency && (
                            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <p className="text-sm font-semibold text-blue-900 mb-1">
                                    Schedule Summary:
                                </p>
                                <p className="text-sm text-blue-800">
                                    {getScheduleSummary(trigger.schedule_config)}
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

function getScheduleSummary(schedule) {
    const tz = schedule.timezone || 'UTC';
    
    switch (schedule.frequency) {
        case 'hourly':
            return `Runs every hour (Timezone: ${tz})`;
        
        case 'daily':
            return `Runs daily at ${schedule.time_of_day || '00:00'} (Timezone: ${tz})`;
        
        case 'weekly':
            const days = schedule.day_of_week?.length > 0
                ? schedule.day_of_week.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ')
                : 'Not set';
            return `Runs weekly on ${days} at ${schedule.time_of_day || '00:00'} (Timezone: ${tz})`;
        
        case 'monthly':
            return `Runs on day ${schedule.day_of_month || '?'} of each month at ${schedule.time_of_day || '00:00'} (Timezone: ${tz})`;
        
        case 'custom_cron':
            return `Custom schedule: ${schedule.cron_expression || 'Not set'} (Timezone: ${tz})`;
        
        default:
            return 'Configure schedule above';
    }
}
