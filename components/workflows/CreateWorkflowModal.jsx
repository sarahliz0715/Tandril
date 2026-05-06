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
import AutomationBuilder from '../automations/AutomationBuilder';

const scheduleOptions = [
    { value: '0 * * * *',   label: 'Every Hour' },
    { value: '0 6 * * *',   label: 'Every Day at 6 AM' },
    { value: '0 8 * * *',   label: 'Every Day at 8 AM' },
    { value: '0 9 * * *',   label: 'Every Day at 9 AM' },
    { value: '0 12 * * *',  label: 'Every Day at 12 PM' },
    { value: '0 9 * * 1',   label: 'Every Monday at 9 AM' },
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

export default function CreateWorkflowModal({ onClose, onSuccess }) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [triggerType, setTriggerType] = useState('manual');
    const [cron, setCron] = useState('0 9 * * *');
    // actions holds the unified step array from AutomationBuilder
    const [actions, setActions] = useState([]);

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
            const triggerConfig = triggerType === 'schedule'
                ? { cron, label: scheduleOptions.find(o => o.value === cron)?.label }
                : {};

            const payload = {
                name: name.trim(),
                description,
                trigger_type: triggerType,
                trigger_config: triggerConfig,
                actions,
                is_active: false,
                current_step: 0,
                status: 'active',
                ...(triggerType === 'schedule' && cron ? { next_run_at: calcNextRunAt(cron) } : {}),
            };

            await api.entities.AIWorkflow.create(payload);
            toast.success('Workflow created!');
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Failed to create workflow:', error);
            toast.error('Failed to create workflow', { description: error.message });
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
                        Create New Workflow
                    </DialogTitle>
                    <DialogDescription>
                        Build a multi-step automated workflow. Price changes, waits, emails — all in one chain.
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
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating…</> : 'Create Workflow'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
