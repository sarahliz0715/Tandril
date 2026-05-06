import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
    Zap, Mail, Bell, Package, DollarSign, RefreshCw, Globe, Clock,
    GitBranch, Sparkles, Plus, Trash2, ChevronDown, ChevronUp
} from 'lucide-react';

const ACTION_TYPES = [
    { value: 'run_ai_command',       label: 'Run AI Command',        icon: Sparkles,   category: 'AI' },
    { value: 'send_email',           label: 'Send Email',             icon: Mail,       category: 'Communication' },
    { value: 'send_alert',           label: 'Send Alert',             icon: Bell,       category: 'Communication' },
    { value: 'update_inventory',     label: 'Update Inventory',       icon: Package,    category: 'Products' },
    { value: 'update_price',         label: 'Update Price',           icon: DollarSign, category: 'Products' },
    { value: 'bulk_update_products', label: 'Bulk Update Products',   icon: Package,    category: 'Products' },
    { value: 'sync_platform',        label: 'Sync Platform',          icon: RefreshCw,  category: 'Platforms' },
    { value: 'webhook',              label: 'Call Webhook',           icon: Globe,      category: 'Integration' },
    { value: 'wait',                 label: 'Wait / Delay',           icon: Clock,      category: 'Control' },
    { value: 'conditional_branch',   label: 'If / Then / Else',       icon: GitBranch,  category: 'Control' },
];

const PLATFORMS = [
    { value: 'shopify',     label: 'Shopify' },
    { value: 'woocommerce', label: 'WooCommerce' },
    { value: 'ebay',        label: 'eBay' },
    { value: 'etsy',        label: 'Etsy' },
    { value: 'faire',       label: 'Faire' },
];

