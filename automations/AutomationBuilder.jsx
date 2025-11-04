import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
    Zap,
    Mail,
    Bell,
    Package,
    DollarSign,
    RefreshCw,
    Globe,
    Clock,
    GitBranch,
    Sparkles,
    Plus,
    Trash2,
    ChevronDown,
    ChevronUp
} from 'lucide-react';

const ACTION_TYPES = [
    { value: 'run_ai_command', label: 'Run AI Command', icon: Sparkles, category: 'AI' },
    { value: 'send_email', label: 'Send Email', icon: Mail, category: 'Communication' },
    { value: 'send_alert', label: 'Send Alert', icon: Bell, category: 'Communication' },
    { value: 'update_inventory', label: 'Update Inventory', icon: Package, category: 'Inventory' },
    { value: 'update_price', label: 'Update Price', icon: DollarSign, category: 'Products' },
    { value: 'bulk_update_products', label: 'Bulk Update Products', icon: Package, category: 'Products' },
    { value: 'sync_platform', label: 'Sync Platform', icon: RefreshCw, category: 'Platforms' },
    { value: 'webhook', label: 'Call Webhook', icon: Globe, category: 'Integration' },
    { value: 'wait', label: 'Wait/Delay', icon: Clock, category: 'Control' },
    { value: 'conditional_branch', label: 'If/Then/Else', icon: GitBranch, category: 'Control' },
];

