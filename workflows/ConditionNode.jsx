import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Settings } from 'lucide-react';

const conditionTypes = {
    inventory_level: { label: "Inventory Level", fields: [{ name: 'threshold', type: 'number', placeholder: 'e.g., 10' }] },
    time_based: { label: "Time of Day", fields: [{ name: 'hour', type: 'number', placeholder: 'e.g., 9 for 9 AM' }] },
};

export default function ConditionNode({ config, onUpdate }) {
    const conditionType = config.condition_type || '';
    const fields = conditionTypes[conditionType]?.fields || [];

    const handleConfigChange = (field, value) => {
        onUpdate({ ...config, [field]: value });
    };

    const handleTypeChange = (newType) => {
        onUpdate({ condition_type: newType });
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-orange-500" />
                <h4 className="font-semibold">Condition (If...)</h4>
            </div>
            <Select onValueChange={handleTypeChange} value={conditionType}>
                <SelectTrigger>
                    <SelectValue placeholder="Select a condition..." />
                </SelectTrigger>
                <SelectContent>
                    {Object.entries(conditionTypes).map(([key, { label }]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {fields.map(field => (
                <div key={field.name}>
                    <Input
                        type={field.type}
                        placeholder={field.placeholder}
                        value={config[field.name] || ''}
                        onChange={(e) => handleConfigChange(field.name, e.target.value)}
                    />
                </div>
            ))}
        </div>
    );
}