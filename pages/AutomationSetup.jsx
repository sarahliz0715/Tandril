
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Workflow, Code, Save, Settings, GitBranch, TestTube, FileText, Activity, Terminal, Variable
} from 'lucide-react';
import { toast } from 'sonner';

import VisualWorkflowEditor from '../components/automations/VisualWorkflowEditor';
import TestingSandbox from '../components/automations/TestingSandbox';
import DebugConsole from '../components/automations/DebugConsole';
import WorkflowVariablesPanel from '../components/automations/WorkflowVariablesPanel';
import ConditionalBranchModal from '../components/automations/ConditionalBranchModal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Placeholder/mock for routing functions, as they are implied by the outline but not provided
const navigate = (path) => {
    console.log("Navigating to:", path);
    // In a real application, you would use a router like react-router-dom's useNavigate hook
    // Example: const navigate = useNavigate(); navigate(path);
};
const createPageUrl = (page) => `/${page}`;

// Mock for API entity system
const mockAPI = {
    entities: {
        Automation: {
            update: async (id, updates) => {
                console.log(`Mock: Updating Automation ID ${id} with:`, updates);
                return Promise.resolve({ id, ...updates });
            }
        }
    }
};


export default function AutomationSetupPage() {
    // State to manage the active tab in the editor
    const [activeTab, setActiveTab] = useState('builder'); // Changed from viewMode to activeTab, initialized to 'builder'

    // Placeholder state for the automation being created/edited
    // In a real app, this would be loaded from an API based on automationId or initialized for a new automation
    const [currentAutomation, setCurrentAutomation] = useState({
        id: null,
        name: '',
        description: '',
        trigger_id: null, // Placeholder for a selected trigger
        action_chain: [], // Array of actions in the workflow
        enabled: false,
        execution_log: [], // Added for DebugConsole
        workflow_variables: [], // New: to store workflow-specific variables
        conditional_branches: [], // New: to store conditional branches
    });
    // Placeholder for automationId, typically from URL params (e.g., from react-router-dom's useParams)
    const automationId = null; // Set to a specific ID if editing an existing automation

    const [showConditionalModal, setShowConditionalModal] = useState(false);
    const [editingCondition, setEditingCondition] = useState(null);

    // Placeholder for available actions, as used by ConditionalBranchModal
    const actions = [
        { id: 'send_email', name: 'Send Email' },
        { id: 'update_db', name: 'Update Database' },
        { id: 'call_api', name: 'Call External API' },
        { id: 'log_data', name: 'Log Data' },
        { id: 'delay', name: 'Delay' },
    ];

    // Function to handle updates from the VisualWorkflowEditor
    const handleVisualUpdate = (automationData) => {
        setCurrentAutomation(prev => ({
            ...prev,
            ...automationData
        }));
    };

    const handleUpdateAutomation = async (updates) => {
        try {
            const updated = { ...currentAutomation, ...updates };
            // In a real app, currentAutomation.id would be set after initial creation or fetched.
            // For this placeholder, we assume it's available or we'd handle creation first.
            if (currentAutomation.id) {
                await api.entities.Automation.update(currentAutomation.id, updates);
            } else {
                // If no ID, it means the automation is new and hasn't been saved yet.
                // We just update the local state. A full save would assign an ID.
                console.warn("Automation ID not found. Updates only applied to local state.");
            }
            setCurrentAutomation(updated);
            toast.success('Automation updated locally'); // Changed message as real update might not happen without ID
        } catch (error) {
            console.error('Error updating automation:', error);
            toast.error('Failed to update automation');
        }
    };

    const handleAddConditionalBranch = () => {
        setEditingCondition(null);
        setShowConditionalModal(true);
    };

    const handleSaveConditionalBranch = async (conditionData) => {
        try {
            const existingBranches = currentAutomation.conditional_branches || [];
            
            let updatedBranches;
            if (editingCondition) {
                // Update existing
                updatedBranches = existingBranches.map(b => 
                    b.id === editingCondition.id ? { ...b, ...conditionData } : b
                );
            } else {
                // Add new
                updatedBranches = [...existingBranches, {
                    id: `branch_${Date.now()}`, // Simple unique ID for new branches
                    name: `Conditional Branch ${existingBranches.length + 1}`,
                    ...conditionData,
                    order: existingBranches.length // Assign order for display/execution
                }];
            }

            await handleUpdateAutomation({ conditional_branches: updatedBranches });
            setShowConditionalModal(false);
            setEditingCondition(null);
            toast.success('Conditional branch saved successfully!');
        } catch (error) {
            console.error('Error saving conditional branch:', error);
            toast.error('Failed to save conditional branch');
        }
    };


    // Function to handle saving the automation
    const handleSave = async () => {
        if (!currentAutomation.name || !currentAutomation.trigger_id || !currentAutomation.action_chain?.length) {
            toast.error('Please complete all required fields (Name, Trigger, Actions) before saving.');
            return;
        }
        console.log('Saving automation:', currentAutomation);
        toast.info('Saving automation...');

        try {
            // In a real application, you would send this data to your backend API
            const response = await fetch('/api/automations', {
                method: automationId ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(currentAutomation),
            });

            if (response.ok) {
                const result = await response.json();
                toast.success(`Automation ${automationId ? 'updated' : 'created'} successfully!`, {
                    description: result.message || 'Your automation has been saved.',
                });
                navigate(createPageUrl('Automations')); // Redirect to automations list
            } else {
                const errorData = await response.json();
                toast.error(`Failed to save automation: ${errorData.message || 'Unknown error'}`, {
                    description: errorData.details,
                });
            }
        } catch (error) {
            toast.error('An unexpected error occurred during save.', {
                description: error.message,
            });
        }
    };


    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">
                            {automationId ? 'Edit' : 'Create'} Automation
                        </h1>
                        <p className="text-slate-600 mt-1">Build powerful workflows that run automatically</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => navigate(createPageUrl('Automations'))}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            // Disable save button if key fields are missing
                            disabled={!currentAutomation.name || !currentAutomation.trigger_id || currentAutomation.action_chain?.length === 0}
                            className="bg-indigo-600 hover:bg-indigo-700"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            Save Automation
                        </Button>
                    </div>
                </div>

                {currentAutomation && (
                    <>
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                            <TabsList>
                                <TabsTrigger value="builder">
                                    <Settings className="w-4 h-4 mr-2" />
                                    Builder
                                </TabsTrigger>
                                <TabsTrigger value="visual">
                                    <GitBranch className="w-4 h-4 mr-2" />
                                    Visual Editor
                                </TabsTrigger>
                                <TabsTrigger value="variables">
                                    <Variable className="w-4 h-4 mr-2" />
                                    Variables
                                </TabsTrigger>
                                <TabsTrigger value="testing">
                                    <TestTube className="w-4 h-4 mr-2" />
                                    Testing
                                </TabsTrigger>
                                <TabsTrigger value="logs">
                                    <FileText className="w-4 h-4 mr-2" />
                                    Execution Logs
                                </TabsTrigger>
                                <TabsTrigger value="debug">
                                    <Terminal className="w-4 h-4 mr-2" />
                                    Debug Console
                                </TabsTrigger>
                                <TabsTrigger value="monitor">
                                    <Activity className="w-4 h-4 mr-2" />
                                    Monitor
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="builder" className="mt-6">
                                {/* Placeholder for an "Advanced Builder" component.
                                    This would likely be a form-based editor or a code editor for the automation's definition. */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Advanced Automation Builder</CardTitle>
                                        <CardDescription>Directly edit the automation's JSON or code definition.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="bg-gray-800 text-white p-4 rounded-md font-mono text-sm">
                                            <pre>{JSON.stringify(currentAutomation, null, 2)}</pre>
                                        </div>
                                        <Alert className="mt-4 bg-yellow-50 border-yellow-200">
                                            <AlertDescription className="text-yellow-800">
                                                This is a placeholder for the Advanced Builder. In a full implementation, you would
                                                have an editor here to directly manipulate the automation's structure, possibly in JSON or a custom DSL.
                                            </AlertDescription>
                                        </Alert>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="visual" className="mt-6">
                                {/* The VisualWorkflowEditor component would receive the current automation state and
                                    a callback to update it. This component is assumed to exist as per the outline. */}
                                <VisualWorkflowEditor
                                    automation={currentAutomation}
                                    onUpdate={handleVisualUpdate}
                                    onAddConditionalBranch={handleAddConditionalBranch} // New prop for conditional branches
                                    onEditConditionalBranch={setEditingCondition} // New prop for editing conditional branches
                                    setShowConditionalModal={setShowConditionalModal} // New prop to control modal visibility
                                    // You might pass other props like availableTriggers, availableActions here
                                />

                                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                    <p className="text-sm text-blue-800">
                                        💡 <strong>Tip:</strong> Click on any node to configure it. Use "Add Action" to extend your workflow.
                                        Switch to Advanced Builder for detailed configuration.
                                    </p>
                                </div>
                            </TabsContent>

                            <TabsContent value="variables">
                                <WorkflowVariablesPanel 
                                    automation={currentAutomation}
                                    onUpdate={handleUpdateAutomation}
                                />
                            </TabsContent>

                            <TabsContent value="testing">
                                <TestingSandbox automation={currentAutomation} />
                            </TabsContent>

                            <TabsContent value="logs">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Execution Logs</CardTitle>
                                        <CardDescription>View historical execution logs for this automation.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <Alert className="bg-gray-50 border-gray-200">
                                            <AlertDescription className="text-gray-800">
                                                This section will display a list of past runs, their status, and details. (Placeholder)
                                            </AlertDescription>
                                        </Alert>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="debug">
                                <DebugConsole executionLogs={currentAutomation.execution_log || []} />
                            </TabsContent>

                            <TabsContent value="monitor">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Monitor</CardTitle>
                                        <CardDescription>Monitor the performance and health of this automation.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <Alert className="bg-gray-50 border-gray-200">
                                            <AlertDescription className="text-gray-800">
                                                This section will provide dashboards and metrics for automation monitoring. (Placeholder)
                                            </AlertDescription>
                                        </Alert>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>

                        {/* Conditional Branch Modal */}
                        {showConditionalModal && (
                            <ConditionalBranchModal
                                isOpen={showConditionalModal}
                                onClose={() => {
                                    setShowConditionalModal(false);
                                    setEditingCondition(null);
                                }}
                                onSave={handleSaveConditionalBranch}
                                condition={editingCondition}
                                availableActions={actions}
                                availableVariables={currentAutomation.workflow_variables || []}
                            />
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
