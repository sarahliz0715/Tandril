import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Zap,
    Plus,
    Trash2,
    Settings,
    ArrowRight,
    Play,
    Save,
    AlertCircle,
    CheckCircle,
    Clock,
    Mail,
    Bell,
    Package,
    DollarSign,
    RefreshCw,
    Webhook,
    MessageSquare,
    FileText,
    ShoppingCart
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ACTION_ICONS = {
    send_email: Mail,
    send_alert: Bell,
    update_inventory: Package,
    update_price: DollarSign,
    sync_platform: RefreshCw,
    run_command: Zap,
    run_ai_command: Zap,
    webhook: Webhook,
    wait: Clock,
    send_sms: MessageSquare,
    create_order: ShoppingCart,
    update_product: Package,
    generate_report: FileText,
    conditional_branch: AlertCircle
};

const TRIGGER_ICONS = {
    inventory_low: Package,
    inventory_out_of_stock: AlertCircle,
    order_placed: ShoppingCart,
    order_shipped: ShoppingCart,
    schedule: Clock,
    custom_event: Zap,
    revenue_milestone: DollarSign,
    sale_threshold: DollarSign
};

export default function VisualWorkflowEditor({ automation, onUpdate }) {
    const [nodes, setNodes] = useState([]);
    const [selectedNode, setSelectedNode] = useState(null);
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        if (automation) {
            // Convert automation to visual nodes
            const visualNodes = convertAutomationToNodes(automation);
            setNodes(visualNodes);
        } else {
            // Start with trigger node
            setNodes([{
                id: 'trigger',
                type: 'trigger',
                data: { trigger_type: null },
                position: { x: 50, y: 100 }
            }]);
        }
    }, [automation]);

    const convertAutomationToNodes = (automation) => {
        const visualNodes = [];
        
        // Trigger node
        visualNodes.push({
            id: 'trigger',
            type: 'trigger',
            data: automation.trigger_id ? { trigger_type: 'loaded' } : {},
            position: { x: 50, y: 100 }
        });

        // Action nodes
        if (automation.action_chain) {
            automation.action_chain.forEach((actionConfig, index) => {
                visualNodes.push({
                    id: `action-${index}`,
                    type: 'action',
                    data: actionConfig,
                    position: { x: 50 + (index + 1) * 250, y: 100 }
                });
            });
        }

        return visualNodes;
    };

    const handleAddAction = () => {
        const lastNode = nodes[nodes.length - 1];
        const newNode = {
            id: `action-${Date.now()}`,
            type: 'action',
            data: { action_type: null },
            position: { 
                x: lastNode.position.x + 250, 
                y: lastNode.position.y 
            }
        };
        
        setNodes([...nodes, newNode]);
        setSelectedNode(newNode);
    };

    const handleNodeClick = (node) => {
        setSelectedNode(node);
    };

    const handleNodeUpdate = (nodeId, updates) => {
        setNodes(nodes.map(node => 
            node.id === nodeId 
                ? { ...node, data: { ...node.data, ...updates } }
                : node
        ));
    };

    const handleNodeDelete = (nodeId) => {
        setNodes(nodes.filter(node => node.id !== nodeId));
        if (selectedNode?.id === nodeId) {
            setSelectedNode(null);
        }
    };

    const handleSave = () => {
        if (onUpdate) {
            const automationData = convertNodesToAutomation(nodes);
            onUpdate(automationData);
        }
    };

    const convertNodesToAutomation = (nodes) => {
        const triggerNode = nodes.find(n => n.type === 'trigger');
        const actionNodes = nodes.filter(n => n.type === 'action').sort((a, b) => a.position.x - b.position.x);

        return {
            trigger: triggerNode?.data,
            action_chain: actionNodes.map((node, index) => ({
                ...node.data,
                order: index
            }))
        };
    };

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
                <div className="flex items-center gap-2">
                    <Button
                        onClick={handleAddAction}
                        size="sm"
                        variant="outline"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Action
                    </Button>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                        {nodes.length} nodes
                    </Badge>
                    <Button
                        onClick={handleSave}
                        size="sm"
                        className="bg-indigo-600 hover:bg-indigo-700"
                    >
                        <Save className="w-4 h-4 mr-2" />
                        Save Workflow
                    </Button>
                </div>
            </div>

            {/* Canvas */}
            <div className="relative bg-slate-50 rounded-lg border-2 border-dashed border-slate-300 p-8 overflow-x-auto min-h-[400px]">
                <div className="relative" style={{ minWidth: nodes.length * 250 + 100 }}>
                    {/* Connection Lines */}
                    {nodes.map((node, index) => {
                        if (index === 0) return null;
                        const prevNode = nodes[index - 1];
                        return (
                            <svg
                                key={`line-${index}`}
                                className="absolute pointer-events-none"
                                style={{
                                    left: 0,
                                    top: 0,
                                    width: '100%',
                                    height: '100%',
                                    zIndex: 0
                                }}
                            >
                                <defs>
                                    <marker
                                        id="arrowhead"
                                        markerWidth="10"
                                        markerHeight="10"
                                        refX="9"
                                        refY="3"
                                        orient="auto"
                                    >
                                        <polygon
                                            points="0 0, 10 3, 0 6"
                                            fill="#94a3b8"
                                        />
                                    </marker>
                                </defs>
                                <line
                                    x1={prevNode.position.x + 120}
                                    y1={prevNode.position.y + 50}
                                    x2={node.position.x}
                                    y2={node.position.y + 50}
                                    stroke="#94a3b8"
                                    strokeWidth="2"
                                    markerEnd="url(#arrowhead)"
                                />
                            </svg>
                        );
                    })}

                    {/* Nodes */}
                    {nodes.map((node) => (
                        <WorkflowNode
                            key={node.id}
                            node={node}
                            isSelected={selectedNode?.id === node.id}
                            onClick={() => handleNodeClick(node)}
                            onUpdate={(updates) => handleNodeUpdate(node.id, updates)}
                            onDelete={() => handleNodeDelete(node.id)}
                        />
                    ))}
                </div>
            </div>

            {/* Node Editor Sidebar */}
            {selectedNode && (
                <NodeEditor
                    node={selectedNode}
                    onUpdate={(updates) => handleNodeUpdate(selectedNode.id, updates)}
                    onClose={() => setSelectedNode(null)}
                />
            )}
        </div>
    );
}

