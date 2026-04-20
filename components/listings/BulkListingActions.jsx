import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Bot, Zap, Tag, DollarSign, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/apiClient';

export default function BulkListingActions({ selectedItems = [], onSuccess }) {
    const selectedCount = selectedItems.length;
    const [isExecuting, setIsExecuting] = useState(false);
    const [command, setCommand] = useState('');

    const handleExecute = async () => {
        if (!command) {
            toast.warning("Please enter a command for the selected items.");
            return;
        }
        setIsExecuting(true);
        try {
            const response = await api.functions.invoke('enhanced-execute-command', {
                command_text: command,
                item_ids: selectedItems
            });
            if (response.data?.success === false) {
                throw new Error(response.data?.error || 'Command failed');
            }
            toast.success('Command executed successfully');
            setCommand('');
            onSuccess?.();
        } catch (err) {
            toast.error('Failed to execute command', { description: err.message });
        } finally {
            setIsExecuting(false);
        }
    };

    const quickCommands = [
        { icon: Eye, text: "Publish selected listings" },
        { icon: EyeOff, text: "Unpublish selected listings" },
        { icon: Tag, text: "Add 'Sale' tag to selected" },
        { icon: DollarSign, text: "Increase price of selected by 10%" },
    ];

    return (
        <Card className="mb-4 bg-emerald-50 border-emerald-200">
            <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-emerald-900">{selectedCount} listings selected</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                    {quickCommands.map(cmd => (
                        <Button key={cmd.text} size="sm" variant="outline" className="bg-white" onClick={() => setCommand(cmd.text)}>
                            <cmd.icon className="w-4 h-4 mr-2" />
                            {cmd.text}
                        </Button>
                    ))}
                </div>
                <div className="relative">
                    <Bot className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                    <Textarea 
                        placeholder="Or type a bulk command... e.g., 'Update descriptions to include free shipping'"
                        className="pl-10"
                        value={command}
                        onChange={(e) => setCommand(e.target.value)}
                    />
                </div>
                <Button onClick={handleExecute} disabled={isExecuting || !command} className="w-full">
                    {isExecuting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
                    Execute on {selectedCount} items
                </Button>
            </CardContent>
        </Card>
    );
}