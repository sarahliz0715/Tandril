import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Info, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/apiClient';

const triggerTypes = [
    { value: 'inventory_low', label: 'Inventory Low', icon: '📦' },
    { value: 'inventory_out_of_stock', label: 'Out of Stock', icon: '❌' },
    { value: 'sales_drop', label: 'Sales Drop', icon: '📉' },
    { value: 'revenue_milestone', label: 'Revenue Milestone', icon: '💰' },
    { value: 'new_review', label: 'New Review', icon: '⭐' },
    { value: 'low_rating_review', label: 'Low Rating Review', icon: '⚠️' },
    { value: 'competitor_price_drop', label: 'Competitor Price Drop', icon: '💸' },
    { value: 'platform_disconnect', label: 'Platform Disconnect', icon: '🔌' },
    { value: 'order_threshold', label: 'Order Threshold', icon: '🛒' },
    { value: 'conversion_rate_drop', label: 'Conversion Rate Drop', icon: '📊' },
    { value: 'traffic_drop', label: 'Traffic Drop', icon: '📈' },
    { value: 'ad_spend_high', label: 'Ad Spend High', icon: '💵' },
    { value: 'roas_low', label: 'ROAS Low', icon: '📉' },
    { value: 'custom_metric', label: 'Custom Metric', icon: '⚡' }
];

const operatorOptions = [
    { value: 'equals', label: 'Equals (=)' },
    { value: 'not_equals', label: 'Not Equals (≠)' },
    { value: 'greater_than', label: 'Greater Than (>)' },
    { value: 'less_than', label: 'Less Than (<)' },
    { value: 'greater_or_equal', label: 'Greater or Equal (≥)' },
    { value: 'less_or_equal', label: 'Less or Equal (≤)' },
    { value: 'contains', label: 'Contains' },
    { value: 'not_contains', label: 'Does Not Contain' }
];

