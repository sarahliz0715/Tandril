import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/apiClient';
import { toast } from 'sonner';
import { Loader2, Zap } from 'lucide-react';

const scheduleOptions = [
    { value: '0 * * * *', label: 'Every Hour' },
    { value: '0 6 * * *', label: 'Every Day at 6 AM' },
    { value: '0 8 * * *', label: 'Every Day at 8 AM' },
    { value: '0 9 * * *', label: 'Every Day at 9 AM' },
    { value: '0 12 * * *', label: 'Every Day at 12 PM' },
    { value: '0 9 * * 1', label: 'Every Monday at 9 AM' },
];

const actionTypes = [
    { value: 'inventory_email', label: 'Email Inventory Report' },
    { value: 'send_email', label: 'Send Email' },
];

function calcNextRunAt(cron) {
    const now = new Date();
    const parts = cron.trim().split(' ');
    const minute = parseInt(parts[0]);
    const hour = parseInt(parts[1]);
    const dayOfWeek = parts[4] !== '*' ? parseInt(parts[4]) : null;
    const next = new Date(now);
    next.setSeconds(0, 0);
    if (dayOfWeek !== null) {
        const daysUntil = (dayOfWeek - now.getDay() + 7) % 7 || 7;
        next.setDate(next.getDate() + daysUntil);
        next.setHours(isNaN(hour) ? 9 : hour, isNaN(minute) ? 0 : minute, 0, 0);
    } else if (parts[1] === '*') {
        next.setMinutes(isNaN(minute) ? 0 : minute, 0, 0);
        if (next <= now) next.setHours(next.getHours() + 1);
    } else {
        next.setHours(isNaN(hour) ? 9 : hour, isNaN(minute) ? 0 : minute, 0, 0);
        if (next <= now) next.setDate(next.getDate() + 1);
    }
    return next.toISOString();
}

