import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Variable,
    Plus,
    Trash2,
    Code,
    ArrowRight,
    Info
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function WorkflowVariablesPanel({ automation, onUpdate }) {
    const [variables, setVariables] = useState(automation.workflow_variables || []);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newVariable, setNewVariable] = useState({
        name: '',
        type: 'string',
        default_value: '',
        description: ''
    });

    const handleAddVariable = () => {
        if (!newVariable.name) {
            return;
        }

        const updatedVariables = [...variables, {
            ...newVariable,
            id: `var_${Date.now()}`,
            created_at: new Date().toISOString()
        }];

        setVariables(updatedVariables);
        onUpdate({ workflow_variables: updatedVariables });

        setNewVariable({
            name: '',
            type: 'string',
            default_value: '',
            description: ''
        });
        setShowAddForm(false);
    };

    const handleDeleteVariable = (variableId) => {
        const updatedVariables = variables.filter(v => v.id !== variableId);
        setVariables(updatedVariables);
        onUpdate({ workflow_variables: updatedVariables });
    };

    const getTypeColor = (type) => {
        const colors = {
            string: 'bg-blue-100 text-blue-800',
            number: 'bg-green-100 text-green-800',
            boolean: 'bg-purple-100 text-purple-800',
            array: 'bg-orange-100 text-orange-800',
            object: 'bg-pink-100 text-pink-800'
        };
        return colors[type] || 'bg-slate-100 text-slate-800';
    };

    const builtInVariables = [
        { name: 'trigger.timestamp', type: 'string', description: 'When the automation was triggered' },
        { name: 'trigger.data', type: 'object', description: 'All trigger data' },
        { name: 'automation.name', type: 'string', description: 'Name of this automation' },
        { name: 'automation.id', type: 'string', description: 'ID of this automation' },
        { name: 'user.email', type: 'string', description: 'Current user email' },
        { name: 'user.id', type: 'string', description: 'Current user ID' }
    ];

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Variable className="w-5 h-5 text-indigo-600" />
                    Workflow Variables
                    <Badge className="bg-indigo-100 text-indigo-800">
                        {variables.length} custom
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <Alert className="bg-blue-50 border-blue-200">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800 text-sm">
                        Variables allow you to store and pass data between actions in your workflow.
                        Use <code className="bg-blue-100 px-1 rounded">{'{{variable_name}}'}</code> syntax to reference them.
                    </AlertDescription>
                </Alert>

                {/* Built-in Variables */}
                <div className="space-y-3">
                    <h3 className="font-semibold text-slate-900 text-sm">Built-in Variables</h3>
                    <div className="space-y-2">
                        {builtInVariables.map((variable, index) => (
                            <div
                                key={index}
                                className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200"
                            >
                                <Code className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <code className="text-sm font-mono text-slate-900">
                                            {'{{' + variable.name + '}}'}
                                        </code>
                                        <Badge className={getTypeColor(variable.type)}>
                                            {variable.type}
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-slate-600">{variable.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Custom Variables */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-slate-900 text-sm">Custom Variables</h3>
                        <Button
                            size="sm"
                            onClick={() => setShowAddForm(!showAddForm)}
                            className="bg-indigo-600 hover:bg-indigo-700"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Variable
                        </Button>
                    </div>

                    {/* Add Variable Form */}
                    {showAddForm && (
                        <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label>Variable Name</Label>
                                    <Input
                                        value={newVariable.name}
                                        onChange={(e) => setNewVariable({ ...newVariable, name: e.target.value })}
                                        placeholder="e.g., customer_count"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Type</Label>
                                    <Select
                                        value={newVariable.type}
                                        onValueChange={(value) => setNewVariable({ ...newVariable, type: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="string">String</SelectItem>
                                            <SelectItem value="number">Number</SelectItem>
                                            <SelectItem value="boolean">Boolean</SelectItem>
                                            <SelectItem value="array">Array</SelectItem>
                                            <SelectItem value="object">Object</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Default Value (optional)</Label>
                                <Input
                                    value={newVariable.default_value}
                                    onChange={(e) => setNewVariable({ ...newVariable, default_value: e.target.value })}
                                    placeholder="Initial value..."
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Description</Label>
                                <Input
                                    value={newVariable.description}
                                    onChange={(e) => setNewVariable({ ...newVariable, description: e.target.value })}
                                    placeholder="What this variable is used for..."
                                />
                            </div>

                            <div className="flex justify-end gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setShowAddForm(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleAddVariable}
                                    className="bg-indigo-600 hover:bg-indigo-700"
                                >
                                    Add Variable
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Variables List */}
                    {variables.length === 0 && !showAddForm ? (
                        <div className="text-center py-8 text-slate-500">
                            <Variable className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                            <p className="text-sm">No custom variables yet</p>
                            <p className="text-xs">Click "Add Variable" to create one</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {variables.map((variable) => (
                                <div
                                    key={variable.id}
                                    className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 hover:border-indigo-300 transition-colors"
                                >
                                    <Variable className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <code className="text-sm font-mono text-slate-900">
                                                {'{{' + variable.name + '}}'}
                                            </code>
                                            <Badge className={getTypeColor(variable.type)}>
                                                {variable.type}
                                            </Badge>
                                            {variable.default_value && (
                                                <span className="text-xs text-slate-500">
                                                    = {variable.default_value}
                                                </span>
                                            )}
                                        </div>
                                        {variable.description && (
                                            <p className="text-xs text-slate-600">{variable.description}</p>
                                        )}
                                    </div>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7 text-red-600 hover:text-red-700"
                                        onClick={() => handleDeleteVariable(variable.id)}
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Usage Examples */}
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <h4 className="font-semibold text-slate-900 text-sm mb-3">Usage Examples</h4>
                    <div className="space-y-2 text-xs">
                        <div className="flex items-center gap-2">
                            <Code className="w-3 h-3 text-slate-400" />
                            <span className="text-slate-600">In email templates:</span>
                            <code className="bg-white px-2 py-1 rounded text-slate-900">
                                {'Hello {{trigger.customer_name}}'}
                            </code>
                        </div>
                        <div className="flex items-center gap-2">
                            <Code className="w-3 h-3 text-slate-400" />
                            <span className="text-slate-600">In conditions:</span>
                            <code className="bg-white px-2 py-1 rounded text-slate-900">
                                {'IF {{customer_count}} > 100'}
                            </code>
                        </div>
                        <div className="flex items-center gap-2">
                            <Code className="w-3 h-3 text-slate-400" />
                            <span className="text-slate-600">In URLs:</span>
                            <code className="bg-white px-2 py-1 rounded text-slate-900">
                                {'https://api.com/orders/{{trigger.order_id}}'}
                            </code>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}