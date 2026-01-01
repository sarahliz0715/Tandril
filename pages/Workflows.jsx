
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AIWorkflow } from '@/api/entities';
import { WorkflowTemplate } from '@/api/entities';
import { User } from '@/api/entities';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { api } from '@/api/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Loader2, 
  Plus, 
  Play,
  Pause,
  Sparkles,
  Info,
  Zap,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import WorkflowCard from '../components/workflows/WorkflowCard';
import WorkflowTemplateCard from '../components/workflows/WorkflowTemplateCard';
import CreateWorkflowModal from '../components/workflows/CreateWorkflowModal';
import { handleAuthError } from '@/utils/authHelpers';
import { useConfirmDialog, ConfirmDialog } from '@/hooks/useConfirmDialog';
import { NoDataEmptyState } from '../components/common/EmptyState';

export default function Workflows() {
  const [workflows, setWorkflows] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState('active');
  const navigate = useNavigate();
  const { isOpen, config, confirm, cancel } = useConfirmDialog();

  // Memoize beta access check
  const hasBetaAccess = useMemo(() => {
    return currentUser && currentUser.user_mode === 'beta';
  }, [currentUser]);

  // Filter workflows by active/inactive
  const activeWorkflows = useMemo(() => 
    workflows.filter(w => w.is_active), 
    [workflows]
  );
  
  const inactiveWorkflows = useMemo(() => 
    workflows.filter(w => !w.is_active), 
    [workflows]
  );

  // Load workflows, templates, and user data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [user, workflowsData, templatesData] = await Promise.all([
        User.me(),
        AIWorkflow.list('-created_at').catch(err => {
          console.error('Error fetching workflows:', err);
          return [];
        }),
        WorkflowTemplate.list().catch(err => {
          console.error('Error fetching templates:', err);
          return [];
        })
      ]);

      console.log('🔍 [Workflows] Raw templates data:', templatesData);
      console.log('🔍 [Workflows] Templates count:', templatesData?.length);
      console.log('🔍 [Workflows] User:', user);

      setCurrentUser(user);

      // Filter valid data
      const validWorkflows = workflowsData.filter(w =>
        w && typeof w === 'object' && w.id
      );
      const validTemplates = templatesData.filter(t =>
        t && typeof t === 'object' && t.id
      );

      console.log('🔍 [Workflows] Valid templates after filter:', validTemplates);
      console.log('🔍 [Workflows] Valid templates count:', validTemplates.length);

      setWorkflows(validWorkflows);
      setTemplates(validTemplates);
    } catch (error) {
      console.error('Failed to load workflows:', error);
      
      if (handleAuthError(error, navigate, { showToast: true })) {
        return;
      }
      
      toast.error("Failed to load workflows", {
        description: "Please try refreshing the page."
      });
      
      setWorkflows([]);
      setTemplates([]);
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle toggle workflow active state with confirmation
  const handleToggleWorkflow = useCallback(async (workflow) => {
    const isActivating = !workflow.is_active;
    
    await confirm({
      title: isActivating ? 'Activate Workflow?' : 'Pause Workflow?',
      description: isActivating 
        ? `Start running "${workflow.name}" automatically based on its trigger settings.`
        : `Pause "${workflow.name}"? It will stop running until you activate it again.`,
      confirmText: isActivating ? 'Activate' : 'Pause',
      variant: 'default',
      onConfirm: async () => {
        try {
          await AIWorkflow.update(workflow.id, { is_active: isActivating });
          toast.success(`Workflow ${isActivating ? 'activated' : 'paused'}`);
          loadData();
        } catch (error) {
          console.error('Failed to toggle workflow:', error);
          
          if (handleAuthError(error, navigate)) {
            return;
          }
          
          toast.error("Failed to update workflow", {
            description: "Please try again."
          });
        }
      }
    });
  }, [confirm, navigate, loadData]);

  // Handle delete workflow with confirmation
  const handleDeleteWorkflow = useCallback(async (workflow) => {
    await confirm({
      title: 'Delete Workflow?',
      description: `Are you sure you want to delete "${workflow.name}"? This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'destructive',
      onConfirm: async () => {
        try {
          await AIWorkflow.delete(workflow.id);
          toast.success("Workflow deleted successfully");
          loadData();
        } catch (error) {
          console.error('Failed to delete workflow:', error);
          
          if (handleAuthError(error, navigate)) {
            return;
          }
          
          toast.error("Failed to delete workflow", {
            description: "Please try again."
          });
        }
      }
    });
  }, [confirm, navigate, loadData]);

  // Handle run workflow manually
  const handleRunWorkflow = useCallback(async (workflow) => {
    toast.info("Starting workflow execution...");
    
    try {
      const { data } = await api.functions.invoke('executeWorkflow', {
        workflow_id: workflow.id
      });
      
      if (data?.success) {
        toast.success("Workflow executed successfully");
        loadData();
      } else {
        throw new Error(data?.error || 'Execution failed');
      }
    } catch (error) {
      console.error('Failed to run workflow:', error);
      
      if (handleAuthError(error, navigate)) {
        return;
      }
      
      toast.error("Failed to run workflow", {
        description: error.message
      });
    }
  }, [navigate, loadData]);

  // Handle run automation directly from template
  const handleRunAutomation = useCallback(async (template) => {
    toast.info("Running automation...");

    try {
      let result;

      // Map template names to automation functions
      if (template.name.includes('Inventory Sync') || template.name.includes('Stock Protection')) {
        result = await api.functions.runInventoryProtection({
          threshold: 0,
          action: 'unpublish'
        });

        if (result.success || result.protected_count !== undefined) {
          toast.success(`Protected ${result.protected_count || 0} products across ${result.platforms_processed || 0} stores`);
          loadData();
        }
      } else if (template.name.includes('Price Monitor') || template.name.includes('Price Guardrail')) {
        result = await api.functions.runPriceGuardrail({
          min_margin_percent: 30,
          action: 'flag',
          target_margin_percent: 35
        });

        if (result.success || result.low_margin_count !== undefined) {
          toast.success(`Checked margins - Found ${result.low_margin_count || 0} products below target`);
          loadData();
        }
      } else if (template.name.includes('SEO') || template.name.includes('seo')) {
        result = await api.functions.runSEOFixer({
          mode: 'fix',
          max_products: 50
        });

        if (result.success || result.fixed_count !== undefined) {
          toast.success(`SEO Fixed: ${result.fixed_count || 0} products optimized (${result.analyzed_count || 0} analyzed)`);
          loadData();
        }
      } else if (template.name.includes('Dead Product') || template.name.includes('Cleanup') || template.name.includes('Sales Report')) {
        result = await api.functions.runDeadProductCleanup({
          days_inactive: 90,
          action: 'flag',
          tag_name: 'Dead Product'
        });

        if (result.success || result.cleaned_count !== undefined) {
          toast.success(`Cleanup complete: ${result.cleaned_count || 0} dead products flagged (${result.dead_products_found || 0} found)`);
          loadData();
        }
      } else {
        // For other templates, use the standard workflow execution
        result = await api.functions.invoke('executeWorkflow', {
          workflow_id: template.id
        });

        if (result.success) {
          toast.success("Automation completed successfully");
          loadData();
        }
      }
    } catch (error) {
      console.error('Failed to run automation:', error);

      if (handleAuthError(error, navigate)) {
        return;
      }

      toast.error("Failed to run automation", {
        description: error.message
      });
    }
  }, [navigate, loadData]);

  // Handle create from template
  const handleUseTemplate = useCallback(async (template) => {
    try {
      const workflowData = {
        ...template.workflow_data,
        name: `${template.name} (Copy)`,
        is_active: false
      };

      await AIWorkflow.create(workflowData);
      toast.success("Workflow created from template!");
      loadData();
      setActiveTab('active');
    } catch (error) {
      console.error('Failed to create workflow from template:', error);

      if (handleAuthError(error, navigate)) {
        return;
      }

      toast.error("Failed to create workflow", {
        description: "Please try again."
      });
    }
  }, [navigate, loadData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-slate-600">Loading workflows...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Workflows</h1>
          <p className="text-slate-600 mt-1">Automate repetitive tasks with AI-powered workflows</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-2" />
          Create Workflow
        </Button>
      </div>

      {/* Beta Info */}
      {hasBetaAccess && (
        <Alert className="border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-700">
            <strong>Beta Feature:</strong> Workflows are currently in beta. They work best for Shopify automation tasks.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="active">
            Active ({activeWorkflows.length})
          </TabsTrigger>
          <TabsTrigger value="inactive">
            Paused ({inactiveWorkflows.length})
          </TabsTrigger>
          <TabsTrigger value="templates">
            Templates ({templates.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {activeWorkflows.length === 0 ? (
            <NoDataEmptyState
              entityName="Active Workflows"
              onCreate={() => setShowCreateModal(true)}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeWorkflows.map(workflow => (
                <WorkflowCard
                  key={workflow.id}
                  workflow={workflow}
                  onToggle={handleToggleWorkflow}
                  onDelete={handleDeleteWorkflow}
                  onRun={handleRunWorkflow}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="inactive" className="space-y-4">
          {inactiveWorkflows.length === 0 ? (
            <Card className="p-12">
              <div className="text-center">
                <Pause className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-600">No paused workflows</p>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {inactiveWorkflows.map(workflow => (
                <WorkflowCard
                  key={workflow.id}
                  workflow={workflow}
                  onToggle={handleToggleWorkflow}
                  onDelete={handleDeleteWorkflow}
                  onRun={handleRunWorkflow}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          {templates.length === 0 ? (
            <Card className="p-12">
              <div className="text-center">
                <Sparkles className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-600">No templates available</p>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map(template => (
                <WorkflowTemplateCard
                  key={template.id}
                  template={template}
                  onUse={handleUseTemplate}
                  onRun={handleRunAutomation}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Workflow Modal */}
      {showCreateModal && (
        <CreateWorkflowModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadData();
          }}
        />
      )}

      <ConfirmDialog isOpen={isOpen} config={config} onCancel={cancel} />
    </div>
  );
}