const ActionConfigForm = ({ actionType, config, onChange }) => {
    const updateConfig = (key, value) => {
        onChange({ ...config, [key]: value });
    };

    const updateNestedConfig = (parentKey, childKey, value) => {
        onChange({
            ...config,
            [parentKey]: {
                ...(config[parentKey] || {}),
                [childKey]: value
            }
        });
    };

    switch (actionType) {
        case 'run_ai_command':
            return (
                <div className="space-y-4">
                    <div>
                        <Label>AI Command</Label>
                        <Textarea
                            placeholder="e.g., Update SEO for all products in category {{category}}"
                            value={config.command_text || ''}
                            onChange={(e) => updateConfig('command_text', e.target.value)}
                            rows={3}
                        />
                        <p className="text-xs text-slate-500 mt-1">
                            Use &#123;&#123;variable&#125;&#125; for dynamic values
                        </p>
                    </div>
                </div>
            );

        case 'send_email':
            return (
                <div className="space-y-4">
                    <div>
                        <Label>Recipient Email</Label>
                        <Input
                            placeholder="email@example.com or {{customer.email}}"
                            value={config.email_recipient || ''}
                            onChange={(e) => updateConfig('email_recipient', e.target.value)}
                        />
                    </div>
                    <div>
                        <Label>Subject</Label>
                        <Input
                            placeholder="Email subject"
                            value={config.email_subject || ''}
                            onChange={(e) => updateConfig('email_subject', e.target.value)}
                        />
                    </div>
                    <div>
                        <Label>Body</Label>
                        <Textarea
                            placeholder="Email content..."
                            value={config.email_body || ''}
                            onChange={(e) => updateConfig('email_body', e.target.value)}
                            rows={5}
                        />
                    </div>
                </div>
            );

        case 'send_alert':
            return (
                <div className="space-y-4">
                    <div>
                        <Label>Alert Title</Label>
                        <Input
                            placeholder="Alert headline"
                            value={config.alert_title || ''}
                            onChange={(e) => updateConfig('alert_title', e.target.value)}
                        />
                    </div>
                    <div>
                        <Label>Alert Message</Label>
                        <Textarea
                            placeholder="Detailed message..."
                            value={config.alert_message || ''}
                            onChange={(e) => updateConfig('alert_message', e.target.value)}
                            rows={3}
                        />
                    </div>
                    <div>
                        <Label>Priority</Label>
                        <Select value={config.alert_priority || 'medium'} onValueChange={(v) => updateConfig('alert_priority', v)}>
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
                </div>
            );

        case 'update_inventory':
            return (
                <div className="space-y-4">
                    <div>
                        <Label>Product SKU (leave empty to apply to all)</Label>
                        <Input
                            placeholder="SKU-12345 or {{product.sku}}"
                            value={config.inventory_change?.sku || ''}
                            onChange={(e) => updateNestedConfig('inventory_change', 'sku', e.target.value)}
                        />
                    </div>
                    <div>
                        <Label>Change Type</Label>
                        <Select 
                            value={config.inventory_change?.set_quantity !== undefined ? 'set' : 'delta'} 
                            onValueChange={(v) => {
                                if (v === 'set') {
                                    updateConfig('inventory_change', { 
                                        ...(config.inventory_change || {}),
                                        set_quantity: 0,
                                        quantity_delta: undefined
                                    });
                                } else {
                                    updateConfig('inventory_change', { 
                                        ...(config.inventory_change || {}),
                                        quantity_delta: 0,
                                        set_quantity: undefined
                                    });
                                }
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="delta">Add/Subtract</SelectItem>
                                <SelectItem value="set">Set to Value</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>
                            {config.inventory_change?.set_quantity !== undefined ? 'New Stock Level' : 'Change Amount'}
                        </Label>
                        <Input
                            type="number"
                            placeholder={config.inventory_change?.set_quantity !== undefined ? '100' : '+10 or -5'}
                            value={config.inventory_change?.set_quantity !== undefined 
                                ? config.inventory_change.set_quantity 
                                : config.inventory_change?.quantity_delta || ''}
                            onChange={(e) => {
                                const key = config.inventory_change?.set_quantity !== undefined ? 'set_quantity' : 'quantity_delta';
                                updateNestedConfig('inventory_change', key, Number(e.target.value));
                            }}
                        />
                    </div>
                </div>
            );

        case 'update_price':
            return (
                <div className="space-y-4">
                    <div>
                        <Label>Product ID or Category</Label>
                        <Input
                            placeholder="Product ID or leave empty for category"
                            value={config.price_change?.product_id || ''}
                            onChange={(e) => updateNestedConfig('price_change', 'product_id', e.target.value)}
                        />
                    </div>
                    <div>
                        <Label>Category (if not specific product)</Label>
                        <Input
                            placeholder="e.g., electronics"
                            value={config.price_change?.apply_to_category || ''}
                            onChange={(e) => updateNestedConfig('price_change', 'apply_to_category', e.target.value)}
                        />
                    </div>
                    <div>
                        <Label>Change Type</Label>
                        <Select 
                            value={config.price_change?.new_price ? 'absolute' : 'percentage'} 
                            onValueChange={(v) => {
                                if (v === 'absolute') {
                                    updateConfig('price_change', { 
                                        ...(config.price_change || {}),
                                        new_price: 0,
                                        price_delta_percent: undefined
                                    });
                                } else {
                                    updateConfig('price_change', { 
                                        ...(config.price_change || {}),
                                        price_delta_percent: 0,
                                        new_price: undefined
                                    });
                                }
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="absolute">Set Price</SelectItem>
                                <SelectItem value="percentage">Percentage Change</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>
                            {config.price_change?.new_price !== undefined ? 'New Price ($)' : 'Percentage Change (%)'}
                        </Label>
                        <Input
                            type="number"
                            placeholder={config.price_change?.new_price !== undefined ? '29.99' : '10 or -15'}
                            value={config.price_change?.new_price !== undefined 
                                ? config.price_change.new_price 
                                : config.price_change?.price_delta_percent || ''}
                            onChange={(e) => {
                                const key = config.price_change?.new_price !== undefined ? 'new_price' : 'price_delta_percent';
                                updateNestedConfig('price_change', key, Number(e.target.value));
                            }}
                        />
                    </div>
                </div>
            );

        case 'sync_platform':
            return (
                <div className="space-y-4">
                    <div>
                        <Label>Platform</Label>
                        <Select value={config.platform_target || ''} onValueChange={(v) => updateConfig('platform_target', v)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select platform..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="shopify">Shopify</SelectItem>
                                <SelectItem value="etsy">Etsy</SelectItem>
                                <SelectItem value="amazon">Amazon</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>Sync Type</Label>
                        <Select 
                            value={config.sync_options?.sync_type || 'all'} 
                            onValueChange={(v) => updateNestedConfig('sync_options', 'sync_type', v)}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Data</SelectItem>
                                <SelectItem value="products">Products Only</SelectItem>
                                <SelectItem value="orders">Orders Only</SelectItem>
                                <SelectItem value="inventory">Inventory Only</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            );

        case 'webhook':
            return (
                <div className="space-y-4">
                    <div>
                        <Label>Webhook URL</Label>
                        <Input
                            placeholder="https://api.example.com/webhook"
                            value={config.webhook_url || ''}
                            onChange={(e) => updateConfig('webhook_url', e.target.value)}
                        />
                    </div>
                    <div>
                        <Label>HTTP Method</Label>
                        <Select value={config.webhook_method || 'POST'} onValueChange={(v) => updateConfig('webhook_method', v)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="GET">GET</SelectItem>
                                <SelectItem value="POST">POST</SelectItem>
                                <SelectItem value="PUT">PUT</SelectItem>
                                <SelectItem value="PATCH">PATCH</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>Payload (JSON)</Label>
                        <Textarea
                            placeholder='{"key": "value", "product": "{{product.name}}"}'
                            value={config.webhook_payload ? JSON.stringify(config.webhook_payload, null, 2) : ''}
                            onChange={(e) => {
                                try {
                                    updateConfig('webhook_payload', JSON.parse(e.target.value));
                                } catch (err) {
                                    // Invalid JSON, don't update
                                }
                            }}
                            rows={5}
                        />
                    </div>
                </div>
            );

        case 'wait':
            return (
                <div className="space-y-4">
                    <div>
                        <Label>Wait Duration (minutes)</Label>
                        <Input
                            type="number"
                            placeholder="e.g., 30"
                            value={config.wait_duration_minutes || ''}
                            onChange={(e) => updateConfig('wait_duration_minutes', Number(e.target.value))}
                        />
                        <p className="text-xs text-slate-500 mt-1">
                            Or leave empty and set a specific time below
                        </p>
                    </div>
                    <div>
                        <Label>Wait Until (optional)</Label>
                        <Input
                            type="datetime-local"
                            value={config.wait_until || ''}
                            onChange={(e) => updateConfig('wait_until', e.target.value)}
                        />
                    </div>
                </div>
            );

        case 'conditional_branch':
            return (
                <div className="space-y-4">
                    <div>
                        <Label>Field to Check</Label>
                        <Input
                            placeholder="e.g., product.price or inventory.stock"
                            value={config.condition?.field || ''}
                            onChange={(e) => updateNestedConfig('condition', 'field', e.target.value)}
                        />
                    </div>
                    <div>
                        <Label>Operator</Label>
                        <Select 
                            value={config.condition?.operator || 'equals'} 
                            onValueChange={(v) => updateNestedConfig('condition', 'operator', v)}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="equals">Equals</SelectItem>
                                <SelectItem value="not_equals">Not Equals</SelectItem>
                                <SelectItem value="greater_than">Greater Than</SelectItem>
                                <SelectItem value="less_than">Less Than</SelectItem>
                                <SelectItem value="contains">Contains</SelectItem>
                                <SelectItem value="not_contains">Not Contains</SelectItem>
                                <SelectItem value="is_empty">Is Empty</SelectItem>
                                <SelectItem value="is_not_empty">Is Not Empty</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>Value to Compare</Label>
                        <Input
                            placeholder="e.g., 100"
                            value={config.condition?.value || ''}
                            onChange={(e) => updateNestedConfig('condition', 'value', e.target.value)}
                        />
                    </div>
                </div>
            );

        case 'bulk_update_products':
            return (
                <div className="space-y-4">
                    <div>
                        <Label>Filter (JSON)</Label>
                        <Textarea
                            placeholder='{"category": "electronics", "status": "active"}'
                            value={config.bulk_update?.filter ? JSON.stringify(config.bulk_update.filter, null, 2) : ''}
                            onChange={(e) => {
                                try {
                                    updateNestedConfig('bulk_update', 'filter', JSON.parse(e.target.value));
                                } catch (err) {
                                    // Invalid JSON
                                }
                            }}
                            rows={3}
                        />
                    </div>
                    <div>
                        <Label>Updates to Apply (JSON)</Label>
                        <Textarea
                            placeholder='{"status": "archived", "discount": 10}'
                            value={config.bulk_update?.updates ? JSON.stringify(config.bulk_update.updates, null, 2) : ''}
                            onChange={(e) => {
                                try {
                                    updateNestedConfig('bulk_update', 'updates', JSON.parse(e.target.value));
                                } catch (err) {
                                    // Invalid JSON
                                }
                            }}
                            rows={3}
                        />
                    </div>
                    <div>
                        <Label>Max Items (optional)</Label>
                        <Input
                            type="number"
                            placeholder="Leave empty for all"
                            value={config.bulk_update?.max_items || ''}
                            onChange={(e) => updateNestedConfig('bulk_update', 'max_items', Number(e.target.value))}
                        />
                    </div>
                </div>
            );

        default:
            return (
                <div className="text-sm text-slate-500">
                    Configuration form for {actionType} coming soon...
                </div>
            );
    }
};

export default function AutomationBuilder({ automation, onSave }) {
    const [actions, setActions] = useState(automation?.action_chain || []);
    const [expandedAction, setExpandedAction] = useState(null);

    const addAction = () => {
        setActions([
            ...actions,
            {
                action_id: `temp_${Date.now()}`,
                order: actions.length,
                run_parallel: false,
                continue_on_failure: false,
                config: {}
            }
        ]);
        setExpandedAction(actions.length);
    };

    const updateAction = (index, updates) => {
        const newActions = [...actions];
        newActions[index] = { ...newActions[index], ...updates };
        setActions(newActions);
    };

    const removeAction = (index) => {
        setActions(actions.filter((_, i) => i !== index));
    };

    const moveAction = (index, direction) => {
        if (
            (direction === 'up' && index === 0) ||
            (direction === 'down' && index === actions.length - 1)
        ) {
            return;
        }

        const newActions = [...actions];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;
        [newActions[index], newActions[swapIndex]] = [newActions[swapIndex], newActions[index]];
        
        // Update order
        newActions.forEach((action, i) => {
            action.order = i;
        });

        setActions(newActions);
    };

    const handleSave = () => {
        onSave({ ...automation, action_chain: actions });
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Action Chain</h3>
                <Button onClick={addAction} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Action
                </Button>
            </div>

            {actions.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Zap className="w-12 h-12 text-slate-300 mb-3" />
                        <p className="text-slate-500 text-sm">No actions yet. Add your first action to get started.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {actions.map((action, index) => {
                        const actionType = ACTION_TYPES.find(t => t.value === action.action_type);
                        const Icon = actionType?.icon || Zap;
                        const isExpanded = expandedAction === index;

                        return (
                            <Card key={index} className="border-l-4 border-l-indigo-500">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Badge variant="outline">{index + 1}</Badge>
                                            <Icon className="w-5 h-5 text-indigo-600" />
                                            <div>
                                                <Select
                                                    value={action.action_type || ''}
                                                    onValueChange={(v) => updateAction(index, { action_type: v, config: {} })}
                                                >
                                                    <SelectTrigger className="h-8">
                                                        <SelectValue placeholder="Select action type..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {ACTION_TYPES.map(type => (
                                                            <SelectItem key={type.value} value={type.value}>
                                                                {type.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setExpandedAction(isExpanded ? null : index)}
                                            >
                                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removeAction(index)}
                                            >
                                                <Trash2 className="w-4 h-4 text-red-500" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                {isExpanded && action.action_type && (
                                    <CardContent className="pt-0">
                                        <ActionConfigForm
                                            actionType={action.action_type}
                                            config={action.config || {}}
                                            onChange={(newConfig) => updateAction(index, { config: newConfig })}
                                        />
                                    </CardContent>
                                )}
                            </Card>
                        );
                    })}
                </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => window.history.back()}>
                    Cancel
                </Button>
                <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700">
                    Save Automation
                </Button>
            </div>
        </div>
    );
}