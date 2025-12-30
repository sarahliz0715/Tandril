import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Check, AlertCircle, Sparkles, Clock, Zap } from 'lucide-react';
import { api } from '@/api/apiClient';
import { toast } from 'sonner';

export default function CreateFromTemplateModal({ template, isOpen, onClose, onSuccess }) {
    const [automationName, setAutomationName] = useState(template?.name || '');
    const [isCreating, setIsCreating] = useState(false);

    const handleCreate = async () => {
        if (!automationName.trim()) {
            toast.error('Please enter a name for your automation');
            return;
        }

        setIsCreating(true);
        try {
            // 1. Create the trigger
            const trigger = await api.entities.AutomationTrigger.create({
                ...template.trigger_template
            });

            // 2. Create all actions
            const createdActions = [];
            for (const actionTemplate of template.actions_template) {
                const action = await api.entities.AutomationAction.create({
                    name: actionTemplate.name,
                    action_type: actionTemplate.action_type,
                    config: actionTemplate.config,
                    retry_on_failure: true,
                    max_retries: 3
                });
                createdActions.push({
                    action_id: action.id,
                    order: actionTemplate.order,
                    run_parallel: actionTemplate.run_parallel || false,
                    continue_on_failure: actionTemplate.continue_on_failure || false
                });
            }

            // 3. Create the automation
            const automation = await api.entities.Automation.create({
                name: automationName,
                description: template.description,
                icon: template.icon,
                trigger_id: trigger.id,
                action_chain: createdActions,
                is_active: true,
                category: template.category,
                tags: template.tags || [],
                created_from_template: template.id,
                statistics: {
                    total_runs: 0,
                    successful_runs: 0,
                    failed_runs: 0,
                    average_execution_time_ms: 0
                }
            });

            // 4. Update template use count
            await api.entities.AutomationTemplate.update(template.id, {
                use_count: (template.use_count || 0) + 1
            });

            toast.success('Automation created successfully!', {
                description: `"${automationName}" is now active and ready to run.`
            });

            onSuccess(automation);
            onClose();
        } catch (error) {
            console.error('Error creating automation from template:', error);
            toast.error('Failed to create automation', {
                description: error.message || 'Please try again or contact support.'
            });
        } finally {
            setIsCreating(false);
        }
    };

    if (!template) return null;

    const scheduleConfig = template.trigger_template?.schedule_config;
    const getScheduleDescription = () => {
        if (!scheduleConfig) return 'Custom schedule';
        
        const { frequency, time_of_day, day_of_week, day_of_month } = scheduleConfig;
        
        switch (frequency) {
            case 'hourly':
                return 'Every hour';
            case 'daily':
                return `Daily at ${time_of_day || '00:00'}`;
            case 'weekly':
                const days = day_of_week?.join(', ') || 'selected days';
                return `Weekly on ${days} at ${time_of_day || '00:00'}`;
            case 'monthly':
                return `Monthly on day ${day_of_month || 1} at ${time_of_day || '00:00'}`;
            default:
                return 'Custom schedule';
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-indigo-600" />
                        Create Automation from Template
                    </DialogTitle>
                    <DialogDescription>
                        Set up "{template.name}" with your preferences
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Automation Name */}
                    <div className="space-y-2">
                        <Label htmlFor="automation-name">Automation Name</Label>
                        <Input
                            id="automation-name"
                            value={automationName}
                            onChange={(e) => setAutomationName(e.target.value)}
                            placeholder="e.g., My Weekly Inventory Check"
                        />
                    </div>

                    {/* Template Info */}
                    <Alert className="bg-indigo-50 border-indigo-200">
                        <AlertCircle className="h-4 w-4 text-indigo-600" />
                        <AlertDescription className="text-indigo-900">
                            <strong>What this does:</strong> {template.description}
                        </AlertDescription>
                    </Alert>

                    {/* Schedule Info */}
                    <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                            <Clock className="w-4 h-4" />
                            Schedule
                        </div>
                        <p className="text-sm text-slate-600">{getScheduleDescription()}</p>
                        <div className="flex flex-wrap gap-2">
                            <Badge variant="outline" className="text-xs">
                                {template.difficulty}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                                Saves {template.estimated_time_saved_hours_per_week}h/week
                            </Badge>
                        </div>
                    </div>

                    {/* Actions Preview */}
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                            <Zap className="w-4 h-4" />
                            Actions ({template.actions_template.length})
                        </Label>
                        <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                            {template.actions_template.map((action, index) => (
                                <div key={index} className="flex items-start gap-2 text-sm">
                                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold flex-shrink-0 mt-0.5">
                                        {index + 1}
                                    </span>
                                    <div>
                                        <p className="font-medium text-slate-900">{action.name}</p>
                                        <p className="text-xs text-slate-600">
                                            {action.action_type.replace(/_/g, ' ')}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Tags */}
                    {template.tags && template.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {template.tags.map((tag, i) => (
                                <span key={i} className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isCreating}>
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleCreate} 
                        disabled={isCreating || !automationName.trim()}
                        className="bg-indigo-600 hover:bg-indigo-700"
                    >
                        {isCreating ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Creating...
                            </>
                        ) : (
                            <>
                                <Check className="w-4 h-4 mr-2" />
                                Create Automation
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}