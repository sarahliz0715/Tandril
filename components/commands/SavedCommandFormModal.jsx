
import React, { useState } from 'react';
import { SavedCommand } from '@/api/entities';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function SavedCommandFormModal({ onClose, onSave, commandToEdit }) {
    const [command, setCommand] = useState(commandToEdit || {
        name: '',
        command_text: '',
        description: '',
        category: 'general',
    });
    const [isSaving, setIsSaving] = useState(false);

    const handleChange = (key, value) => {
        setCommand(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        // Basic validation
        if (!command.name || !command.command_text) {
            toast.error("Validation Error", { description: "Command Name and Command Text are required." });
            return;
        }

        setIsSaving(true);
        try {
            if (command.id) {
                await SavedCommand.update(command.id, command);
            } else {
                await SavedCommand.create(command);
            }
            onSave();
            onClose();
        } catch (error) {
            toast.error("Save Failed", { description: "Could not save the command template. Please try again." });
            console.error('Failed to save command', error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{command.id ? 'Edit' : 'Create'} Saved Command</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Command Name</Label>
                        <Input id="name" value={command.name} onChange={(e) => handleChange('name', e.target.value)} placeholder="e.g., Weekend Flash Sale" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="command_text">Command Text</Label>
                        <Textarea id="command_text" value={command.command_text} onChange={(e) => handleChange('command_text', e.target.value)} placeholder="e.g., Apply a 25% discount..." />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Input id="description" value={command.description} onChange={(e) => handleChange('description', e.target.value)} placeholder="e.g., For running flash sales on weekends" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <Select value={command.category} onValueChange={(value) => handleChange('category', value)}>
                            <SelectTrigger id="category">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {['inventory', 'products', 'marketing', 'analytics', 'general'].map(cat => (
                                    <SelectItem key={cat} value={cat} className="capitalize">{cat}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={onClose} disabled={isSaving}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save Command'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