function WorkflowNode({ node, isSelected, onClick, onUpdate, onDelete }) {
    const isTrigger = node.type === 'trigger';
    const Icon = isTrigger 
        ? TRIGGER_ICONS[node.data.trigger_type] || Zap
        : ACTION_ICONS[node.data.action_type] || Zap;

    const hasConfig = isTrigger 
        ? node.data.trigger_type 
        : node.data.action_type;

    return (
        <div
            className={cn(
                "absolute transition-all duration-200 cursor-pointer",
                isSelected && "scale-105 z-10"
            )}
            style={{
                left: node.position.x,
                top: node.position.y
            }}
            onClick={onClick}
        >
            <Card className={cn(
                "w-[240px] border-2 transition-all",
                isSelected 
                    ? "border-indigo-500 shadow-lg" 
                    : "border-slate-200 hover:border-indigo-300",
                isTrigger && "bg-gradient-to-br from-purple-50 to-indigo-50"
            )}>
                <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                        <div className={cn(
                            "p-2 rounded-lg",
                            isTrigger ? "bg-purple-100" : "bg-indigo-100"
                        )}>
                            <Icon className={cn(
                                "w-5 h-5",
                                isTrigger ? "text-purple-600" : "text-indigo-600"
                            )} />
                        </div>
                        {!isTrigger && (
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete();
                                }}
                            >
                                <Trash2 className="w-3 h-3 text-red-500" />
                            </Button>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Badge variant="outline" className="text-xs">
                            {isTrigger ? 'Trigger' : 'Action'}
                        </Badge>
                        
                        {hasConfig ? (
                            <div>
                                <p className="font-semibold text-sm text-slate-900 capitalize">
                                    {isTrigger 
                                        ? node.data.trigger_type?.replace(/_/g, ' ')
                                        : node.data.action_type?.replace(/_/g, ' ')
                                    }
                                </p>
                                <p className="text-xs text-slate-500 line-clamp-2">
                                    {getNodeDescription(node)}
                                </p>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                <Settings className="w-3 h-3" />
                                Click to configure
                            </div>
                        )}

                        {hasConfig && (
                            <div className="flex items-center justify-end">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function NodeEditor({ node, onUpdate, onClose }) {
    const isTrigger = node.type === 'trigger';

    return (
        <Card className="border-2 border-indigo-200 bg-indigo-50">
            <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-slate-900">
                        Configure {isTrigger ? 'Trigger' : 'Action'}
                    </h3>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={onClose}
                    >
                        Close
                    </Button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-slate-700 block mb-2">
                            {isTrigger ? 'Trigger Type' : 'Action Type'}
                        </label>
                        <select
                            className="w-full p-2 border rounded-lg text-sm"
                            value={isTrigger ? node.data.trigger_type || '' : node.data.action_type || ''}
                            onChange={(e) => {
                                const key = isTrigger ? 'trigger_type' : 'action_type';
                                onUpdate({ [key]: e.target.value });
                            }}
                        >
                            <option value="">Select type...</option>
                            {isTrigger ? (
                                <>
                                    <option value="inventory_low">Inventory Low</option>
                                    <option value="inventory_out_of_stock">Out of Stock</option>
                                    <option value="order_placed">Order Placed</option>
                                    <option value="order_shipped">Order Shipped</option>
                                    <option value="schedule">Scheduled</option>
                                    <option value="revenue_milestone">Revenue Milestone</option>
                                    <option value="sale_threshold">Sales Threshold</option>
                                    <option value="custom_event">Custom Event</option>
                                </>
                            ) : (
                                <>
                                    <option value="send_email">Send Email</option>
                                    <option value="send_alert">Send Alert</option>
                                    <option value="send_sms">Send SMS</option>
                                    <option value="update_inventory">Update Inventory</option>
                                    <option value="update_price">Update Price</option>
                                    <option value="sync_platform">Sync Platform</option>
                                    <option value="run_ai_command">Run AI Command</option>
                                    <option value="webhook">Call Webhook</option>
                                    <option value="wait">Wait</option>
                                    <option value="generate_report">Generate Report</option>
                                </>
                            )}
                        </select>
                    </div>

                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-xs text-blue-800">
                            💡 <strong>Tip:</strong> Select a type above, then use the detailed configuration form to customize settings.
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function getNodeDescription(node) {
    if (node.type === 'trigger') {
        return 'When this event occurs...';
    }

    switch (node.data.action_type) {
        case 'send_email':
            return node.data.config?.email_subject || 'Send an email';
        case 'send_alert':
            return node.data.config?.alert_title || 'Create an alert';
        case 'wait':
            return `Wait ${node.data.config?.wait_duration_minutes || 0} minutes`;
        case 'run_ai_command':
            return node.data.config?.command_text || 'Execute AI command';
        default:
            return 'Perform action';
    }
}