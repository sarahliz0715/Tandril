import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
    Plus, X, Play, Trash2, GripVertical, Clock, CheckCircle, 
    AlertTriangle, Loader2, ArrowUp, ArrowDown 
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { toast } from 'sonner';

export default function CommandQueuePanel({ onExecuteQueue, connectedPlatforms }) {
    const [queueName, setQueueName] = useState('');
    const [commands, setCommands] = useState([]);
    const [isExecuting, setIsExecuting] = useState(false);
    const [executionResults, setExecutionResults] = useState([]);

    const addCommand = () => {
        const newCommand = {
            id: Date.now().toString(),
            command_text: '',
            platform_targets: connectedPlatforms.map(p => p.name),
            order: commands.length,
            status: 'pending'
        };
        setCommands([...commands, newCommand]);
    };

    const updateCommand = (id, field, value) => {
        setCommands(commands.map(cmd => 
            cmd.id === id ? { ...cmd, [field]: value } : cmd
        ));
    };

    const removeCommand = (id) => {
        setCommands(commands.filter(cmd => cmd.id !== id));
    };

    const handleDragEnd = (result) => {
        if (!result.destination) return;

        const items = Array.from(commands);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        // Update order numbers
        const reorderedCommands = items.map((cmd, index) => ({ ...cmd, order: index }));
        setCommands(reorderedCommands);
    };

    const executeQueue = async () => {
        if (commands.length === 0) {
            toast.warning("Add some commands to the queue first.");
            return;
        }

        if (!queueName.trim()) {
            toast.warning("Please name your command queue.");
            return;
        }

        setIsExecuting(true);
        const results = [];

        for (let i = 0; i < commands.length; i++) {
            const command = commands[i];
            if (!command.command_text.trim()) {
                results.push({
                    command_id: command.id,
                    success_count: 0,
                    failure_count: 1,
                    error: "Empty command text"
                });
                continue;
            }

            try {
                // Update command status
                setCommands(prev => prev.map(cmd => 
                    cmd.id === command.id ? { ...cmd, status: 'executing' } : cmd
                ));

                // Execute the command
                await onExecuteQueue(command.command_text, {
                    selectedPlatforms: connectedPlatforms.filter(p => 
                        command.platform_targets.includes(p.name)
                    )
                });

                // Mark as completed
                setCommands(prev => prev.map(cmd => 
                    cmd.id === command.id ? { ...cmd, status: 'completed' } : cmd
                ));

                results.push({
                    command_id: command.id,
                    success_count: 1,
                    failure_count: 0,
                    execution_time: Math.random() * 3 + 1
                });

            } catch (error) {
                setCommands(prev => prev.map(cmd => 
                    cmd.id === command.id ? { ...cmd, status: 'failed' } : cmd
                ));

                results.push({
                    command_id: command.id,
                    success_count: 0,
                    failure_count: 1,
                    error: error.message,
                    execution_time: 0
                });
            }

            // Add delay between commands
            if (i < commands.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        setExecutionResults(results);
        setIsExecuting(false);
        toast.success(`Queue "${queueName}" completed!`);
    };

    const clearQueue = () => {
        setCommands([]);
        setExecutionResults([]);
        setQueueName('');
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'pending': return <Clock className="w-4 h-4 text-slate-400" />;
            case 'executing': return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />;
            case 'completed': return <CheckCircle className="w-4 h-4 text-green-600" />;
            case 'failed': return <AlertTriangle className="w-4 h-4 text-red-600" />;
            default: return <Clock className="w-4 h-4 text-slate-400" />;
        }
    };

    return (
        <div className="space-y-6">
            <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <Play className="w-5 h-5 text-indigo-600" />
                            Command Queue
                        </div>
                        <Badge variant="outline" className="ml-auto">
                            {commands.length} commands
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-4">
                        <Input
                            placeholder="Queue name (e.g., 'Monday Morning Updates')"
                            value={queueName}
                            onChange={(e) => setQueueName(e.target.value)}
                            className="flex-1"
                        />
                        <Button
                            onClick={addCommand}
                            variant="outline"
                            disabled={isExecuting}
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Command
                        </Button>
                    </div>

                    {commands.length > 0 && (
                        <DragDropContext onDragEnd={handleDragEnd}>
                            <Droppable droppableId="commands">
                                {(provided) => (
                                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                                        {commands.map((command, index) => (
                                            <Draggable key={command.id} draggableId={command.id} index={index}>
                                                {(provided, snapshot) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        className={`border rounded-lg p-4 bg-white ${
                                                            snapshot.isDragging ? 'shadow-lg' : ''
                                                        }`}
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            <div
                                                                {...provided.dragHandleProps}
                                                                className="flex items-center gap-2 pt-2"
                                                            >
                                                                <GripVertical className="w-4 h-4 text-slate-400" />
                                                                <span className="text-sm font-medium text-slate-600">
                                                                    #{index + 1}
                                                                </span>
                                                            </div>
                                                            <div className="flex-1 space-y-3">
                                                                <Textarea
                                                                    placeholder="Enter command..."
                                                                    value={command.command_text}
                                                                    onChange={(e) => updateCommand(command.id, 'command_text', e.target.value)}
                                                                    disabled={isExecuting}
                                                                    className="min-h-[60px]"
                                                                />
                                                                {connectedPlatforms.length > 1 && (
                                                                    <Select
                                                                        value={command.platform_targets.join(',')}
                                                                        onValueChange={(value) => updateCommand(command.id, 'platform_targets', value.split(','))}
                                                                        disabled={isExecuting}
                                                                    >
                                                                        <SelectTrigger className="w-full">
                                                                            <SelectValue placeholder="Select platforms" />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            <SelectItem value={connectedPlatforms.map(p => p.name).join(',')}>
                                                                                All Platforms
                                                                            </SelectItem>
                                                                            {connectedPlatforms.map(platform => (
                                                                                <SelectItem key={platform.id} value={platform.name}>
                                                                                    {platform.name}
                                                                                </SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {getStatusIcon(command.status)}
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => removeCommand(command.id)}
                                                                    disabled={isExecuting}
                                                                    className="text-red-500 hover:text-red-700"
                                                                >
                                                                    <X className="w-4 h-4" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </DragDropContext>
                    )}

                    <div className="flex justify-between">
                        <Button
                            variant="outline"
                            onClick={clearQueue}
                            disabled={isExecuting || commands.length === 0}
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Clear Queue
                        </Button>
                        <Button
                            onClick={executeQueue}
                            disabled={isExecuting || commands.length === 0 || !queueName.trim()}
                            className="bg-indigo-600 hover:bg-indigo-700"
                        >
                            {isExecuting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Executing...
                                </>
                            ) : (
                                <>
                                    <Play className="w-4 h-4 mr-2" />
                                    Execute Queue
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Execution Results */}
            {executionResults.length > 0 && (
                <Card className="bg-green-50 border-green-200">
                    <CardHeader>
                        <CardTitle className="text-green-800">Execution Results</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {executionResults.map((result, index) => (
                                <div key={result.command_id} className="flex items-center justify-between p-2 bg-white rounded border">
                                    <span className="text-sm font-medium">Command #{index + 1}</span>
                                    <div className="flex items-center gap-2">
                                        {result.success_count > 0 && (
                                            <Badge className="bg-green-100 text-green-800">
                                                {result.success_count} success
                                            </Badge>
                                        )}
                                        {result.failure_count > 0 && (
                                            <Badge className="bg-red-100 text-red-800">
                                                {result.failure_count} failed
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}