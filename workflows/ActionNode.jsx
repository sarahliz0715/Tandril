import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Zap } from 'lucide-react';

const actionTypes = {
    ai_command: { label: "Run AI Command", fields: [{ name: 'command', type: 'textarea', placeholder: 'e.g., Update SEO for all products...' }] },
    send_email: { label: "Send Email", fields: [
        { name: 'recipient', type: 'text', placeholder: 'recipient@example.com or {{customer.email}}' },
        { name: 'subject', type: 'text', placeholder: 'Email Subject' },
        { name: 'body', type: 'textarea', placeholder: 'Email content...' },
    ]},
    create_alert: { label: "Create Alert", fields: [
        { name: 'alert_title', type: 'text', placeholder: 'Alert Title' },
        { name: 'alert_message', type: 'textarea', placeholder: 'Alert Message' },
    ]},
};

export default function ActionNode({ config, onUpdate }) {
    const actionType = config.action_type || '';
    const fields = actionTypes[actionType]?.fields || [];

    const handleConfigChange = (field, value) => {
        onUpdate({ ...config, [field]: value });
    };

    const handleTypeChange = (newType) => {
        onUpdate({ action_type: newType });
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-indigo-500" />
                <h4 className="font-semibold">Action</h4>
            </div>
            <Select onValueChange={handleTypeChange} value={actionType}>
                <SelectTrigger>
                    <SelectValue placeholder="Select an action type..." />
                </SelectTrigger>
                <SelectContent>
                    {Object.entries(actionTypes).map(([key, { label }]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {fields.map(field => (
                <div key={field.name}>
                    {field.type === 'textarea' ? (
                        <Textarea
                            placeholder={field.placeholder}
                            value={config[field.name] || ''}
                            onChange={(e) => handleConfigChange(field.name, e.target.value)}
                        />
                    ) : (
                        <Input
                            type={field.type}
                            placeholder={field.placeholder}
                            value={config[field.name] || ''}
                            onChange={(e) => handleConfigChange(field.name, e.target.value)}
                        />
                    )}
                </div>
            ))}
        </div>
    );
}