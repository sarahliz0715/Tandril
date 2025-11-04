import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { GitBranch, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ConditionalBranchModal({ isOpen, onClose, onSave, condition = null, availableActions = [], availableVariables = [] }) {
    const [conditionData, setConditionData] = useState({
        field: '',
        operator: 'equals',
        value: '',
        true_action_id: '',
        false_action_id: ''
    });

    const [fieldType, setFieldType] = useState('text'); // text, number, boolean

    useEffect(() => {
        if (condition) {
            setConditionData({
                field: condition.field || '',
                operator: condition.operator || 'equals',
                value: condition.value !== undefined ? condition.value : '',
                true_action_id: condition.true_action_id || '',
                false_action_id: condition.false_action_id || ''
            });
            // Detect field type
            if (typeof condition.value === 'number') {
                setFieldType('number');
            } else if (typeof condition.value === 'boolean') {
                setFieldType('boolean');
            } else {
                setFieldType('text');
            }
        }
    }, [condition]);

    const operators = {
        text: [
            { value: 'equals', label: 'Equals' },
            { value: 'not_equals', label: 'Not Equals' },
            { value: 'contains', label: 'Contains' },
            { value: 'not_contains', label: 'Does Not Contain' },
            { value: 'is_empty', label: 'Is Empty' },
            { value: 'is_not_empty', label: 'Is Not Empty' }
        ],
        number: [
            { value: 'equals', label: 'Equals' },
            { value: 'not_equals', label: 'Not Equals' },
            { value: 'greater_than', label: 'Greater Than' },
            { value: 'less_than', label: 'Less Than' },
            { value: 'greater_or_equal', label: 'Greater or Equal' },
            { value: 'less_or_equal', label: 'Less or Equal' }
        ],
        boolean: [
            { value: 'equals', label: 'Is True' },
            { value: 'not_equals', label: 'Is False' }
        ]
    };

    const handleSave = () => {
        if (!conditionData.field) {
            toast.error('Please specify a field to check');
            return;
        }

        if (!conditionData.operator) {
            toast.error('Please select an operator');
            return;
        }

        // Convert value to appropriate type
        let finalValue = conditionData.value;
        if (fieldType === 'number' && finalValue !== '') {
            finalValue = parseFloat(finalValue);
        } else if (fieldType === 'boolean') {
            finalValue = finalValue === 'true' || finalValue === true;
        }

        onSave({
            ...conditionData,
            value: finalValue
        });
    };

    const needsValue = !['is_empty', 'is_not_empty'].includes(conditionData.operator);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <GitBranch className="w-5 h-5 text-purple-600" />
                        Configure Conditional Branch
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Condition Setup */}
                    <div className="space-y-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                        <h3 className="font-semibold text-purple-900">IF Condition</h3>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Field */}
                            <div className="space-y-2">
                                <Label>Field / Variable</Label>
                                <Select
                                    value={conditionData.field}
                                    onValueChange={(value) => setConditionData({ ...conditionData, field: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select field..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="trigger.total_stock">Stock Level</SelectItem>
                                        <SelectItem value="trigger.total_price">Order Total</SelectItem>
                                        <SelectItem value="trigger.customer_email">Customer Email</SelectItem>
                                        <SelectItem value="trigger.platform">Platform</SelectItem>
                                        <SelectItem value="trigger.status">Status</SelectItem>
                                        <SelectItem value="trigger.priority">Priority</SelectItem>
                                        {availableVariables.map(variable => (
                                            <SelectItem key={variable.name} value={variable.name}>
                                                {variable.label || variable.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Field Type */}
                            <div className="space-y-2">
                                <Label>Field Type</Label>
                                <Select value={fieldType} onValueChange={setFieldType}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="text">Text</SelectItem>
                                        <SelectItem value="number">Number</SelectItem>
                                        <SelectItem value="boolean">Boolean</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Operator */}
                        <div className="space-y-2">
                            <Label>Operator</Label>
                            <Select
                                value={conditionData.operator}
                                onValueChange={(value) => setConditionData({ ...conditionData, operator: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {operators[fieldType].map(op => (
                                        <SelectItem key={op.value} value={op.value}>
                                            {op.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Value */}
                        {needsValue && (
                            <div className="space-y-2">
                                <Label>Compare Value</Label>
                                {fieldType === 'boolean' ? (
                                    <Select
                                        value={String(conditionData.value)}
                                        onValueChange={(value) => setConditionData({ ...conditionData, value: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="true">True</SelectItem>
                                            <SelectItem value="false">False</SelectItem>
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <Input
                                        type={fieldType === 'number' ? 'number' : 'text'}
                                        value={conditionData.value}
                                        onChange={(e) => setConditionData({ ...conditionData, value: e.target.value })}
                                        placeholder="Enter value to compare..."
                                    />
                                )}
                            </div>
                        )}
                    </div>

                    {/* Branch Actions */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-slate-900">THEN/ELSE Actions</h3>

                        {/* TRUE Branch */}
                        <div className="space-y-2 p-4 bg-green-50 rounded-lg border border-green-200">
                            <Label className="flex items-center gap-2">
                                <Badge className="bg-green-600 text-white">TRUE</Badge>
                                If condition is TRUE, execute:
                            </Label>
                            <Select
                                value={conditionData.true_action_id}
                                onValueChange={(value) => setConditionData({ ...conditionData, true_action_id: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select action..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableActions.map(action => (
                                        <SelectItem key={action.id} value={action.id}>
                                            {action.name} ({action.action_type})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* FALSE Branch */}
                        <div className="space-y-2 p-4 bg-red-50 rounded-lg border border-red-200">
                            <Label className="flex items-center gap-2">
                                <Badge className="bg-red-600 text-white">FALSE</Badge>
                                If condition is FALSE, execute:
                            </Label>
                            <Select
                                value={conditionData.false_action_id}
                                onValueChange={(value) => setConditionData({ ...conditionData, false_action_id: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select action (optional)" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={null}>Skip (no action)</SelectItem>
                                    {availableActions.map(action => (
                                        <SelectItem key={action.id} value={action.id}>
                                            {action.name} ({action.action_type})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <p className="text-xs font-semibold text-slate-700 mb-2">Condition Preview:</p>
                        <code className="text-xs font-mono text-slate-900">
                            IF {conditionData.field || '[field]'} {conditionData.operator} {needsValue ? (conditionData.value || '[value]') : ''} THEN [action] ELSE [action]
                        </code>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} className="bg-purple-600 hover:bg-purple-700">
                        Save Condition
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}