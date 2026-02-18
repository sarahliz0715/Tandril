import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { User } from '@/lib/entities';
import { AICommand } from '@/lib/entities';
import { Platform } from '@/lib/entities';
import { SavedCommand } from '@/lib/entities';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Loader2,
  Send,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  Info,
  Zap,
  FileUp,
  X,
  Bot,
  Briefcase,
  ChevronDown,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/apiClient';
import CommandConfirmation from '../components/commands/CommandConfirmation';
import ExecutionProgress from '../components/commands/ExecutionProgress';
import SavedCommandsPanel from '../components/commands/SavedCommandsPanel';
import FinalConfirmation from '../components/commands/FinalConfirmation';
import { handleAuthError } from '@/utils/authHelpers';
import { useConfirmDialog, ConfirmDialog } from '@/hooks/useConfirmDialog';
import { NoDataEmptyState } from '../components/common/EmptyState';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import CommandsErrorBoundary from '../components/common/CommandsErrorBoundary';

function CommandsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [commandText, setCommandText] = useState('');
  const [currentCommand, setCurrentCommand] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [platforms, setPlatforms] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const { isOpen, config, confirm, cancel } = useConfirmDialog();
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);

  // Sanitize command data to prevent crashes from malformed actions
  const sanitizeCommand = useCallback((cmd) => {
    if (!cmd) return null;
    return {
      ...cmd,
      actions_planned: Array.isArray(cmd.actions_planned)
        ? cmd.actions_planned.filter(action => action && typeof action === 'object')
        : []
    };
  }, []);

  // Get hasBetaAccess from user
  const hasBetaAccess = useMemo(() => {
    return currentUser?.beta_features_enabled === true || 
           currentUser?.beta_access === true ||
           currentUser?.role === 'admin';
  }, [currentUser]);

  // Usage limits
  const usageLimits = useMemo(() => {
    const limit = currentUser?.subscription?.plan === 'pro' ? 1000 : 50;
    const used = currentUser?.commands_used_this_month || 0;
    return {
      total: limit,
      used: used,
      remaining: Math.max(0, limit - used),
      atLimit: used >= limit
    };
  }, [currentUser]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const commandFromUrl = params.get('command');
    if (commandFromUrl) {
      setCommandText(decodeURIComponent(commandFromUrl));
    }
  }, [location]);

  const loadData = async () => {
    try {
      const [user, platformsData] = await Promise.all([
        api.auth.me(),
        api.entities.Platform.list()
      ]);

      setCurrentUser(user);
      setPlatforms(platformsData);

      if (platformsData.length > 0) {
        setSelectedPlatforms([platformsData[0].id]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      handleAuthError(error, navigate);
    }
  };

  const getSelectedPlatformObjects = useCallback(() => {
    return platforms.filter(p => selectedPlatforms.includes(p.id));
  }, [platforms, selectedPlatforms]);

  const handleSubmitCommand = async () => {
    if (!commandText.trim()) {
      toast.error('Please enter a command');
      return;
    }

    if (selectedPlatforms.length === 0) {
      toast.error('Please select at least one platform');
      return;
    }

    if (usageLimits.atLimit) {
      toast.error('You have reached your monthly command limit');
      return;
    }

    setIsProcessing(true);

    try {
      const interpretation = await api.functions.invoke('interpret-command', {
        command_text: commandText,
        platform_targets: getSelectedPlatformObjects().map(p => p.shop_name || p.platform_type),
        file_urls: attachments
      });

      if (!interpretation || !interpretation.success) {
        toast.error(interpretation.error || 'Failed to interpret command');
        setIsProcessing(false);
        return;
      }

      const command = await api.entities.AICommand.create({
        command_text: commandText,
        platform_targets: getSelectedPlatformObjects().map(p => p.shop_name || p.platform_type),
        actions_planned: interpretation.actions || [],
        status: 'interpreting',
        confidence_score: interpretation.confidence_score || 0.8
      });

      setCurrentCommand(sanitizeCommand(command));
      pollCommandStatus(command.id);

    } catch (error) {
      console.error('Error submitting command:', error);
      toast.error('Failed to submit command');
      setIsProcessing(false);
    }
  };

  const pollCommandStatus = async (commandId) => {
    const pollInterval = setInterval(async () => {
      try {
        const updated = await api.entities.AICommand.get(commandId);
        setCurrentCommand(sanitizeCommand(updated));

        if (updated.status === 'completed' || updated.status === 'failed') {
          clearInterval(pollInterval);
          setIsProcessing(false);
        }
      } catch (error) {
        console.error('Error polling command:', error);
        clearInterval(pollInterval);
        setIsProcessing(false);
      }
    }, 2000);
  };

  const handleCancelCommand = async () => {
    if (!currentCommand) return;

    const confirmed = await confirm({
      title: 'Cancel Command',
      message: 'Are you sure you want to cancel this command?',
      confirmLabel: 'Cancel Command',
      variant: 'destructive'
    });

    if (confirmed) {
      try {
        await api.entities.AICommand.update(currentCommand.id, {
          status: 'failed',
          results: { error: 'Cancelled by user' }
        });
        setCurrentCommand(null);
        setIsProcessing(false);
        toast.success('Command cancelled');
      } catch (error) {
        console.error('Error cancelling command:', error);
        toast.error('Failed to cancel command');
      }
    }
  };

  const handleUseSavedCommand = (savedCommand) => {
    setCommandText(savedCommand.command_text);
    if (savedCommand.platform_targets && savedCommand.platform_targets.length > 0) {
      const platformIds = platforms
        .filter(p => savedCommand.platform_targets.includes(p.shop_name || p.platform_type))
        .map(p => p.id);
      setSelectedPlatforms(platformIds);
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setIsUploading(true);

    try {
      const uploadPromises = files.map(async (file) => {
        const { data } = await api.functions.invoke('uploadFile', { file });
        return data.file_url;
      });

      const urls = await Promise.all(uploadPromises);
      setAttachments([...attachments, ...urls]);
      toast.success(`${files.length} file(s) uploaded`);
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('Failed to upload files');
    } finally {
      setIsUploading(false);
    }
  };

  const removeAttachment = (url) => {
    setAttachments(attachments.filter(a => a !== url));
  };

  const handleSaveAsAutomation = async () => {
    if (!currentCommand) return;

    try {
      const trigger = await api.entities.AutomationTrigger.create({
        name: `Auto: ${commandText.substring(0, 50)}`,
        trigger_type: 'schedule',
        schedule_config: {
          frequency: 'daily',
          time_of_day: '09:00'
        },
        is_active: false
      });

      const actions = [];
      const validActions = (currentCommand.actions_planned && Array.isArray(currentCommand.actions_planned))
        ? currentCommand.actions_planned.filter(a => a && typeof a === 'object')
        : [];
      for (let i = 0; i < validActions.length; i++) {
        const plannedAction = validActions[i];
        const action = await api.entities.AutomationAction.create({
          name: (plannedAction && plannedAction.title) ? plannedAction.title : `Action ${i + 1}`,
          action_type: 'run_ai_command',
          config: {
            command_text: commandText,
            platform_targets: getSelectedPlatformObjects().map(p => p.name)
          }
        });
        actions.push({
          action_id: action.id,
          order: i,
          continue_on_failure: false
        });
      }

      const automation = await api.entities.Automation.create({
        name: `Command: ${commandText.substring(0, 50)}`,
        description: `Automatically runs: ${commandText}`,
        icon: 'Bot',
        trigger_id: trigger.id,
        action_chain: actions,
        category: 'operations',
        is_active: false
      });

      toast.success('Saved as automation! Configure schedule in Automations page.');
      navigate(createPageUrl(`AutomationSetup?id=${automation.id}`));
    } catch (error) {
      console.error('Error saving as automation:', error);
      toast.error('Failed to save as automation');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {usageLimits.atLimit && (
        <Alert className="bg-red-50 border-red-200">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800">Usage Limit Reached</AlertTitle>
          <AlertDescription className="text-red-700">
            You've used all {usageLimits.total} commands this month. Upgrade to Pro for more commands.
          </AlertDescription>
        </Alert>
      )}

      {platforms.length === 0 && (
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800">Connect a Platform First</AlertTitle>
          <AlertDescription className="text-blue-700">
            Connect Shopify, Etsy, or another platform to start using AI commands.
            <Button
              variant="link"
              className="p-0 h-auto text-blue-600 ml-2"
              onClick={() => navigate(createPageUrl('Platforms'))}
            >
              Go to Platforms →
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-lg">
            <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardTitle className="flex items-center gap-3 text-xl">
                <Bot className="w-6 h-6 text-indigo-600" />
                AI Command Center
              </CardTitle>
              <p className="text-sm text-slate-600 mt-2">
                Tell Orion what you want to do with your products. Be specific for best results.
              </p>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label>Select Platforms</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      {selectedPlatforms.length === 0 ? 'Select platforms...' :
                       selectedPlatforms.length === 1 ? (platforms.find(p => p.id === selectedPlatforms[0])?.shop_name || platforms.find(p => p.id === selectedPlatforms[0])?.platform_type) :
                       `${selectedPlatforms.length} platforms selected`}
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-full">
                    <DropdownMenuLabel>Choose Platforms</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {platforms.map(platform => (
                      <DropdownMenuCheckboxItem
                        key={platform.id}
                        checked={selectedPlatforms.includes(platform.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedPlatforms([...selectedPlatforms, platform.id]);
                          } else {
                            setSelectedPlatforms(selectedPlatforms.filter(id => id !== platform.id));
                          }
                        }}
                      >
                        {platform.shop_name || platform.platform_type}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="space-y-2">
                <Label>What would you like to do?</Label>
                <Textarea
                  value={commandText}
                  onChange={(e) => setCommandText(e.target.value)}
                  placeholder="e.g., Update all mug prices to $19.99 and set descriptions to emphasize quality"
                  className="min-h-[120px] resize-none"
                  disabled={isProcessing || platforms.length === 0}
                />
              </div>

              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {attachments.map((url, index) => (
                    <Badge key={index} variant="secondary" className="gap-2">
                      Attachment {index + 1}
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() => removeAttachment(url)}
                      />
                    </Badge>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => document.getElementById('file-upload').click()}
                  disabled={isUploading || isProcessing}
                >
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <FileUp className="w-4 h-4 mr-2" />
                  )}
                  Attach File
                </Button>
                <input
                  id="file-upload"
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>

              <Button
                onClick={handleSubmitCommand}
                disabled={isProcessing || !commandText.trim() || selectedPlatforms.length === 0 || usageLimits.atLimit || platforms.length === 0}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-6 text-lg font-semibold"
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                    Processing Command...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5 mr-3" />
                    Execute Command
                  </>
                )}
              </Button>

              {currentCommand && currentCommand.status === 'completed' && (
                <Button
                  onClick={handleSaveAsAutomation}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  <RefreshCw className="w-5 h-5 mr-3" />
                  Save as Recurring Automation
                </Button>
              )}

              <div className="text-center text-xs text-slate-500">
                {usageLimits.remaining} of {usageLimits.total} commands remaining this month
              </div>
            </CardContent>
          </Card>

          {currentCommand && (
            <ExecutionProgress
              command={currentCommand}
              onCancel={handleCancelCommand}
            />
          )}
        </div>

        <div className="lg:col-span-1">
          <SavedCommandsPanel onUseCommand={handleUseSavedCommand} />
        </div>
      </div>

      <ConfirmDialog
        isOpen={isOpen}
        config={config}
        onCancel={cancel}
      />
    </div>
  );
}

export default function Commands() {
  return (
    <CommandsErrorBoundary>
      <CommandsPage />
    </CommandsErrorBoundary>
  );
}