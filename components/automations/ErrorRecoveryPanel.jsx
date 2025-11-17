import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    AlertTriangle,
    RefreshCw,
    Clock,
    TrendingDown,
    Save,
    Info,
    Zap,
    Bell
} from 'lucide-react';
import { toast } from 'sonner';

export default function ErrorRecoveryPanel({ automation, onUpdate }) {
    const [config, setConfig] = useState(automation.error_recovery || {
        enabled: true,
        max_retries: 3,
        retry_delay_seconds: 60,
        retry_strategy: 'exponential_backoff',
        fallback_action_id: null,
        alert_on_failure: true
    });

    const [hasChanges, setHasChanges] = useState(false);

    const handleChange = (field, value) => {
        setConfig({ ...config, [field]: value });
        setHasChanges(true);
    };

    const handleSave = async () => {
        try {
            await onUpdate({ error_recovery: config });
            setHasChanges(false);
            toast.success('Error recovery settings saved');
        } catch (error) {
            console.error('Error saving config:', error);
            toast.error('Failed to save settings');
        }
    };

    const getDelayPreview = () => {
        const { retry_strategy, retry_delay_seconds, max_retries } = config;
        const delays = [];
        
        for (let i = 1; i <= max_retries; i++) {
            let delay;
            if (retry_strategy === 'immediate') {
                delay = 0;
            } else if (retry_strategy === 'linear_backoff') {
                delay = retry_delay_seconds * i;
            } else { // exponential_backoff
                delay = retry_delay_seconds * Math.pow(2, i - 1);
            }
            delays.push(delay);
        }
        
        return delays;
    };

    const formatSeconds = (seconds) => {
        if (seconds < 60) return `${seconds}s`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
        return `${Math.floor(seconds / 3600)}h`;
    };

    const delays = getDelayPreview();

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                    Error Recovery & Retry Logic
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Enable/Disable */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-3">
                        <RefreshCw className="w-5 h-5 text-indigo-600" />
                        <div>
                            <Label className="text-base font-semibold">Enable Error Recovery</Label>
                            <p className="text-xs text-slate-600">
                                Automatically retry failed actions
                            </p>
                        </div>
                    </div>
                    <Switch
                        checked={config.enabled}
                        onCheckedChange={(checked) => handleChange('enabled', checked)}
                    />
                </div>

                {config.enabled && (
                    <>
                        {/* Max Retries */}
                        <div className="space-y-2">
                            <Label>Maximum Retry Attempts</Label>
                            <div className="flex items-center gap-3">
                                <Input
                                    type="number"
                                    min={1}
                                    max={10}
                                    value={config.max_retries}
                                    onChange={(e) => handleChange('max_retries', parseInt(e.target.value))}
                                    className="w-32"
                                />
                                <span className="text-sm text-slate-600">
                                    times
                                </span>
                            </div>
                            <p className="text-xs text-slate-500">
                                How many times to retry before giving up
                            </p>
                        </div>

                        {/* Retry Strategy */}
                        <div className="space-y-2">
                            <Label>Retry Strategy</Label>
                            <Select
                                value={config.retry_strategy}
                                onValueChange={(value) => handleChange('retry_strategy', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="immediate">
                                        Immediate (No Delay)
                                    </SelectItem>
                                    <SelectItem value="linear_backoff">
                                        Linear Backoff
                                    </SelectItem>
                                    <SelectItem value="exponential_backoff">
                                        Exponential Backoff (Recommended)
                                    </SelectItem>
                                </SelectContent>
                            </Select>

                            {/* Strategy Descriptions */}
                            <Alert className="bg-blue-50 border-blue-200">
                                <Info className="h-4 w-4 text-blue-600" />
                                <AlertDescription className="text-blue-800 text-xs">
                                    {config.retry_strategy === 'immediate' && (
                                        'Retries happen immediately without any delay'
                                    )}
                                    {config.retry_strategy === 'linear_backoff' && (
                                        'Delay increases linearly: 1x, 2x, 3x the base delay'
                                    )}
                                    {config.retry_strategy === 'exponential_backoff' && (
                                        'Delay doubles with each retry: 1x, 2x, 4x, 8x (best for API rate limits)'
                                    )}
                                </AlertDescription>
                            </Alert>
                        </div>

                        {/* Base Retry Delay */}
                        {config.retry_strategy !== 'immediate' && (
                            <div className="space-y-2">
                                <Label>Base Retry Delay</Label>
                                <div className="flex items-center gap-3">
                                    <Input
                                        type="number"
                                        min={1}
                                        max={3600}
                                        value={config.retry_delay_seconds}
                                        onChange={(e) => handleChange('retry_delay_seconds', parseInt(e.target.value))}
                                        className="w-32"
                                    />
                                    <span className="text-sm text-slate-600">
                                        seconds
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500">
                                    Initial wait time before first retry
                                </p>
                            </div>
                        )}

                        {/* Retry Timeline Preview */}
                        <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                            <h4 className="font-semibold text-indigo-900 text-sm mb-3 flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                Retry Timeline Preview
                            </h4>
                            <div className="space-y-2">
                                {delays.map((delay, index) => (
                                    <div key={index} className="flex items-center gap-3 text-xs">
                                        <Badge className="bg-indigo-600 text-white w-20">
                                            Attempt {index + 1}
                                        </Badge>
                                        <div className="flex items-center gap-2 flex-1">
                                            <div className="h-1 bg-indigo-300 rounded-full" style={{ width: `${Math.min((delay / delays[delays.length - 1]) * 100, 100)}%` }} />
                                            <span className="text-indigo-700 font-semibold">
                                                {delay === 0 ? 'Immediate' : `Wait ${formatSeconds(delay)}`}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-indigo-700 mt-3">
                                Total time if all retries fail: {formatSeconds(delays.reduce((sum, d) => sum + d, 0))}
                            </p>
                        </div>

                        {/* Alert on Failure */}
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                            <div className="flex items-center gap-3">
                                <Bell className="w-5 h-5 text-orange-600" />
                                <div>
                                    <Label className="text-base font-semibold">Alert on Final Failure</Label>
                                    <p className="text-xs text-slate-600">
                                        Send notification if all retries fail
                                    </p>
                                </div>
                            </div>
                            <Switch
                                checked={config.alert_on_failure}
                                onCheckedChange={(checked) => handleChange('alert_on_failure', checked)}
                            />
                        </div>

                        {/* Fallback Action */}
                        <div className="space-y-2">
                            <Label>Fallback Action (Optional)</Label>
                            <Select
                                value={config.fallback_action_id || ''}
                                onValueChange={(value) => handleChange('fallback_action_id', value || null)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="No fallback action" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={null}>No fallback action</SelectItem>
                                    {/* This would list available actions */}
                                    <SelectItem value="action_1">Send Error Email</SelectItem>
                                    <SelectItem value="action_2">Log to Database</SelectItem>
                                    <SelectItem value="action_3">Notify Admin</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-slate-500">
                                Action to execute if all retries fail
                            </p>
                        </div>
                    </>
                )}

                {/* Save Button */}
                {hasChanges && (
                    <Button
                        onClick={handleSave}
                        className="w-full bg-indigo-600 hover:bg-indigo-700"
                    >
                        <Save className="w-4 h-4 mr-2" />
                        Save Error Recovery Settings
                    </Button>
                )}

                {/* Stats (if available) */}
                {automation.statistics && (
                    <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="text-center">
                            <p className="text-2xl font-bold text-green-600">
                                {automation.statistics.successful_runs || 0}
                            </p>
                            <p className="text-xs text-slate-600">Successful</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-orange-600">
                                {automation.statistics.retried_runs || 0}
                            </p>
                            <p className="text-xs text-slate-600">Recovered</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-red-600">
                                {automation.statistics.failed_runs || 0}
                            </p>
                            <p className="text-xs text-slate-600">Failed</p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}