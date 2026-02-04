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

export default function CreateWorkflowModal({ onClose, onSuccess }) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [workflow, setWorkflow] = useState({
        name: '',
        description: '',
        trigger_type: 'manual',
        trigger_config: {
            frequency: 'daily',
            hour: 9
        },
        commands: [''],
        platforms: ['shopify'],
        is_active: false
    });

    const handleChange = (field, value) => {
        setWorkflow(prev => ({ ...prev, [field]: value }));
    };

    const handleCommandChange = (index, value) => {
        const newCommands = [...workflow.commands];
        newCommands[index] = value;
        setWorkflow(prev => ({ ...prev, commands: newCommands }));
    };

    const addCommand = () => {
        setWorkflow(prev => ({
            ...prev,
            commands: [...prev.commands, '']
        }));
    };

    const removeCommand = (index) => {
        if (workflow.commands.length > 1) {
            const newCommands = workflow.commands.filter((_, i) => i !== index);
            setWorkflow(prev => ({ ...prev, commands: newCommands }));
        }
    };

    const handleSubmit = async () => {
        if (!workflow.name.trim()) {
            toast.error("Please enter a workflow name");
            return;
        }

        const validCommands = workflow.commands.filter(cmd => cmd.trim());
        if (validCommands.length === 0) {
            toast.error("Please add at least one command");
            return;
        }

        setIsSubmitting(true);

        try {
            await api.entities.AIWorkflow.create({
                ...workflow,
                commands: validCommands
            });

            toast.success("Workflow created successfully!");
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Failed to create workflow:', error);
            toast.error("Failed to create workflow", {
                description: error.message
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Zap className="w-5 h-5 text-indigo-600" />
                        Create New Workflow
                    </DialogTitle>
                    <DialogDescription>
                        Create an automated workflow to run commands on a schedule or trigger.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Basic Info */}
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="name">Workflow Name *</Label>
                            <Input
                                id="name"
                                value={workflow.name}
                                onChange={(e) => handleChange('name', e.target.value)}
                                placeholder="e.g., Daily SEO Optimization"
                            />
                        </div>

                        <div>
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={workflow.description}
                                onChange={(e) => handleChange('description', e.target.value)}
                                placeholder="What does this workflow do?"
                                className="h-20"
                            />
                        </div>
                    </div>

                    {/* Trigger Configuration */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-slate-900">Trigger</h3>
                        
                        <div>
                            <Label htmlFor="trigger_type">When should this run?</Label>
                            <Select
                                value={workflow.trigger_type}
                                onValueChange={(value) => handleChange('trigger_type', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="manual">Manual (Run when I click)</SelectItem>
                                    <SelectItem value="schedule">On a Schedule</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {workflow.trigger_type === 'schedule' && (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Frequency</Label>
                                    <Select
                                        value={workflow.trigger_config.frequency}
                                        onValueChange={(value) => handleChange('trigger_config', { ...workflow.trigger_config, frequency: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="daily">Daily</SelectItem>
                                            <SelectItem value="weekly">Weekly</SelectItem>
                                            <SelectItem value="monthly">Monthly</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Time (Hour)</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        max="23"
                                        value={workflow.trigger_config.hour}
                                        onChange={(e) => handleChange('trigger_config', { ...workflow.trigger_config, hour: parseInt(e.target.value) })}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Commands */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-slate-900">Commands</h3>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addCommand}
                            >
                                + Add Command
                            </Button>
                        </div>

                        <div className="space-y-3">
                            {workflow.commands.map((command, index) => (
                                <div key={index} className="flex gap-2">
                                    <Textarea
                                        value={command}
                                        onChange={(e) => handleCommandChange(index, e.target.value)}
                                        placeholder="e.g., Update SEO titles for all products in the 'T-Shirts' collection"
                                        className="h-20"
                                    />
                                    {workflow.commands.length > 1 && (
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
                    </div>

                    {/* Platform Selection */}
                    <div>
                        <Label>Target Platform</Label>
                        <Select
                            value={workflow.platforms[0] || 'shopify'}
                            onValueChange={(value) => handleChange('platforms', [value])}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="shopify">Shopify</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Creating...
                            </>
                        ) : (
                            'Create Workflow'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}