// All config fields are flat — they map 1:1 to what smart-api / the executor expects.
const ActionConfigForm = ({ actionType, config, onChange }) => {
    const set = (key, value) => onChange({ ...config, [key]: value });

    switch (actionType) {
        case 'run_ai_command':
            return (
                <div className="space-y-4">
                    <div>
                        <Label>AI Command</Label>
                        <Textarea
                            placeholder="e.g., Update SEO for all products tagged {{tag}}"
                            value={config.command_text || ''}
                            onChange={e => set('command_text', e.target.value)}
                            rows={3}
                        />
                        <p className="text-xs text-slate-500 mt-1">Use &#123;&#123;variable&#125;&#125; for dynamic values</p>
                    </div>
                </div>
            );

        case 'send_email':
            return (
                <div className="space-y-4">
                    <div>
                        <Label>Recipient</Label>
                        <Input placeholder="email@example.com" value={config.email_recipient || ''} onChange={e => set('email_recipient', e.target.value)} />
                    </div>
                    <div>
                        <Label>Subject</Label>
                        <Input placeholder="Email subject" value={config.email_subject || ''} onChange={e => set('email_subject', e.target.value)} />
                    </div>
                    <div>
                        <Label>Body</Label>
                        <Textarea placeholder="Email content…" value={config.email_body || ''} onChange={e => set('email_body', e.target.value)} rows={4} />
                    </div>
                </div>
            );

        case 'send_alert':
            return (
                <div className="space-y-4">
                    <div>
                        <Label>Title</Label>
                        <Input placeholder="Alert headline" value={config.alert_title || ''} onChange={e => set('alert_title', e.target.value)} />
                    </div>
                    <div>
                        <Label>Message</Label>
                        <Textarea placeholder="Details…" value={config.alert_message || ''} onChange={e => set('alert_message', e.target.value)} rows={3} />
                    </div>
                    <div>
                        <Label>Priority</Label>
                        <Select value={config.alert_priority || 'medium'} onValueChange={v => set('alert_priority', v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
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

        case 'update_price':
            return (
                <div className="space-y-4">
                    <div>
                        <Label>Platform</Label>
                        <Select value={config.platform || 'shopify'} onValueChange={v => set('platform', v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {PLATFORMS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>Product Name</Label>
                        <Input placeholder="e.g., Bigfoot Shirt" value={config.product_name || ''} onChange={e => set('product_name', e.target.value)} />
                    </div>
                    <div>
                        <Label>SKU (optional — narrows to one variant)</Label>
                        <Input placeholder="e.g., BIGFOOT-M-BLK" value={config.sku || ''} onChange={e => set('sku', e.target.value)} />
                    </div>
                    <div>
                        <Label>New Price ($)</Label>
                        <Input type="number" min="0" step="0.01" placeholder="29.99" value={config.price ?? ''} onChange={e => set('price', parseFloat(e.target.value) || 0)} />
                    </div>
                </div>
            );

        case 'update_inventory':
            return (
                <div className="space-y-4">
                    <div>
                        <Label>Platform</Label>
                        <Select value={config.platform || 'shopify'} onValueChange={v => set('platform', v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {PLATFORMS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>Product Name</Label>
                        <Input placeholder="e.g., Bigfoot Shirt" value={config.product_name || ''} onChange={e => set('product_name', e.target.value)} />
                    </div>
                    <div>
                        <Label>SKU (optional)</Label>
                        <Input placeholder="e.g., BIGFOOT-M-BLK" value={config.sku || ''} onChange={e => set('sku', e.target.value)} />
                    </div>
                    <div>
                        <Label>Change Type</Label>
                        <Select value={config.quantity_mode || 'set'} onValueChange={v => set('quantity_mode', v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="set">Set to value</SelectItem>
                                <SelectItem value="delta">Add / subtract</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>{config.quantity_mode === 'delta' ? 'Change Amount (+/-)' : 'New Stock Level'}</Label>
                        <Input type="number" placeholder={config.quantity_mode === 'delta' ? '+10 or -5' : '100'} value={config.quantity ?? ''} onChange={e => set('quantity', parseInt(e.target.value) || 0)} />
                    </div>
                </div>
            );

        case 'wait':
            return (
                <div className="space-y-4">
                    <div className="flex gap-3">
                        <div className="flex-1">
                            <Label>Duration</Label>
                            <Input type="number" min="1" placeholder="2" value={config.duration ?? ''} onChange={e => set('duration', parseInt(e.target.value) || 1)} />
                        </div>
                        <div className="w-36">
                            <Label>Unit</Label>
                            <Select value={config.unit || 'hours'} onValueChange={v => set('unit', v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="minutes">Minutes</SelectItem>
                                    <SelectItem value="hours">Hours</SelectItem>
                                    <SelectItem value="days">Days</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <p className="text-xs text-slate-500">The scheduler runs hourly — minimum effective wait is ~1 hour.</p>
                </div>
            );

        case 'webhook':
            return (
                <div className="space-y-4">
                    <div>
                        <Label>URL</Label>
                        <Input placeholder="https://hooks.example.com/trigger" value={config.url || ''} onChange={e => set('url', e.target.value)} />
                    </div>
                    <div>
                        <Label>Method</Label>
                        <Select value={config.method || 'POST'} onValueChange={v => set('method', v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="GET">GET</SelectItem>
                                <SelectItem value="POST">POST</SelectItem>
                                <SelectItem value="PUT">PUT</SelectItem>
                                <SelectItem value="PATCH">PATCH</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>Payload (JSON, optional)</Label>
                        <Textarea
                            placeholder={'{"key": "value"}'}
                            value={config._payload_raw || ''}
                            onChange={e => {
                                set('_payload_raw', e.target.value);
                                try { set('payload', JSON.parse(e.target.value)); } catch {}
                            }}
                            rows={4}
                        />
                    </div>
                    <div>
                        <Label>Headers (JSON, optional)</Label>
                        <Textarea
                            placeholder={'{"Authorization": "Bearer ..."}'}
                            value={config._headers_raw || ''}
                            onChange={e => {
                                set('_headers_raw', e.target.value);
                                try { set('headers', JSON.parse(e.target.value)); } catch {}
                            }}
                            rows={3}
                        />
                    </div>
                </div>
            );

        case 'sync_platform':
            return (
                <div className="space-y-4">
                    <div>
                        <Label>Platform</Label>
                        <Select value={config.platform || ''} onValueChange={v => set('platform', v)}>
                            <SelectTrigger><SelectValue placeholder="Select platform…" /></SelectTrigger>
                            <SelectContent>
                                {PLATFORMS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                                <SelectItem value="all">All Connected Platforms</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>Sync Type</Label>
                        <Select value={config.sync_type || 'products'} onValueChange={v => set('sync_type', v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="products">Products</SelectItem>
                                <SelectItem value="inventory">Inventory</SelectItem>
                                <SelectItem value="orders">Orders</SelectItem>
                                <SelectItem value="all">All Data</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            );

        case 'bulk_update_products':
            return (
                <div className="space-y-4">
                    <div>
                        <Label>Platform</Label>
                        <Select value={config.platform || 'shopify'} onValueChange={v => set('platform', v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {PLATFORMS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>Filter by Tag (optional)</Label>
                        <Input placeholder="e.g., summer-sale" value={config.tag || ''} onChange={e => set('tag', e.target.value)} />
                    </div>
                    <div>
                        <Label>Price Change (%)</Label>
                        <Input type="number" placeholder="-20 for 20% off" value={config.price_change_percent ?? ''} onChange={e => set('price_change_percent', parseFloat(e.target.value) || 0)} />
                    </div>
                    <div>
                        <Label>Max Products (leave blank for all)</Label>
                        <Input type="number" placeholder="100" value={config.max_items || ''} onChange={e => set('max_items', parseInt(e.target.value) || undefined)} />
                    </div>
                </div>
            );

        case 'conditional_branch':
            return (
                <div className="space-y-4">
                    <div>
                        <Label>Field to Check</Label>
                        <Input placeholder="e.g., inventory_quantity" value={config.field || ''} onChange={e => set('field', e.target.value)} />
                    </div>
                    <div>
                        <Label>Operator</Label>
                        <Select value={config.operator || 'less_than'} onValueChange={v => set('operator', v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="equals">Equals</SelectItem>
                                <SelectItem value="not_equals">Not Equals</SelectItem>
                                <SelectItem value="greater_than">Greater Than</SelectItem>
                                <SelectItem value="less_than">Less Than</SelectItem>
                                <SelectItem value="contains">Contains</SelectItem>
                                <SelectItem value="is_empty">Is Empty</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>Value</Label>
                        <Input placeholder="e.g., 10" value={config.value || ''} onChange={e => set('value', e.target.value)} />
                    </div>
                </div>
            );

        default:
            return <p className="text-sm text-slate-500">Select a step type above to configure it.</p>;
    }
};

export default function AutomationBuilder({ automation, onSave }) {
    // Accept both 'actions' (DB column) and 'action_chain' (legacy field name)
    const [steps, setSteps] = useState(
        (automation?.actions || automation?.action_chain || []).map((s, i) => ({
            ...s,
            _id: s._id || `s${i}`,
            // Normalise legacy format { type: 'action', config: { action_type, ... } }
            action_type: s.action_type || (s.type === 'wait' ? 'wait' : s.config?.action_type) || '',
            config: s.type === 'wait'
                ? { duration: s.duration, unit: s.unit }
                : (s.config ? { ...s.config } : {}),
        }))
    );
    const [expanded, setExpanded] = useState(null);

    const addStep = () => {
        const newStep = { _id: `s${Date.now()}`, action_type: '', config: {} };
        setSteps(prev => [...prev, newStep]);
        setExpanded(steps.length);
    };

    const updateStep = (index, changes) =>
        setSteps(prev => prev.map((s, i) => i === index ? { ...s, ...changes } : s));

    const removeStep = (index) => {
        setSteps(prev => prev.filter((_, i) => i !== index));
        setExpanded(null);
    };

    const moveStep = (index, dir) => {
        const swap = dir === 'up' ? index - 1 : index + 1;
        if (swap < 0 || swap >= steps.length) return;
        setSteps(prev => {
            const next = [...prev];
            [next[index], next[swap]] = [next[swap], next[index]];
            return next;
        });
    };

    const handleSave = () => {
        // Output the unified format consumed by execute-scheduled-workflows and smart-api:
        //   wait step   → { type: 'wait',   duration, unit }
        //   other steps → { type: 'action', config: { action_type, ...flat_params } }
        const actions = steps.map(({ _id, action_type, config }) => {
            if (action_type === 'wait') {
                return { type: 'wait', duration: config.duration || 1, unit: config.unit || 'hours' };
            }
            const { _payload_raw, _headers_raw, ...cleanConfig } = config || {};
            return { type: 'action', config: { action_type, ...cleanConfig } };
        });
        onSave({ ...(automation || {}), actions });
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Action Steps</h3>
                <Button onClick={addStep} size="sm">
                    <Plus className="w-4 h-4 mr-2" />Add Step
                </Button>
            </div>

            {steps.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Zap className="w-12 h-12 text-slate-300 mb-3" />
                        <p className="text-slate-500 text-sm">No steps yet. Add your first step to get started.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {steps.map((step, index) => {
                        const typeMeta = ACTION_TYPES.find(t => t.value === step.action_type);
                        const Icon = typeMeta?.icon || Zap;
                        const isExpanded = expanded === index;

                        return (
                            <Card key={step._id} className="border-l-4 border-l-emerald-500">
                                <CardHeader className="pb-3 pt-4 px-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <Badge variant="outline">{index + 1}</Badge>
                                            <Icon className="w-5 h-5 text-emerald-600 shrink-0" />
                                            <Select
                                                value={step.action_type || ''}
                                                onValueChange={v => updateStep(index, { action_type: v, config: {} })}
                                            >
                                                <SelectTrigger className="h-8">
                                                    <SelectValue placeholder="Select step type…" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {ACTION_TYPES.map(t => (
                                                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="flex items-center gap-1 ml-2 shrink-0">
                                            <Button variant="ghost" size="icon" onClick={() => moveStep(index, 'up')} disabled={index === 0}>
                                                <ChevronUp className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => moveStep(index, 'down')} disabled={index === steps.length - 1}>
                                                <ChevronDown className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => setExpanded(isExpanded ? null : index)}>
                                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => removeStep(index)}>
                                                <Trash2 className="w-4 h-4 text-red-500" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                {isExpanded && step.action_type && (
                                    <CardContent className="pt-0 pb-4 px-4">
                                        <ActionConfigForm
                                            actionType={step.action_type}
                                            config={step.config || {}}
                                            onChange={newConfig => updateStep(index, { config: newConfig })}
                                        />
                                    </CardContent>
                                )}
                            </Card>
                        );
                    })}
                </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => window.history.back()}>Cancel</Button>
                <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700">Save Workflow</Button>
            </div>
        </div>
    );
}
