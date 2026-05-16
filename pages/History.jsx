import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AICommand } from '@/lib/entities';
import { User } from '@/lib/entities';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Loader2,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  Play,
  Trash2,
  FileText,
  Download,
  AlertCircle,
  History as HistoryIcon,
  RotateCcw,
  Zap,
  GitBranch,
  Terminal
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import CommandDetailsModal from '../components/history/CommandDetailsModal';
import { minutesForCommand, calculateTotalMinutesSaved, formatTimeSaved } from '@/lib/timeEstimation';
import { handleAuthError } from '@/utils/authHelpers';
import { useConfirmDialog, ConfirmDialog } from '@/hooks/useConfirmDialog';
import { NoDataEmptyState, NoResultsEmptyState } from '../components/common/EmptyState';
import { executeCommand } from '@/lib/supabaseFunctions';

// Helper function to format command log messages
const formatCommandLogMessage = (command) => {
  const actionType = command.actions_planned?.[0]?.action_type || 'Custom Command';
  const successCount = command.results?.success_count || 0;

  switch (actionType) {
    case 'SEO Update':
      return `Optimized SEO for ${successCount} products`;
    case 'Price Update':
      return `Updated prices for ${successCount} items`;
    case 'Description Update':
      return `Updated descriptions for ${successCount} products`;
    case 'Inventory Scan':
      return `Scanned inventory, found ${command.results?.details?.length || 0} low-stock items`;
    case 'Create Listing':
      return `Created 1 new product listing`;
    case 'CTA Update':
      return `Added CTAs to ${successCount} products`;
    default:
      return command.command_text?.substring(0, 80) || 'Command executed';
  }
};