export default function CreateCustomAlertModal({ alert, onClose, onSuccess }) {
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        is_active: true,
        trigger_type: 'inventory_low',
        conditions: [{ field: '', operator: 'less_than', value: '' }],
        notification_channels: ['in_app'],
        notification_template: {
            in_app_title: '',
            in_app_message: '',
            email_subject: '',
            email_body: '',
            priority: 'medium'
        },
        target_scope: {
            platforms: [],
            product_categories: [],
            specific_products: []
        },
        check_frequency: 'hourly',
        cooldown_minutes: 60
    });

    useEffect(() => {
        if (alert) {
            setFormData({
                ...alert,
                conditions: alert.conditions || [{ field: '', operator: 'less_than', value: '' }],
                notification_channels: alert.notification_channels || ['in_app'],
                notification_template: alert.notification_template || {
                    in_app_title: '',
                    in_app_message: '',
                    email_subject: '',
                    email_body: '',
                    priority: 'medium'
                },
                target_scope: alert.target_scope || {
                    platforms: [],
                    product_categories: [],
                    specific_products: []
                }
            });
        }
    }, [alert]);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleNestedChange = (parent, field, value) => {
        setFormData(prev => ({
            ...prev,
            [parent]: {
                ...prev[parent],
                [field]: value
            }
        }));
    };

    const handleConditionChange = (index, field, value) => {
        const newConditions = [...formData.conditions];
        newConditions[index][field] = value;
        setFormData(prev => ({ ...prev, conditions: newConditions }));
    };

    const addCondition = () => {
        setFormData(prev => ({
            ...prev,
            conditions: [...prev.conditions, { field: '', operator: 'less_than', value: '' }]
        }));
    };

    const removeCondition = (index) => {
        if (formData.conditions.length > 1) {
            const newConditions = formData.conditions.filter((_, i) => i !== index);
            setFormData(prev => ({ ...prev, conditions: newConditions }));
        }
    };

    const toggleNotificationChannel = (channel) => {
        const channels = formData.notification_channels || [];
        if (channels.includes(channel)) {
            setFormData(prev => ({
                ...prev,
                notification_channels: channels.filter(c => c !== channel)
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                notification_channels: [...channels, channel]
            }));
        }
    };

    const handleSubmit = async () => {
        if (!formData.name.trim()) {
            toast.error('Please enter an alert name');
            return;
        }

        if (!formData.trigger_type) {
            toast.error('Please select a trigger type');
            return;
        }

        if (formData.notification_channels.length === 0) {
            toast.error('Please select at least one notification channel');
            return;
        }

        const validConditions = formData.conditions.filter(c => c.field && c.operator && c.value);
        if (validConditions.length === 0) {
            toast.error('Please add at least one valid condition');
            return;
        }

        setIsSaving(true);
        try {
            const alertData = {
                ...formData,
                conditions: validConditions
            };

            if (alert?.id) {
                await api.entities.CustomAlert.update(alert.id, alertData);
                toast.success('Alert updated successfully!');
            } else {
                await api.entities.CustomAlert.create(alertData);
                toast.success('Alert created successfully!');
            }

            onSuccess();
        } catch (error) {
            console.error('Error saving alert:', error);
            toast.error('Failed to save alert');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {alert ? 'Edit Custom Alert' : 'Create Custom Alert'}
                    </DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="basic" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="basic">Basic</TabsTrigger>
                        <TabsTrigger value="conditions">Conditions</TabsTrigger>
                        <TabsTrigger value="notifications">Notifications</TabsTrigger>
                        <TabsTrigger value="advanced">Advanced</TabsTrigger>
                    </TabsList>

                    <TabsContent value="basic" className="space-y-4">
                        <div>
                            <Label htmlFor="name">Alert Name *</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => handleChange('name', e.target.value)}
                                placeholder="e.g., Low Stock Alert for T-Shirts"
                            />
                        </div>

                        <div>
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => handleChange('description', e.target.value)}
                                placeholder="What does this alert monitor?"
                                className="h-20"
                            />
                        </div>

                        <div>
                            <Label htmlFor="trigger_type">Trigger Type *</Label>
                            <Select
                                value={formData.trigger_type}
                                onValueChange={(value) => handleChange('trigger_type', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {triggerTypes.map((type) => (
                                        <SelectItem key={type.value} value={type.value}>
                                            {type.icon} {type.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="check_frequency">Check Frequency</Label>
                                <Select
                                    value={formData.check_frequency}
                                    onValueChange={(value) => handleChange('check_frequency', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="real_time">Real-time</SelectItem>
                                        <SelectItem value="every_5_minutes">Every 5 minutes</SelectItem>
                                        <SelectItem value="every_15_minutes">Every 15 minutes</SelectItem>
                                        <SelectItem value="hourly">Hourly</SelectItem>
                                        <SelectItem value="daily">Daily</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label htmlFor="cooldown">Cooldown (minutes)</Label>
                                <Input
                                    id="cooldown"
                                    type="number"
                                    value={formData.cooldown_minutes}
                                    onChange={(e) => handleChange('cooldown_minutes', parseInt(e.target.value))}
                                    placeholder="60"
                                />
                            </div>
                        </div>

                        <Alert className="bg-blue-50 border-blue-200">
                            <Info className="h-4 w-4 text-blue-600" />
                            <AlertDescription className="text-blue-800 text-sm">
                                Cooldown prevents the same alert from firing too frequently. Set to 0 for no cooldown.
                            </AlertDescription>
                        </Alert>
                    </TabsContent>

                    <TabsContent value="conditions" className="space-y-4">
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <Label>Alert Conditions *</Label>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={addCondition}
                                >
                                    <Plus className="w-4 h-4 mr-1" />
                                    Add Condition
                                </Button>
                            </div>

                            <div className="space-y-3">
                                {formData.conditions.map((condition, index) => (
                                    <div key={index} className="flex gap-2 items-start p-3 bg-slate-50 rounded-lg">
                                        <div className="flex-1 grid grid-cols-3 gap-2">
                                            <Input
                                                placeholder="Field (e.g., total_stock)"
                                                value={condition.field}
                                                onChange={(e) => handleConditionChange(index, 'field', e.target.value)}
                                            />
                                            <Select
                                                value={condition.operator}
                                                onValueChange={(value) => handleConditionChange(index, 'operator', value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {operatorOptions.map((op) => (
                                                        <SelectItem key={op.value} value={op.value}>
                                                            {op.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Input
                                                placeholder="Value"
                                                value={condition.value}
                                                onChange={(e) => handleConditionChange(index, 'value', e.target.value)}
                                            />
                                        </div>
                                        {formData.conditions.length > 1 && (
                                            <Button
                                                type="button"
                                                size="icon"
                                                variant="ghost"
                                                onClick={() => removeCondition(index)}
                                                className="flex-shrink-0"
                                            >
                                                <Trash2 className="w-4 h-4 text-red-500" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <Alert className="bg-amber-50 border-amber-200">
                            <Info className="h-4 w-4 text-amber-600" />
                            <AlertDescription className="text-amber-800 text-sm">
                                <strong>Examples:</strong><br />
                                • total_stock less_than 10<br />
                                • daily_revenue less_than 500<br />
                                • rating less_or_equal 2<br />
                                All conditions must be true for the alert to fire.
                            </AlertDescription>
                        </Alert>
                    </TabsContent>

                    <TabsContent value="notifications" className="space-y-4">
                        <div>
                            <Label>Notification Channels *</Label>
                            <div className="space-y-2 mt-2">
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="in_app"
                                        checked={formData.notification_channels?.includes('in_app')}
                                        onCheckedChange={() => toggleNotificationChannel('in_app')}
                                    />
                                    <label htmlFor="in_app" className="text-sm cursor-pointer">
                                        In-App Notification (appears in Inbox)
                                    </label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="email"
                                        checked={formData.notification_channels?.includes('email')}
                                        onCheckedChange={() => toggleNotificationChannel('email')}
                                    />
                                    <label htmlFor="email" className="text-sm cursor-pointer">
                                        Email Notification
                                    </label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="sms"
                                        checked={formData.notification_channels?.includes('sms')}
                                        onCheckedChange={() => toggleNotificationChannel('sms')}
                                    />
                                    <label htmlFor="sms" className="text-sm cursor-pointer">
                                        SMS Notification (coming soon)
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="priority">Priority Level</Label>
                            <Select
                                value={formData.notification_template?.priority || 'medium'}
                                onValueChange={(value) => handleNestedChange('notification_template', 'priority', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="low">Low</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                    <SelectItem value="urgent">Urgent</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {formData.notification_channels?.includes('in_app') && (
                            <>
                                <div>
                                    <Label htmlFor="in_app_title">In-App Title</Label>
                                    <Input
                                        id="in_app_title"
                                        value={formData.notification_template?.in_app_title || ''}
                                        onChange={(e) => handleNestedChange('notification_template', 'in_app_title', e.target.value)}
                                        placeholder="e.g., Low Stock Alert"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="in_app_message">In-App Message</Label>
                                    <Textarea
                                        id="in_app_message"
                                        value={formData.notification_template?.in_app_message || ''}
                                        onChange={(e) => handleNestedChange('notification_template', 'in_app_message', e.target.value)}
                                        placeholder="e.g., Product has low stock."
                                        className="h-20"
                                    />
                                </div>
                            </>
                        )}

                        {formData.notification_channels?.includes('email') && (
                            <>
                                <div>
                                    <Label htmlFor="email_subject">Email Subject</Label>
                                    <Input
                                        id="email_subject"
                                        value={formData.notification_template?.email_subject || ''}
                                        onChange={(e) => handleNestedChange('notification_template', 'email_subject', e.target.value)}
                                        placeholder="e.g., URGENT: Low Stock Alert"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="email_body">Email Body</Label>
                                    <Textarea
                                        id="email_body"
                                        value={formData.notification_template?.email_body || ''}
                                        onChange={(e) => handleNestedChange('notification_template', 'email_body', e.target.value)}
                                        placeholder="e.g., Your product is running low with only few units remaining."
                                        className="h-32"
                                    />
                                </div>
                            </>
                        )}

                        <Alert className="bg-green-50 border-green-200">
                            <Info className="h-4 w-4 text-green-600" />
                            <AlertDescription className="text-green-800 text-sm">
                                <strong>Tip:</strong> You can customize the message content to include specific details about the alert.
                            </AlertDescription>
                        </Alert>
                    </TabsContent>

                    <TabsContent value="advanced" className="space-y-4">
                        <Alert className="bg-blue-50 border-blue-200">
                            <Info className="h-4 w-4 text-blue-600" />
                            <AlertDescription className="text-blue-800 text-sm">
                                Advanced settings allow you to narrow the scope of what this alert monitors.
                                Leave empty to monitor all items.
                            </AlertDescription>
                        </Alert>

                        <div>
                            <Label htmlFor="platforms">Specific Platforms (optional)</Label>
                            <Input
                                id="platforms"
                                value={formData.target_scope?.platforms?.join(', ') || ''}
                                onChange={(e) => handleNestedChange('target_scope', 'platforms', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                                placeholder="e.g., shopify, etsy (comma-separated)"
                            />
                        </div>

                        <div>
                            <Label htmlFor="categories">Product Categories (optional)</Label>
                            <Input
                                id="categories"
                                value={formData.target_scope?.product_categories?.join(', ') || ''}
                                onChange={(e) => handleNestedChange('target_scope', 'product_categories', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                                placeholder="e.g., T-Shirts, Hoodies (comma-separated)"
                            />
                        </div>

                        <div>
                            <Label htmlFor="products">Specific Product IDs (optional)</Label>
                            <Textarea
                                id="products"
                                value={formData.target_scope?.specific_products?.join(', ') || ''}
                                onChange={(e) => handleNestedChange('target_scope', 'specific_products', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                                placeholder="e.g., prod_123, prod_456 (comma-separated)"
                                className="h-20"
                            />
                        </div>
                    </TabsContent>
                </Tabs>

                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={onClose} disabled={isSaving}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSaving}>
                        {isSaving ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4 mr-2" />
                                {alert ? 'Update Alert' : 'Create Alert'}
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}