import React, { useState } from 'react';
import { nextRunFromUtcCron, localCronToUtc, utcCronToLocal } from '@/lib/workflowSchedule';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/apiClient';
import { toast } from 'sonner';
import { Loader2, Zap } from 'lucide-react';
import AutomationBuilder from '../automations/AutomationBuilder';

const scheduleOptions = [
    { value: '*/2 * * * *', label: 'In 2 minutes' },
    { value: '0 * * * *',   label: 'Every Hour' },
    { value: '0 6 * * *',   label: 'Every Day at 6 AM' },
    { value: '0 8 * * *',   label: 'Every Day at 8 AM' },
    { value: '0 9 * * *',   label: 'Every Day at 9 AM' },
    { value: '0 12 * * *',  label: 'Every Day at 12 PM' },
    { value: '0 9 * * 1',   label: 'Every Monday at 9 AM' },
];

export default function CreateWorkflowModal({ onClose, onSuccess, editingWorkflow }) {
    const isEditing = !!editingWorkflow;

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [name, setName] = useState(editingWorkflow?.name || '');
    const [description, setDescription] = useState(editingWorkflow?.description || '');
    const [triggerType, setTriggerType] = useState(editingWorkflow?.trigger_type || 'manual');
    // The picker works in the seller's local time; the saved cron is UTC.
    const [cron, setCron] = useState(
        editingWorkflow?.trigger_config?.local_cron
        || (editingWorkflow?.trigger_config?.cron ? utcCronToLocal(editingWorkflow.trigger_config.cron) : '0 9 * * *')
    );
    // actions holds the unified step array from AutomationBuilder
    const [actions, setActions] = useState(editingWorkflow?.actions || []);

    const handleBuilderSave = (data) => {
        setActions(data.actions || []);
    };

    const handleSubmit = async () => {
        if (!name.trim()) {
            toast.error('Please enter a workflow name');
            return;
        }
        if (actions.length === 0) {
            toast.error('Add at least one step to your workflow');
            return;
        }
        if (triggerType === 'schedule' && !cron) {
            toast.error('Please select a schedule');
            return;
        }

        setIsSubmitting(true);
        try {
            const utcCron = localCronToUtc(cron);
            let timezone;
            try { timezone = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { /* older browsers */ }
            const triggerConfig = triggerType === 'schedule'
                ? { cron: utcCron, local_cron: cron, timezone, label: scheduleOptions.find(o => o.value === cron)?.label }
                : {};

            const payload = {
                name: name.trim(),
                description,
                trigger_type: triggerType,
                trigger_config: triggerConfig,
                actions,
                is_active: triggerType === 'schedule',
                current_step: 0,
                status: 'active',
                ...(triggerType === 'schedule' && cron ? { next_run_at: nextRunFromUtcCron(utcCron) } : {}),
            };

            if (isEditing) {
                await api.entities.AIWorkflow.update(editingWorkflow.id, payload);
                toast.success('Workflow updated successfully!');
            } else {
                await api.entities.AIWorkflow.create(payload);
                toast.success('Workflow created successfully!');
            }
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Failed to save workflow:', error);
            toast.error('Failed to save workflow', { description: error.message });
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
                        {isEditing ? 'Update your workflow settings.' : 'Build a multi-step automated workflow. Price changes, waits, emails — all in one chain.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Name + description */}
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="wf-name">Workflow Name *</Label>
                            <Input
                                id="wf-name"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="e.g., Weekend Flash Sale"
                            />
                        </div>
                        <div>
                            <Label htmlFor="wf-desc">Description</Label>
                            <Textarea
                                id="wf-desc"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="What does this workflow do?"
                                className="h-16"
                            />
                        </div>
                    </div>

                    {/* Trigger */}
                    <div className="space-y-3">
                        <h3 className="font-semibold text-slate-900">Trigger</h3>
                        <div>
                            <Label>When should this run?</Label>
                            <Select value={triggerType} onValueChange={setTriggerType}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="manual">Manual (I'll run it)</SelectItem>
                                    <SelectItem value="schedule">On a Schedule</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {triggerType === 'schedule' && (
                            <div>
                                <Label>Schedule</Label>
                                <Select value={cron} onValueChange={setCron}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {scheduleOptions.map(o => (
                                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>

                    {/* Steps via AutomationBuilder */}
                    <div>
                        <h3 className="font-semibold text-slate-900 mb-3">Steps</h3>
                        <AutomationBuilder
                            automation={{ actions }}
                            onSave={handleBuilderSave}
                            onChange={updatedActions => setActions(updatedActions)}
                            hideFooter={true}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
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
