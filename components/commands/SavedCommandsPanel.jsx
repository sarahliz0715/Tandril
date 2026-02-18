import React, { useState, useEffect } from 'react';
import { SavedCommand } from '@/lib/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Play, Edit, Trash2, Plus, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import SavedCommandFormModal from './SavedCommandFormModal';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function SavedCommandsPanel({ onRunCommand }) {
    const [savedCommands, setSavedCommands] = useState([]);
    const [commandToEdit, setCommandToEdit] = useState(null);
    const [showForm, setShowForm] = useState(false);

    useEffect(() => {
        loadSavedCommands();
    }, []);

    const loadSavedCommands = async () => {
        try {
            const commands = await SavedCommand.list('-use_count');
            // Filter out any malformed commands
            const validCommands = (commands || []).filter(cmd =>
                cmd && typeof cmd === 'object' && cmd.name && cmd.command_text
            );
            setSavedCommands(validCommands);
        } catch (error) {
            console.error('Failed to load saved commands:', error);
            setSavedCommands([]);
        }
    };

    const handleRun = async (command) => {
        try {
            await SavedCommand.update(command.id, {
                use_count: (command.use_count || 0) + 1
            });
            onRunCommand(command.command_text);
            loadSavedCommands();
        } catch (error) {
            toast.error('Failed to run command');
        }
    };

    const handleEdit = (command) => {
        setCommandToEdit(command);
        setShowForm(true);
    };

    const handleDelete = async (commandId) => {
        try {
            await SavedCommand.delete(commandId);
            toast.success('Command deleted');
            loadSavedCommands();
        } catch (error) {
            toast.error('Failed to delete command');
        }
    };

    const handleToggleFavorite = async (command) => {
        try {
            await SavedCommand.update(command.id, {
                is_favorite: !command.is_favorite
            });
            loadSavedCommands();
        } catch (error) {
            toast.error('Failed to update favorite');
        }
    };

    const handleSaveSuccess = () => {
        loadSavedCommands();
        setShowForm(false);
        setCommandToEdit(null);
    };

    const favorites = savedCommands.filter(cmd => cmd.is_favorite);
    const allCommands = savedCommands.filter(cmd => !cmd.is_favorite);

    const categoryColors = {
        inventory: 'bg-blue-100 text-blue-800',
        products: 'bg-purple-100 text-purple-800',
        marketing: 'bg-pink-100 text-pink-800',
        analytics: 'bg-green-100 text-green-800',
        general: 'bg-slate-100 text-slate-800'
    };

    const CommandCard = ({ command }) => {
        if (!command || !command.name) return null;

        return (
            <Card className="hover:shadow-md transition-shadow bg-white border-slate-200 relative">
                <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-slate-900 truncate">{command.name}</h4>
                            {command.description && (
                                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{command.description}</p>
                            )}
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleFavorite(command)}
                            className="flex-shrink-0 ml-2"
                        >
                            <Star className={`w-4 h-4 ${command.is_favorite ? 'fill-yellow-400 text-yellow-400' : 'text-slate-400'}`} />
                        </Button>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                        <Badge className={categoryColors[command.category] || categoryColors.general}>
                            {command.category}
                        </Badge>
                        {command.use_count > 0 && (
                            <span className="text-xs text-slate-500">Used {command.use_count} times</span>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            onClick={() => handleRun(command)}
                            className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                        >
                            <Play className="w-3 h-3 mr-1" /> Run
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(command)}
                        >
                            <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(command.id)}
                            className="text-red-600 hover:text-red-700"
                        >
                            <Trash2 className="w-3 h-3" />
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    };

    return (
        <div className="space-y-4">
            {/* Favorites Section */}
            {favorites.length > 0 && (
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                            Favorites
                        </h3>
                    </div>
                    <ScrollArea className="max-h-[300px] pr-4">
                        <div className="space-y-3">
                            {favorites.map(command => (
                                <CommandCard key={command.id} command={command} />
                            ))}
                        </div>
                    </ScrollArea>
                </div>
            )}

            {/* All Commands Section */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-700">
                        {favorites.length > 0 ? 'All Commands' : 'Saved Commands'}
                    </h3>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                            setCommandToEdit(null);
                            setShowForm(true);
                        }}
                    >
                        <Plus className="w-4 h-4 mr-1" /> New
                    </Button>
                </div>
                {allCommands.length > 0 ? (
                    <ScrollArea className="max-h-[400px] pr-4">
                        <div className="space-y-3">
                            {allCommands.map(command => (
                                <CommandCard key={command.id} command={command} />
                            ))}
                        </div>
                    </ScrollArea>
                ) : (
                    <Card className="bg-slate-50 border-slate-200">
                        <CardContent className="p-6 text-center">
                            <Sparkles className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                            <p className="text-sm text-slate-600 mb-3">No saved commands yet</p>
                            <Button
                                size="sm"
                                onClick={() => {
                                    setCommandToEdit(null);
                                    setShowForm(true);
                                }}
                            >
                                <Plus className="w-4 h-4 mr-1" /> Create Your First Command
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>

            {showForm && (
                <SavedCommandFormModal
                    commandToEdit={commandToEdit}
                    onClose={() => {
                        setShowForm(false);
                        setCommandToEdit(null);
                    }}
                    onSave={handleSaveSuccess}
                />
            )}
        </div>
    );
}