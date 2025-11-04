import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AIWorkflow } from '@/api/entities';
import { toast } from 'sonner';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { GripVertical, X, Save, Plus, ArrowLeft, Zap, Settings, HelpCircle, Loader2 } from 'lucide-react';
import TriggerNode from './TriggerNode';
import ActionNode from './ActionNode';
import ConditionNode from './ConditionNode';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const getNodeComponent = (node) => {
    switch(node.type) {
        case 'trigger': return TriggerNode;
        case 'action': return ActionNode;
        case 'condition': return ConditionNode;
        default: return () => <div>Unknown node type</div>;
    }
};

export default function WorkflowBuilder({ workflow: initialWorkflow, onSave, onClose }) {
    const [workflow, setWorkflow] = useState({
        ...initialWorkflow,
        nodes: initialWorkflow.nodes || [], // Ensure nodes is always an array
        trigger_config: initialWorkflow.trigger_config || {}
    });
    const [isSaving, setIsSaving] = useState(false);

    const updateWorkflow = (field, value) => {
        setWorkflow(prev => ({ ...prev, [field]: value }));
    };

    const updateNode = (nodeId, newConfig) => {
        const nodes = workflow.nodes || [];
        const newNodes = nodes.map(node =>
            node.id === nodeId ? { ...node, config: newConfig } : node
        );
        updateWorkflow('nodes', newNodes);
    };
    
    const updateTrigger = (newConfig) => {
        updateWorkflow('trigger_config', { ...workflow.trigger_config, ...newConfig });
    };

    const addNode = (type) => {
        const newNode = {
            id: `node_${Date.now()}`,
            type: type,
            config: {}
        };
        const currentNodes = workflow.nodes || [];
        updateWorkflow('nodes', [...currentNodes, newNode]);
    };

    const removeNode = (nodeId) => {
        const currentNodes = workflow.nodes || [];
        updateWorkflow('nodes', currentNodes.filter(node => node.id !== nodeId));
    };

    const handleDragEnd = (result) => {
        if (!result.destination) return;

        const items = Array.from(workflow.nodes || []);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        updateWorkflow('nodes', items);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const updated = await AIWorkflow.update(workflow.id, workflow);
            onSave(updated);
            toast.success("Workflow saved successfully!");
        } catch (error) {
            toast.error("Failed to save workflow.");
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };
    
    const nodeTypes = {
        action: { name: "Action", icon: Zap, description: "Perform a task like sending an email or running a command." },
        condition: { name: "Condition", icon: Settings, description: "Create a branch in your workflow based on data." }
    };

    // Ensure nodes is always an array
    const workflowNodes = workflow.nodes || [];

    return (
        <div className="min-h-screen bg-slate-50">
            <header className="sticky top-0 bg-white/80 backdrop-blur-sm border-b border-slate-200 z-10">
                <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                         <Button variant="ghost" size="icon" onClick={onClose}>
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <Input 
                            value={workflow.name || ''}
                            onChange={e => updateWorkflow('name', e.target.value)}
                            className="text-xl font-bold border-none shadow-none focus-visible:ring-0 p-0 h-auto"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline">
                            <HelpCircle className="w-4 h-4 mr-2" />
                            Help
                        </Button>
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Save className="w-4 h-4 mr-2" />}
                            Save Workflow
                        </Button>
                    </div>
                </div>
            </header>
            
            <main className="max-w-3xl mx-auto py-8 px-6">
                <div className="space-y-4">
                    <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Trigger</h2>
                    <TriggerNode 
                        config={workflow.trigger_config || {}} 
                        type={workflow.trigger_type || 'manual'}
                        onUpdate={updateTrigger} 
                    />
                    
                    <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider pt-4">Actions</h2>
                    
                    <DragDropContext onDragEnd={handleDragEnd}>
                        <Droppable droppableId="nodes">
                            {(provided) => (
                                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                                    {workflowNodes.map((node, index) => {
                                        const NodeComponent = getNodeComponent(node);
                                        return (
                                            <Draggable key={node.id} draggableId={node.id} index={index}>
                                                {(provided, snapshot) => (
                                                     <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        className={`bg-white border rounded-lg shadow-sm ${snapshot.isDragging ? 'shadow-lg' : ''}`}
                                                    >
                                                        <div className="flex items-start p-4 gap-3">
                                                            <div {...provided.dragHandleProps} className="pt-2 cursor-grab">
                                                                <GripVertical className="w-5 h-5 text-slate-400" />
                                                            </div>
                                                            <div className="flex-grow">
                                                                <NodeComponent
                                                                    config={node.config || {}}
                                                                    onUpdate={(newConfig) => updateNode(node.id, newConfig)}
                                                                />
                                                            </div>
                                                            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-500" onClick={() => removeNode(node.id)}>
                                                                <X className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}
                                            </Draggable>
                                        );
                                    })}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </DragDropContext>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full border-dashed">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Step
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-64">
                         {Object.entries(nodeTypes).map(([type, { name, icon: Icon, description }]) => (
                            <DropdownMenuItem key={type} onClick={() => addNode(type)} className="items-start">
                                <Icon className="w-5 h-5 mr-3 mt-1 text-indigo-500"/>
                                <div>
                                    <p className="font-semibold">{name}</p>
                                    <p className="text-xs text-slate-500">{description}</p>
                                </div>
                            </DropdownMenuItem>
                         ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </main>
        </div>
    );
}