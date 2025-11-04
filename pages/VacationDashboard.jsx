import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User } from '@/api/entities';
import { AICommand } from '@/api/entities';
import { SmartAlert } from '@/api/entities';
import { InventoryItem } from '@/api/entities';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plane, 
  Shield, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  Clock,
  Mail,
  ArrowRight,
  Pause,
  Play,
  Settings,
  Loader2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { handleAuthError } from '../components/utils/authHelpers';
import { useConfirmDialog, ConfirmDialog } from '../components/hooks/useConfirmDialog';
import { NoDataEmptyState } from '../components/common/EmptyState';

export default function VacationDashboard() {
  const [user, setUser] = useState(null);
  const [recentActions, setRecentActions] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const navigate = useNavigate();
  const { isOpen, config, confirm, cancel } = useConfirmDialog();

  // Memoize beta access check
  const hasBetaAccess = useMemo(() => {
    return user && user.user_mode === 'beta';
  }, [user]);

  // Calculate vacation stats
  const vacationStats = useMemo(() => {
    if (!user || !recentActions) return {
      daysActive: 0,
      actionsToday: 0,
      totalActions: 0,
      alertsHandled: 0
    };

    const daysActive = user.vacation_mode_enabled 
      ? Math.floor((Date.now() - new Date(user.updated_date)) / (1000 * 60 * 60 * 24))
      : 0;

    const actionsToday = recentActions.filter(a => {
      const today = new Date();
      const actionDate = new Date(a.created_date);
      return actionDate.toDateString() === today.toDateString();
    }).length;

    const alertsHandled = recentActions.filter(a => a.status === 'completed').length;

    return {
      daysActive,
      actionsToday,
      totalActions: recentActions.length,
      alertsHandled
    };
  }, [user, recentActions]);

  // Load all data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [userData, commandsData, alertsData, inventoryData] = await Promise.all([
        User.me(),
        AICommand.filter({ vacation_mode: true }, '-created_date', 10).catch(err => {
          console.error('Error fetching commands:', err);
          return [];
        }),
        SmartAlert.list('-created_date', 5).catch(err => {
          console.error('Error fetching alerts:', err);
          return [];
        }),
        InventoryItem.filter({ status: 'low_stock' }).catch(err => {
          console.error('Error fetching inventory:', err);
          return [];
        })
      ]);
      
      // Filter out invalid data
      const validCommands = commandsData.filter(c => 
        c && typeof c === 'object' && c.id
      );
      const validAlerts = alertsData.filter(a => 
        a && typeof a === 'object' && a.id
      );
      const validInventory = inventoryData.filter(i => 
        i && typeof i === 'object' && i.id
      );

      setUser(userData);
      setRecentActions(validCommands);
      setAlerts(validAlerts);
      setInventory(validInventory);
    } catch (error) {
      console.error('Failed to load vacation dashboard data:', error);
      
      if (handleAuthError(error, navigate, { showToast: true })) {
        return;
      }

      toast.error("Failed to load vacation dashboard", {
        description: "Please try refreshing the page."
      });
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle vacation mode toggle with confirmation
  const handleToggleVacationMode = useCallback(async () => {
    if (!user) return;

    const isEnabling = !user.vacation_mode_enabled;
    
    await confirm({
      title: isEnabling ? 'Enable Vacation Mode?' : 'Disable Vacation Mode?',
      description: isEnabling 
        ? 'AI will start taking autonomous actions to manage your business while you\'re away. You can monitor all actions here and disable at any time.'
        : 'AI will stop taking autonomous actions. Your business will return to normal manual operation.',
      confirmText: isEnabling ? 'Enable' : 'Disable',
      variant: isEnabling ? 'default' : 'destructive',
      onConfirm: async () => {
        setIsToggling(true);
        try {
          await User.updateMyUserData({ vacation_mode_enabled: isEnabling });
          setUser({ ...user, vacation_mode_enabled: isEnabling });
          toast.success(
            isEnabling 
              ? 'Vacation Mode enabled - AI is now managing your business'
              : 'Vacation Mode disabled - You\'re back in control'
          );
        } catch (error) {
          console.error('Failed to toggle vacation mode:', error);
          
          if (handleAuthError(error, navigate)) {
            return;
          }

          toast.error("Failed to toggle vacation mode", {
            description: "Please try again."
          });
        } finally {
          setIsToggling(false);
        }
      }
    });
  }, [user, confirm, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
          <p className="text-lg font-medium text-slate-600">Loading vacation dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardContent className="p-6">
            <NoDataEmptyState
              entityName="User Data"
              onCreate={() => window.location.reload()}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-100">
                <Plane className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">AI Vacation Dashboard</h1>
                <p className="text-slate-600">Monitor your business while you're away</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Badge className={user.vacation_mode_enabled ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'}>
                {user.vacation_mode_enabled ? 'Active' : 'Inactive'}
              </Badge>
              <Button
                onClick={handleToggleVacationMode}
                disabled={isToggling}
                variant={user.vacation_mode_enabled ? 'outline' : 'default'}
                className="gap-2 flex-1 sm:flex-none"
              >
                {isToggling ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {user.vacation_mode_enabled ? 'Pausing...' : 'Activating...'}
                  </>
                ) : (
                  <>
                    {user.vacation_mode_enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    {user.vacation_mode_enabled ? 'Pause' : 'Activate'} Mode
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigate(createPageUrl('Settings'))}
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {!user.vacation_mode_enabled && (
            <Alert className="mb-8 border-blue-200 bg-blue-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Vacation Mode is currently inactive. Your business is operating normally, and AI is not taking autonomous actions.
                <Button variant="link" className="p-0 ml-2 text-blue-600" onClick={handleToggleVacationMode}>
                  Enable Vacation Mode
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-white/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-green-100">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{vacationStats.daysActive}</p>
                    <p className="text-sm text-slate-600">Days Active</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-blue-100">
                    <Activity className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{vacationStats.actionsToday}</p>
                    <p className="text-sm text-slate-600">Actions Today</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-indigo-100">
                    <Shield className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{vacationStats.totalActions}</p>
                    <p className="text-sm text-slate-600">Total Actions</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-orange-100">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{alerts.length}</p>
                    <p className="text-sm text-slate-600">Active Alerts</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Recent AI Actions */}
            <div className="lg:col-span-2">
              <Card className="bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-600" />
                    Recent AI Actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {recentActions.length > 0 ? (
                    <div className="space-y-4">
                      {recentActions.slice(0, 6).map((action, index) => (
                        <motion.div
                          key={action.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200"
                        >
                          <div className="mt-1">
                            {action.status === 'completed' ? (
                              <CheckCircle2 className="w-5 h-5 text-green-600" />
                            ) : action.status === 'failed' ? (
                              <AlertTriangle className="w-5 h-5 text-red-600" />
                            ) : (
                              <Clock className="w-5 h-5 text-orange-600" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-slate-900">{action.command_text}</p>
                            <p className="text-sm text-slate-600 mt-1">
                              {new Date(action.created_date).toLocaleString()}
                            </p>
                            {action.results && (
                              <p className="text-sm text-green-600 mt-1">
                                ✓ {action.results.success_count} items processed successfully
                              </p>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <NoDataEmptyState
                      entityName="AI Actions"
                      onCreate={() => {}}
                    />
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Sidebar */}
            <div className="space-y-6">
              {/* Active Alerts */}
              <Card className="bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                    Active Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {alerts.length > 0 ? (
                    <div className="space-y-3">
                      {alerts.slice(0, 3).map((alert) => (
                        <div key={alert.id} className="p-3 rounded-lg bg-orange-50 border border-orange-200">
                          <p className="font-medium text-orange-900 text-sm">{alert.title}</p>
                          <p className="text-xs text-orange-700 mt-1">{alert.message}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-sm">No active alerts</p>
                  )}
                </CardContent>
              </Card>

              {/* Low Stock Items */}
              <Card className="bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    Low Stock Monitoring
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {inventory.length > 0 ? (
                    <div className="space-y-3">
                      {inventory.slice(0, 3).map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-2 rounded bg-red-50 border border-red-200">
                          <div>
                            <p className="font-medium text-red-900 text-sm">{item.product_name}</p>
                            <p className="text-xs text-red-700">Stock: {item.total_stock}</p>
                          </div>
                          <Badge variant="outline" className="text-red-600 border-red-300">
                            Low
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-sm">All inventory levels are healthy</p>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-sm">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" className="w-full justify-start text-sm" disabled>
                    <Mail className="w-4 h-4 mr-2" />
                    Send Status Email (Coming Soon)
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-sm"
                    onClick={() => navigate(createPageUrl('Commands'))}
                  >
                    <ArrowRight className="w-4 h-4 mr-2" />
                    Override AI Action
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-sm"
                    onClick={() => navigate(createPageUrl('Settings'))}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Adjust Settings
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog isOpen={isOpen} config={config} onCancel={cancel} />
    </>
  );
}