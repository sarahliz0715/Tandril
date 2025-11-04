import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SmartAlert } from '@/api/entities';
import { CustomerMessage } from '@/api/entities';
import { User } from '@/api/entities';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Loader2, 
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  Info,
  Search,
  Filter,
  Inbox as InboxIcon,
  Bell
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import MessageCard from '../components/inbox/MessageCard';
import SmartAlertsPanel from '../components/alerts/SmartAlertsPanel';
import { handleAuthError } from '../components/utils/authHelpers';
import { useConfirmDialog, ConfirmDialog } from '../components/hooks/useConfirmDialog';
import { NoDataEmptyState, NoResultsEmptyState } from '../components/common/EmptyState';

export default function Inbox() {
  const [alerts, setAlerts] = useState([]);
  const [messages, setMessages] = useState([]);
  const [filteredAlerts, setFilteredAlerts] = useState([]);
  const [filteredMessages, setFilteredMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('alerts');
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showDismissed, setShowDismissed] = useState(false);
  const navigate = useNavigate();
  const { isOpen, config, confirm, cancel } = useConfirmDialog();

  // Memoize beta access check
  const hasBetaAccess = useMemo(() => {
    return currentUser && currentUser.user_mode === 'beta';
  }, [currentUser]);

  // Extract unique categories
  const categories = useMemo(() => {
    const cats = new Set(alerts.map(alert => alert.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [alerts]);

  // Load inbox data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [user, alertsData, messagesData] = await Promise.all([
        User.me(),
        SmartAlert.list('-created_date', 100).catch(err => {
          console.error('Error fetching alerts:', err);
          return [];
        }),
        CustomerMessage.list('-created_date', 50).catch(err => {
          console.error('Error fetching messages:', err);
          return [];
        })
      ]);

      setCurrentUser(user);
      
      // Filter valid data
      const validAlerts = alertsData.filter(a => 
        a && typeof a === 'object' && a.id
      );
      const validMessages = messagesData.filter(m => 
        m && typeof m === 'object' && m.id
      );
      
      setAlerts(validAlerts);
      setMessages(validMessages);
      setFilteredAlerts(validAlerts);
      setFilteredMessages(validMessages);
    } catch (error) {
      console.error('Failed to load inbox:', error);
      
      if (handleAuthError(error, navigate, { showToast: true })) {
        return;
      }
      
      toast.error("Failed to load inbox", {
        description: "Please try refreshing the page."
      });
      
      setAlerts([]);
      setMessages([]);
      setFilteredAlerts([]);
      setFilteredMessages([]);
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Apply filters to alerts
  useEffect(() => {
    let result = [...alerts];

    // Filter out dismissed unless showDismissed is true
    if (!showDismissed) {
      result = result.filter(alert => !alert.is_dismissed);
    }

    // Apply search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(alert => 
        alert.title?.toLowerCase().includes(term) ||
        alert.message?.toLowerCase().includes(term)
      );
    }

    // Apply priority filter
    if (priorityFilter !== 'all') {
      result = result.filter(alert => alert.priority === priorityFilter);
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      result = result.filter(alert => alert.category === categoryFilter);
    }

    setFilteredAlerts(result);
  }, [alerts, searchTerm, priorityFilter, categoryFilter, showDismissed]);

  // Apply filters to messages
  useEffect(() => {
    let result = [...messages];

    // Apply search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(msg => 
        msg.customer_name?.toLowerCase().includes(term) ||
        msg.customer_email?.toLowerCase().includes(term) ||
        msg.original_message?.toLowerCase().includes(term)
      );
    }

    setFilteredMessages(result);
  }, [messages, searchTerm]);

  // Calculate inbox stats
  const stats = useMemo(() => {
    const unreadAlerts = alerts.filter(a => !a.is_read && !a.is_dismissed).length;
    const urgentAlerts = alerts.filter(a => a.priority === 'urgent' && !a.is_dismissed).length;
    const unreadMessages = messages.filter(m => m.status === 'new').length;
    
    return {
      unreadAlerts,
      urgentAlerts,
      unreadMessages,
      totalAlerts: alerts.length,
      totalMessages: messages.length
    };
  }, [alerts, messages]);

  // Handle alert dismiss
  const handleDismissAlert = useCallback(async (alertId) => {
    try {
      await SmartAlert.update(alertId, { is_dismissed: true });
      setAlerts(prev => prev.map(a => 
        a.id === alertId ? { ...a, is_dismissed: true } : a
      ));
      toast.success("Alert dismissed");
    } catch (error) {
      console.error('Failed to dismiss alert:', error);
      
      if (handleAuthError(error, navigate)) {
        return;
      }
      
      toast.error("Failed to dismiss alert");
    }
  }, [navigate]);

  // Handle mark alert as read
  const handleMarkAlertRead = useCallback(async (alertId) => {
    try {
      await SmartAlert.update(alertId, { is_read: true });
      setAlerts(prev => prev.map(a => 
        a.id === alertId ? { ...a, is_read: true } : a
      ));
    } catch (error) {
      console.error('Failed to mark alert as read:', error);
      
      if (handleAuthError(error, navigate)) {
        return;
      }
    }
  }, [navigate]);

  // Handle dismiss all alerts
  const handleDismissAll = useCallback(async () => {
    await confirm({
      title: 'Dismiss All Alerts?',
      description: 'This will mark all current alerts as dismissed. You can still view them by toggling "Show Dismissed".',
      confirmText: 'Dismiss All',
      variant: 'default',
      onConfirm: async () => {
        try {
          const updatePromises = filteredAlerts
            .filter(a => !a.is_dismissed)
            .map(a => SmartAlert.update(a.id, { is_dismissed: true }));
          
          await Promise.all(updatePromises);
          
          setAlerts(prev => prev.map(a => ({ ...a, is_dismissed: true })));
          toast.success(`Dismissed ${updatePromises.length} alerts`);
        } catch (error) {
          console.error('Failed to dismiss all alerts:', error);
          
          if (handleAuthError(error, navigate)) {
            return;
          }
          
          toast.error("Failed to dismiss alerts");
        }
      }
    });
  }, [filteredAlerts, confirm, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-slate-600">Loading inbox...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <InboxIcon className="w-8 h-8 text-indigo-600" />
            Inbox
          </h1>
          <p className="text-slate-600 mt-2">
            Stay on top of important alerts and customer messages
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Unread Alerts</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.unreadAlerts}</p>
                </div>
                <Bell className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Urgent</p>
                  <p className="text-2xl font-bold text-red-600">{stats.urgentAlerts}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">New Messages</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.unreadMessages}</p>
                </div>
                <MessageSquare className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Total Items</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {stats.totalAlerts + stats.totalMessages}
                  </p>
                </div>
                <InboxIcon className="w-8 h-8 text-indigo-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search alerts and messages..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {activeTab === 'alerts' && (
                <>
                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map(cat => (
                        <SelectItem key={cat} value={cat} className="capitalize">
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    onClick={() => setShowDismissed(!showDismissed)}
                    className="whitespace-nowrap"
                  >
                    {showDismissed ? 'Hide' : 'Show'} Dismissed
                  </Button>

                  {filteredAlerts.some(a => !a.is_dismissed) && (
                    <Button
                      variant="outline"
                      onClick={handleDismissAll}
                      className="whitespace-nowrap"
                    >
                      Dismiss All
                    </Button>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="alerts" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Alerts ({stats.unreadAlerts})
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Messages ({stats.unreadMessages})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="alerts">
            {filteredAlerts.length > 0 ? (
              <SmartAlertsPanel
                alerts={filteredAlerts}
                onDismiss={handleDismissAlert}
                onMarkRead={handleMarkAlertRead}
                onReload={loadData}
              />
            ) : alerts.length > 0 ? (
              <NoResultsEmptyState onClear={() => {
                setSearchTerm('');
                setPriorityFilter('all');
                setCategoryFilter('all');
              }} />
            ) : (
              <NoDataEmptyState
                entityName="Alerts"
                onCreate={() => navigate(createPageUrl('Dashboard'))}
              />
            )}
          </TabsContent>

          <TabsContent value="messages">
            {filteredMessages.length > 0 ? (
              <div className="space-y-4">
                {filteredMessages.map(message => (
                  <MessageCard
                    key={message.id}
                    message={message}
                    onReload={loadData}
                  />
                ))}
              </div>
            ) : messages.length > 0 ? (
              <NoResultsEmptyState onClear={() => setSearchTerm('')} />
            ) : (
              <NoDataEmptyState
                entityName="Messages"
                onCreate={() => navigate(createPageUrl('Dashboard'))}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>

      <ConfirmDialog isOpen={isOpen} config={config} onCancel={cancel} />
    </div>
  );
}