export default function History() {
  const [commands, setCommands] = useState([]);
  const [filteredCommands, setFilteredCommands] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedCommand, setSelectedCommand] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('command');
  const [sortBy, setSortBy] = useState('newest');
  const [undoingCommand, setUndoingCommand] = useState(null);
  const [trackingStartDates, setTrackingStartDates] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('timeSaved_trackingStartDates') || '{}');
    } catch {
      return {};
    }
  });
  const navigate = useNavigate();
  const { isOpen, config, confirm, cancel } = useConfirmDialog();

  // Memoize beta access check
  const hasBetaAccess = useMemo(() => {
    return currentUser && currentUser.user_mode === 'beta';
  }, [currentUser]);

  // Load commands and user data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [user, commandsData] = await Promise.all([
        User.me(),
        AICommand.list('-created_at', 100).catch(err => {
          console.error('Error fetching commands:', err);
          return [];
        })
      ]);

      setCurrentUser(user);
      
      // Filter valid commands
      const validCommands = commandsData.filter(c => 
        c && typeof c === 'object' && c.id
      );
      
      setCommands(validCommands);
      setFilteredCommands(validCommands);
    } catch (error) {
      console.error('Failed to load command history:', error);
      
      if (handleAuthError(error, navigate, { showToast: true })) {
        return;
      }
      
      toast.error("Failed to load command history", {
        description: "Please try refreshing the page."
      });
      
      setCommands([]);
      setFilteredCommands([]);
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Apply filters and search
  useEffect(() => {
    let result = [...commands];

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(cmd => cmd.status === statusFilter);
    }

    // Apply source/type filter
    if (sourceFilter !== 'all') {
      result = result.filter(cmd => (cmd.source || 'command') === sourceFilter);
    }

    // Apply platform filter
    if (platformFilter !== 'all') {
      result = result.filter(cmd => {
        const targets = (cmd.platform_targets || []).map(p => p.toLowerCase());
        return targets.includes(platformFilter);
      });
    }

    // Apply search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(cmd =>
        cmd.command_text?.toLowerCase().includes(term) ||
        cmd.ai_interpretation?.toLowerCase().includes(term)
      );
    }

    // Apply sorting
    switch (sortBy) {
      case 'newest':
        result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        break;
      case 'oldest':
        result.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        break;
      case 'status':
        result.sort((a, b) => {
          const statusOrder = { completed: 0, failed: 1, executing: 2, pending: 3 };
          return (statusOrder[a.status] || 999) - (statusOrder[b.status] || 999);
        });
        break;
    }

    setFilteredCommands(result);
  }, [commands, searchTerm, statusFilter, sourceFilter, platformFilter, sortBy]);

  // Handle command deletion with confirmation
  const handleDelete = useCallback(async (command) => {
    await confirm({
      title: 'Delete Command?',
      description: `Permanently remove "${command.command_text?.substring(0, 50)}..." from your history?`,
      confirmText: 'Delete',
      variant: 'destructive',
      onConfirm: async () => {
        try {
          await AICommand.delete(command.id);
          toast.success("Command deleted");
          loadData();
        } catch (error) {
          console.error('Delete error:', error);
          
          if (handleAuthError(error, navigate)) {
            return;
          }
          
          toast.error("Failed to delete command", {
            description: "Please try again."
          });
        }
      }
    });
  }, [confirm, navigate, loadData]);

  // Handle undoing a completed price adjustment command
  const handleUndo = useCallback(async (command) => {
    const actions = command.actions_planned;
    const priceActions = (actions || []).filter(
      a => a.type === 'update_products' && a.parameters?.price_adjustment !== undefined
    );

    if (priceActions.length === 0) {
      toast.error("Cannot undo this command", {
        description: "Only price adjustment commands can be automatically undone."
      });
      return;
    }

    const confirmed = await confirm({
      title: 'Undo Command?',
      description: `This will reverse the price change from "${command.command_text?.substring(0, 60)}". Continue?`,
      confirmText: 'Undo',
      variant: 'destructive',
    });

    if (!confirmed) return;

    setUndoingCommand(command.id);
    try {
      const inverseActions = priceActions.map(a => ({
        type: 'update_products',
        parameters: {
          ...a.parameters,
          price_adjustment: -(a.parameters.price_adjustment),
        },
      }));

      await executeCommand(null, inverseActions, command.platform_targets || []);
      await AICommand.update(command.id, { status: 'undone' });
      toast.success("Command undone successfully");
      loadData();
    } catch (error) {
      toast.error("Failed to undo command", { description: error.message });
    } finally {
      setUndoingCommand(null);
    }
  }, [confirm, loadData]);

  // Handle running command again
  const handleRunAgain = useCallback((command) => {
    navigate(createPageUrl('Commands?prompt=' + encodeURIComponent(command.command_text)));
  }, [navigate]);

  // Export history as CSV
  const handleExport = useCallback(() => {
    try {
      const csvContent = [
        ['Date', 'Command', 'Status', 'Success Count', 'Failure Count', 'Execution Time'].join(','),
        ...filteredCommands.map(cmd => [
          format(new Date(cmd.created_at), 'yyyy-MM-dd HH:mm:ss'),
          `"${cmd.command_text?.replace(/"/g, '""')}"`,
          cmd.status,
          cmd.results?.success_count || 0,
          cmd.results?.failure_count || 0,
          cmd.execution_time || 0
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `command-history-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success("History exported");
    } catch (error) {
      console.error('Export error:', error);
      toast.error("Export failed", {
        description: "Could not export history."
      });
    }
  }, [filteredCommands]);

  // Derive unique platforms from command history
  const availablePlatforms = useMemo(() => {
    const platforms = new Set();
    commands.forEach(c => {
      (c.platform_targets || []).forEach(p => {
        if (p) platforms.add(p.toLowerCase());
      });
    });
    return Array.from(platforms).sort();
  }, [commands]);

  // Reset tracking start date for a given platform
  const handleResetTracking = useCallback((platform) => {
    const key = platform === 'all' ? '__all__' : platform;
    const updated = { ...trackingStartDates, [key]: new Date().toISOString() };
    setTrackingStartDates(updated);
    localStorage.setItem('timeSaved_trackingStartDates', JSON.stringify(updated));
    toast.success(`Time saved tracking reset${platform !== 'all' ? ` for ${platform}` : ''}`);
  }, [trackingStartDates]);

  // Statistics
  const stats = useMemo(() => {
    const trackingKey = platformFilter === 'all' ? '__all__' : platformFilter;
    const trackingStart = trackingStartDates[trackingKey]
      ? new Date(trackingStartDates[trackingKey])
      : null;

    const completedCommands = commands.filter(c => {
      if (c.status !== 'completed') return false;
      if (trackingStart && new Date(c.created_at) < trackingStart) return false;
      if (platformFilter !== 'all') {
        const targets = (c.platform_targets || []).map(p => p.toLowerCase());
        if (!targets.includes(platformFilter)) return false;
      }
      return true;
    });

    return {
      total: commands.length,
      completed: commands.filter(c => c.status === 'completed').length,
      failed: commands.filter(c => c.status === 'failed').length,
      totalSuccessful: commands.reduce((sum, c) => sum + (c.results?.success_count || 0), 0),
      avgExecutionTime: commands.length > 0
        ? (commands.reduce((sum, c) => sum + (c.execution_time || 0), 0) / commands.length).toFixed(1)
        : 0,
      timeSaved: formatTimeSaved(calculateTotalMinutesSaved(completedCommands)),
      trackingStart,
    };
  }, [commands, platformFilter, trackingStartDates]);

  // Get source type badge
  const getSourceBadge = (source) => {
    const cfg = {
      orion:    { label: 'Orion Action', icon: Zap,       color: 'bg-violet-100 text-violet-800 border-violet-200' },
      workflow: { label: 'Workflow',     icon: GitBranch,  color: 'bg-blue-100 text-blue-800 border-blue-200' },
      command:  { label: 'Command',      icon: Terminal,   color: 'bg-slate-100 text-slate-700 border-slate-200' },
    }[source || 'command'] || { label: 'Command', icon: Terminal, color: 'bg-slate-100 text-slate-700 border-slate-200' };
    const Icon = cfg.icon;
    return (
      <Badge className={`${cfg.color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {cfg.label}
      </Badge>
    );
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const config = {
      completed: { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
      failed: { color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
      executing: { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Loader2 },
      pending: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
      undone: { color: 'bg-orange-100 text-orange-700 border-orange-200', icon: RotateCcw },
    }[status] || { color: 'bg-slate-100 text-slate-800 border-slate-200', icon: AlertCircle };

    const Icon = config.icon;

    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {status}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-slate-600">Loading activity history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Total Activities</p>
            <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Completed</p>
            <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Failed</p>
            <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Items Processed</p>
            <p className="text-2xl font-bold text-blue-600">{stats.totalSuccessful}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Avg Time (s)</p>
            <p className="text-2xl font-bold text-slate-900">{stats.avgExecutionTime}</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50 col-span-2 sm:col-span-1">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-emerald-600 font-medium">Time Saved</p>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-emerald-500 hover:text-emerald-700"
                onClick={() => handleResetTracking(platformFilter)}
                title="Reset tracking start date"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Reset
              </Button>
            </div>
            <p className="text-2xl font-bold text-emerald-700">{stats.timeSaved}</p>
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="h-7 text-xs border-emerald-200 bg-white">
                <SelectValue placeholder="All platforms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All platforms</SelectItem>
                {availablePlatforms.map(p => (
                  <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {stats.trackingStart && (
              <p className="text-xs text-emerald-400">
                Since {format(stats.trackingStart, 'MMM d, h:mm a')}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <HistoryIcon className="w-6 h-6 text-emerald-600" />
              Activity History
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={filteredCommands.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
            <div className="relative sm:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search history..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="command">Commands</SelectItem>
                <SelectItem value="orion">Orion Actions</SelectItem>
                <SelectItem value="workflow">Workflows</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="executing">Executing</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="status">By Status</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Command List */}
          {filteredCommands.length === 0 ? (
            commands.length === 0 ? (
              <NoDataEmptyState
                entityName="Commands"
                onCreate={() => navigate(createPageUrl('Commands'))}
              />
            ) : (
              <NoResultsEmptyState
                onClear={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setSourceFilter('all');
                  setPlatformFilter('all');
                }}
              />
            )
          ) : (
            <div className="space-y-3">
              {filteredCommands.map((command) => (
                <div
                  key={command.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border hover:bg-slate-100 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {getStatusBadge(command.status)}
                      {getSourceBadge(command.source)}
                      <span className="text-xs text-slate-500">
                        {format(new Date(command.created_at), 'MMM d, yyyy HH:mm')}
                      </span>
                      {command.is_demo_data && (
                        <Badge variant="outline" className="text-xs">Demo</Badge>
                      )}
                    </div>
                    <p className="text-sm font-medium text-slate-900 mb-1">
                      {command.source === 'orion' || command.source === 'workflow'
                        ? (command.command_text || 'Orion action')
                        : formatCommandLogMessage(command)}
                    </p>
                    {command.results && (
                      <p className="text-xs text-slate-500">
                        {command.results.success_count || 0} succeeded, {command.results.failure_count || 0} failed
                        {command.execution_time && ` • ${command.execution_time}s`}
                        {command.status === 'completed' && (
                          <span className="ml-2 text-emerald-500 font-medium">
                            ~{formatTimeSaved(minutesForCommand(command))} saved
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedCommand(command)}
                      title="View Details"
                    >
                      <FileText className="w-4 h-4" />
                    </Button>
                    {command.status === 'completed' && (command.source || 'command') === 'command' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUndo(command)}
                        disabled={undoingCommand === command.id}
                        title="Undo"
                        className="text-orange-500 hover:text-orange-700 hover:bg-orange-50"
                      >
                        {undoingCommand === command.id
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <RotateCcw className="w-4 h-4" />
                        }
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRunAgain(command)}
                      title="Run Again"
                    >
                      <Play className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(command)}
                      className="text-red-500 hover:text-red-700"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Command Details Modal */}
      {selectedCommand && (
        <CommandDetailsModal
          command={selectedCommand}
          onClose={() => setSelectedCommand(null)}
          onCommandUpdate={loadData}
        />
      )}

      <ConfirmDialog isOpen={isOpen} config={config} onCancel={cancel} />
    </div>
  );
}