export default function CreateWorkflowModal({ onClose, onSuccess, editingWorkflow }) {
    const isEditing = !!editingWorkflow;
    const existingAction = editingWorkflow?.actions?.[0]?.config || {};

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [workflowType, setWorkflowType] = useState(
        editingWorkflow?.actions?.[0]?.type === 'command' ? 'command' : 'action'
    );
    const [name, setName] = useState(editingWorkflow?.name || '');
    const [description, setDescription] = useState(editingWorkflow?.description || '');
    const [triggerType, setTriggerType] = useState(editingWorkflow?.trigger_type || 'manual');
    const [cron, setCron] = useState(editingWorkflow?.trigger_config?.cron || '0 9 * * *');
    const [commands, setCommands] = useState(editingWorkflow?.commands?.length ? editingWorkflow.commands : ['']);
    const [platform, setPlatform] = useState(editingWorkflow?.platforms?.[0] || 'shopify');
    const [actionType, setActionType] = useState(existingAction.action_type || '');
    const [actionConfig, setActionConfig] = useState(
        existingAction.action_type ? { ...existingAction, action_type: undefined } : {}
    );

    const handleActionConfigChange = (field, value) => {
        setActionConfig(prev => ({ ...prev, [field]: value }));
    };

    const handleCommandChange = (index, value) => {
        const updated = [...commands];
        updated[index] = value;
        setCommands(updated);
    };

    const addCommand = () => setCommands(prev => [...prev, '']);

    const removeCommand = (index) => {
        if (commands.length > 1) setCommands(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!name.trim()) {
            toast.error("Please enter a workflow name");
            return;
        }

        if (workflowType === 'command') {
            const validCommands = commands.filter(c => c.trim());
            if (validCommands.length === 0) {
                toast.error("Please add at least one command");
                return;
            }
        } else {
            if (!actionType) {
                toast.error("Please select an action type");
                return;
            }
            if (actionType === 'inventory_email' && !actionConfig.recipient) {
                toast.error("Please enter a recipient email");
                return;
            }
            if (actionType === 'send_email' && (!actionConfig.recipient || !actionConfig.subject)) {
                toast.error("Please enter a recipient and subject");
                return;
            }
        }

        if (triggerType === 'schedule' && !cron) {
            toast.error("Please select a schedule");
            return;
        }

        setIsSubmitting(true);

        try {
            const triggerConfig = triggerType === 'schedule'
                ? { cron, label: scheduleOptions.find(o => o.value === cron)?.label }
                : {};

            const actions = workflowType === 'action' && actionType
                ? [{ type: 'action', config: { action_type: actionType, ...actionConfig } }]
                : [];

            const payload = {
                name: name.trim(),
                description,
                trigger_type: triggerType,
                trigger_config: triggerConfig,
                actions,
                platforms: [platform],
                is_active: false,
                ...(triggerType === 'schedule' && cron ? { next_run_at: calcNextRunAt(cron) } : {}),
            };

            if (isEditing) {
                await api.entities.AIWorkflow.update(editingWorkflow.id, payload);
                toast.success("Workflow updated successfully!");
            } else {
                await api.entities.AIWorkflow.create(payload);
                toast.success("Workflow created successfully!");
            }
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Failed to save workflow:', error);
            toast.error("Failed to save workflow", { description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Zap className="w-5 h-5 text-emerald-600" />
                        {isEditing ? 'Edit Workflow' : 'Create New Workflow'}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditing ? 'Update your workflow settings.' : 'Create an automated workflow to run commands on a schedule or trigger.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Workflow Type */}
                    <div>
                        <Label>Workflow Type</Label>
                        <Select value={workflowType} onValueChange={setWorkflowType}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="action">Automated Action (email, alerts)</SelectItem>
                                <SelectItem value="command">AI Command (natural language)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Basic Info */}
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="name">Workflow Name *</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g., Morning Inventory Check"
                            />
                        </div>
                        <div>
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="What does this workflow do?"
                                className="h-20"
                            />
                        </div>
                    </div>

                    {/* Trigger */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-slate-900">Trigger</h3>
                        <div>
                            <Label>When should this run?</Label>
                            <Select value={triggerType} onValueChange={setTriggerType}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="manual">Manual (Run when I click)</SelectItem>
                                    <SelectItem value="schedule">On a Schedule</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {triggerType === 'schedule' && (
                            <div>
                                <Label>Schedule</Label>
                                <Select value={cron} onValueChange={setCron}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {scheduleOptions.map(opt => (
                                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>

                    {/* Action or Commands */}
                    {workflowType === 'action' ? (
                        <div className="space-y-4">
                            <h3 className="font-semibold text-slate-900">Action</h3>
                            <div>
                                <Label>Action Type</Label>
                                <Select value={actionType} onValueChange={(v) => { setActionType(v); setActionConfig({}); }}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select an action..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {actionTypes.map(a => (
                                            <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {actionType === 'inventory_email' && (
                                <>
                                    <div>
                                        <Label>Recipient Email *</Label>
                                        <Input
                                            type="email"
                                            placeholder="your@email.com"
                                            value={actionConfig.recipient || ''}
                                            onChange={(e) => handleActionConfigChange('recipient', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <Label>Low Stock Threshold</Label>
                                        <Input
                                            type="number"
                                            placeholder="10"
                                            value={actionConfig.threshold || ''}
                                            onChange={(e) => handleActionConfigChange('threshold', e.target.value)}
                                        />
                                    </div>
                                </>
                            )}

                            {actionType === 'send_email' && (
                                <>
                                    <div>
                                        <Label>Recipient Email *</Label>
                                        <Input
                                            type="email"
                                            placeholder="recipient@example.com"
                                            value={actionConfig.recipient || ''}
                                            onChange={(e) => handleActionConfigChange('recipient', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <Label>Subject *</Label>
                                        <Input
                                            placeholder="Email Subject"
                                            value={actionConfig.subject || ''}
                                            onChange={(e) => handleActionConfigChange('subject', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <Label>Body</Label>
                                        <Textarea
                                            placeholder="Email content..."
                                            value={actionConfig.body || ''}
                                            onChange={(e) => handleActionConfigChange('body', e.target.value)}
                                            className="h-24"
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-slate-900">Commands</h3>
                                <Button type="button" variant="outline" size="sm" onClick={addCommand}>
                                    + Add Command
                                </Button>
                            </div>
                            <div className="space-y-3">
                                {commands.map((command, index) => (
                                    <div key={index} className="flex gap-2">
                                        <Textarea
                                            value={command}
                                            onChange={(e) => handleCommandChange(index, e.target.value)}
                                            placeholder="e.g., Update SEO titles for all products in the 'T-Shirts' collection"
                                            className="h-20"
                                        />
                                        {commands.length > 1 && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removeCommand(index)}
                                                className="flex-shrink-0"
                                            >
                                                ×
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div>
                                <Label>Target Platform</Label>
                                <Select value={platform} onValueChange={setPlatform}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="shopify">Shopify</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                {isEditing ? 'Saving...' : 'Creating...'}
                            </>
                        ) : (
                            isEditing ? 'Save Changes' : 'Create Workflow'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
