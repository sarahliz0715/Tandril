
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Platform } from "@/api/entities";
import { AICommand } from "@/api/entities";
import { SmartAlert } from "@/api/entities";
import { AIRecommendation } from "@/api/entities";
import { InventoryItem } from "@/api/entities";
import { User } from "@/api/entities";
import { Order } from "@/api/entities";
import { Bot, Zap, MessageSquareCode, TrendingUp, FlaskConical, LifeBuoy, AlertTriangle, Lightbulb, Target, DollarSign, Package, Users, ArrowUpRight, ArrowDownRight, Clock, MoreVertical, Play, Save, Trash2, Hourglass, CheckCircle, FileText, Plus, Sparkles, X, RotateCw, BarChart3, Shield, Loader2, Settings, MessageSquare, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import SavedCommandFormModal from "../components/commands/SavedCommandFormModal";
import { toast } from "sonner";
import { SavedCommand } from "@/api/entities";
import BetaBanner from "../components/dashboard/BetaBanner";
import AIHub from "../components/dashboard/AIHub";
import DashboardAdvisor from '../components/dashboard/DashboardAdvisor';
import QuickInsights from '../components/dashboard/QuickInsights';
import PersonalizedTodos from '../components/dashboard/PersonalizedTodos';
import QuickActionsHub from '../components/dashboard/QuickActionsHub';
import DashboardWidget from '../components/dashboard/DashboardWidget';
import AutomationStatus from '../components/dashboard/AutomationStatus';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { generateDemoData } from '@/api/functions';
import LayoutReminder from '../components/common/LayoutReminder';
import WidgetManager from '../components/common/WidgetManager';
import BetaGate from '../components/common/BetaGate';
import { handleAuthError } from '../components/utils/authHelpers';
import { useConfirmDialog, ConfirmDialog } from '../components/hooks/useConfirmDialog';
import { NoDataEmptyState } from '../components/common/EmptyState';
import BetaInviteModal from '../components/settings/BetaInviteModal';
import ModeToggle from '../components/dashboard/ModeToggle';

const useBetaAccess = (user) => {
    return useMemo(() => ({
        hasBetaAccess: user && user.user_mode === 'beta'
    }), [user]);
};

const QuickActionCard = ({ title, description, icon: Icon, onClick, variant = "default" }) => {
    const variants = {
        default: "bg-white hover:bg-slate-50 border-slate-200",
        primary: "bg-indigo-50 hover:bg-indigo-100 border-indigo-200",
        success: "bg-green-50 hover:bg-green-100 border-green-200",
        warning: "bg-amber-50 hover:bg-amber-100 border-amber-200"
    };

    return (
        <Card
            className={`cursor-pointer transition-all duration-200 hover:shadow-md ${variants[variant]} border`}
            onClick={onClick}
        >
            <CardContent className="p-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-white/80">
                        <Icon className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-900 text-sm">{title}</h3>
                        <p className="text-xs text-slate-600">{description}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

const DemoBadge = () => (
    <span className="text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200 rounded-full px-2 py-0.5 ml-2">
        🎭 Demo
    </span>
);

const formatCommandLogMessage = (command) => {
    const actionType = command.actions_planned?.[0]?.action_type || 'Custom Command Execution';
    const successCount = command.results?.success_count || 0;

    switch (actionType) {
        case 'SEO Update':
            return `✅ Optimized SEO for ${successCount} products, improving visibility.`;
        case 'Price Update':
            return `💰 Updated prices for ${successCount} items as requested.`;
        case 'Description Update':
            return `✍️ Updated descriptions for ${successCount} products.`;
        case 'Inventory Scan':
            return `📦 Scanned inventory, found ${command.results?.details?.length || 0} low-stock items.`;
        case 'Create Listing':
            return `✨ Created 1 new product listing successfully.`;
        case 'CTA Update':
            return `🎯 Added compelling Call-to-Actions to ${successCount} product pages.`;
        default:
            return `🤖 Executed custom command: "${command.command_text}"`;
    }
};

export default function Dashboard() {
  const [platforms, setPlatforms] = useState([]);
  const [recentCommands, setRecentCommands] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [commandToSave, setCommandToSave] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [hubStats, setHubStats] = useState({
    recentRevenue: 0,
    recentOrders: 0,
    criticalAlerts: 0,
    newRecommendations: 0,
    automationsRun: 0,
  });
  const [showBetaInviteModal, setShowBetaInviteModal] = useState(false);
  const navigate = useNavigate();
  const { isOpen, config, confirm, cancel } = useConfirmDialog();

  const { hasBetaAccess } = useBetaAccess(currentUser);

  const handleReminders = useCallback(async (user) => {
      const activeReminders = user.ai_memory?.filter(mem => mem.type === 'reminder' && !mem.is_dismissed) || [];
      if (activeReminders.length > 0) {
          const updatedMemory = user.ai_memory.map(mem =>
              (mem.type === 'reminder' && !mem.is_dismissed) ? { ...mem, is_dismissed: true } : mem
          );

          activeReminders.forEach(reminder => {
              toast.info("A reminder from Orion:", {
                  description: reminder.content,
                  duration: 10000,
                  icon: <Info className="w-4 h-4" />
              });
          });

          try {
              await User.update(user.id, { ai_memory: updatedMemory });
          } catch (error) {
              console.error("Failed to update reminders as dismissed:", error);
          }
      }
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const user = await User.me();
      setCurrentUser(user);
      handleReminders(user);

      const [platformsData, commandsData] = await Promise.all([
          Platform.list('-created_date'),
          AICommand.list('-created_date', 10)
      ]);

      await new Promise(resolve => setTimeout(resolve, 100));

      const [alertsData, recommendationsData] = await Promise.all([
          SmartAlert.list('-created_date', 20),
          AIRecommendation.list('-created_date', 20)
      ]);

      await new Promise(resolve => setTimeout(resolve, 100));

      const [allProducts, ordersData] = await Promise.all([
          InventoryItem.list(),
          Order.list('-order_date', 50)
      ]);

      if (user.user_mode === 'demo' && platformsData.length === 0 && allProducts.length === 0) {
        toast.info("Setting up your demo environment with sample data...");
        await generateDemoData();
        loadData();
        return;
      }

      setPlatforms(platformsData);
      setRecentCommands(commandsData);
      setAlerts(alertsData);
      setRecommendations(recommendationsData);
      setProducts(allProducts);

      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);

      const recentOrdersData = ordersData.filter(o => new Date(o.order_date) > lastWeek);
      const recentRevenue = recentOrdersData.reduce((sum, order) => sum + order.total_price, 0);

      const criticalAlertsCount = alertsData.filter(a => a.priority === 'high' || a.priority === 'urgent').length;
      const newRecommendationsCount = recommendationsData.filter(r => r.status === 'new').length;
      const automationsRunCount = commandsData.filter(c => new Date(c.created_date) > lastWeek && c.status === 'completed').length;

      setHubStats({
        recentRevenue: recentRevenue,
        recentOrders: recentOrdersData.length,
        criticalAlerts: criticalAlertsCount,
        newRecommendations: newRecommendationsCount,
        automationsRun: automationsRunCount,
      });

    } catch (error) {
      console.error('Error loading dashboard data:', error);

      if (handleAuthError(error, navigate)) {
        return;
      }

      if (error.response?.status === 429 || error.status === 429) {
        toast.error("Too Many Requests", {
          description: "Please wait a moment and refresh the page."
        });
        setPlatforms([]);
        setRecentCommands([]);
        setAlerts([]);
        setRecommendations([]);
        setProducts([]);
        setHubStats({
          recentRevenue: 0,
          recentOrders: 0,
          criticalAlerts: 0,
          newRecommendations: 0,
          automationsRun: 0,
        });
        return;
      }

      if (error.message === 'Network Error' || !error.response) {
        console.log('Network error detected, will retry...');
        setPlatforms([]);
        setRecentCommands([]);
        setAlerts([]);
        setRecommendations([]);
        setProducts([]);
        setHubStats({
          recentRevenue: 0,
          recentOrders: 0,
          criticalAlerts: 0,
          newRecommendations: 0,
          automationsRun: 0,
        });
        
        toast.info("Connecting to server...", {
          duration: 2000
        });
        
        return;
      }

      toast.error("Dashboard Error", {
        description: "Could not load essential dashboard data. Please try refreshing the page."
      });
    } finally {
      setIsLoading(false);
    }
  }, [navigate, handleReminders]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRunAgain = useCallback((commandText) => {
    navigate(createPageUrl('Commands?prompt=' + encodeURIComponent(commandText)));
  }, [navigate]);

  const handleSaveCommand = useCallback((command) => {
    setCommandToSave({
      name: command.command_text.substring(0, 40) + (command.command_text.length > 40 ? '...' : ''),
      command_text: command.command_text,
      description: `Saved from history on ${new Date().toLocaleDateString()}`,
      category: 'general'
    });
  }, []);

  const handleDeleteClick = useCallback(async (command) => {
    await confirm({
      title: 'Delete Command?',
      description: `This will permanently remove "${command.command_text.substring(0, 50)}..." from your history.`,
      confirmText: 'Delete',
      variant: 'destructive',
      onConfirm: async () => {
        try {
          await AICommand.delete(command.id);
          toast.success("Command removed from history.");
          loadData();
        } catch (error) {
          if (handleAuthError(error, navigate)) return;
          toast.error("Failed to delete command.");
          console.error("Delete command error:", error);
        }
      }
    });
  }, [confirm, navigate, loadData]);

  const handleSaveSuccess = useCallback(() => {
    toast.success("Command template saved!");
    setCommandToSave(null);
  }, []);

  const getAvailableWidgets = useCallback(() => {
      const baseWidgets = [
          { id: 'beta-banner', title: 'Beta Notice', component: BetaBanner, layout: 'top', showControls: false },
          { id: 'mode-toggle', title: 'Operating Mode', component: ModeToggle, layout: 'top', showControls: false },
          { id: 'agents-hub', title: 'AI Agents', layout: 'top', showControls: false },
          { id: 'ai-hub', title: 'AI Performance Hub', component: AIHub, layout: 'top' },
          { id: 'automation-status', title: 'Automation Status', component: AutomationStatus, layout: 'top', showControls: true },
          { id: 'quick-insights', title: 'Quick Insights', component: QuickInsights, layout: 'top' },
          { id: 'quick-actions', title: 'Quick Actions', component: QuickActionsHub, layout: 'top' },
          { id: 'dashboard-advisor', title: 'AI Business Advisor', component: DashboardAdvisor, layout: 'main-col' },
          { id: 'ai-activity', title: 'AI Activity Log', layout: 'main-col', showControls: true },
          { id: 'top-products', title: 'Top Performing Products', layout: 'main-col', showControls: true },
          { id: 'personalized-todos', title: 'Today\'s Focus', component: PersonalizedTodos, layout: 'side-col' },
          { id: 'recommendations', title: 'AI Recommendations', layout: 'side-col', showControls: true },
          { id: 'platform-status', title: 'Platform Status', layout: 'side-col', showControls: true }
      ];

      if (hasBetaAccess) {
          return baseWidgets.filter(w =>
              ['beta-banner', 'mode-toggle', 'agents-hub', 'quick-insights', 'quick-actions',
               'dashboard-advisor', 'ai-activity', 'top-products', 'automation-status',
               'personalized-todos', 'platform-status'].includes(w.id)
          ).map(w => {
              if (w.id === 'platform-status') {
                  return { ...w, title: 'Shopify Connection' };
              }
              return w;
          });
      }

      return baseWidgets;
  }, [hasBetaAccess]);

  const renderWidgetContent = (widgetId) => {
    const commonProps = {
      user: currentUser,
      platforms: platforms,
      products: products,
      orders: recentCommands,
      alerts: alerts,
      recommendations: recommendations,
      stats: hubStats,
      navigate: navigate,
      createPageUrl: createPageUrl,
      handleRunAgain: handleRunAgain,
      handleSaveCommand: handleSaveCommand,
      handleDeleteClick: handleDeleteClick,
    };

    const widgetDef = getAvailableWidgets().find(w => w.id === widgetId);

    // Return null early if widget definition not found
    if (!widgetDef) {
      console.warn(`Widget definition not found for: ${widgetId}`);
      return null;
    }

    // If widget has a component, render it
    if (widgetDef.component) {
      const WidgetComponent = widgetDef.component;
      return <WidgetComponent {...commonProps} />;
    }

    // Otherwise render custom content for specific widgets
    switch (widgetId) {
      case 'agents-hub':
        const isAdmin = currentUser?.role === 'admin';
        const mainTitle = isAdmin ? 'Chat with Orion - Your AI Business Partner' : 'Meet Orion - Your AI Business Partner';
        
        return (
          <Card className="bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 border-indigo-200 shadow-lg">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-3 text-xl sm:text-2xl">
                <div className="p-2 rounded-lg bg-purple-100">
                  <Bot className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <span className="text-slate-900">{mainTitle}</span>
                  <p className="text-sm font-normal text-slate-600 mt-1">Advanced AI agent ready to transform your e-commerce operations</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                  <div className="bg-white rounded-xl p-6 border border-slate-200 text-center">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-400 to-indigo-600 flex items-center justify-center border-2 border-white/50 shadow-lg">
                      <img
                        src="https://images.unsplash.com/photo-1639747280804-dd2d6b3d883e?q=80&w=100&h=100&fit=crop&auto=format"
                        alt="Orion AI"
                        className="w-16 h-16 rounded-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.parentNode.innerHTML = '<div class="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center"><svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg></div>';
                        }}
                      />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Orion</h3>
                    <p className="text-sm text-slate-600 mb-4">Strategic Business Advisor</p>
                    <div className="flex items-center justify-center gap-2 text-xs text-green-600">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span>Active & Ready</span>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    <div className="bg-white rounded-lg p-4 border border-slate-200">
                      <div className="flex items-center gap-3 mb-2">
                        <TrendingUp className="w-5 h-5 text-green-600" />
                        <h4 className="font-semibold text-slate-900">Growth Strategy</h4>
                      </div>
                      <p className="text-sm text-slate-600">Analyzes your data to identify expansion opportunities and revenue optimization strategies.</p>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-slate-200">
                      <div className="flex items-center gap-3 mb-2">
                        <Zap className="w-5 h-5 text-blue-600" />
                        <h4 className="font-semibold text-slate-900">Task Automation</h4>
                      </div>
                      <p className="text-sm text-slate-600">Executes complex workflows across your platforms with natural language commands.</p>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-slate-200">
                      <div className="flex items-center gap-3 mb-2">
                        <BarChart3 className="w-5 h-5 text-indigo-600" />
                        <h4 className="font-semibold text-slate-900">Analytics Insights</h4>
                      </div>
                      <p className="text-sm text-slate-600">Transforms raw data into actionable business intelligence and recommendations.</p>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-slate-200">
                      <div className="flex items-center gap-3 mb-2">
                        <Shield className="w-5 h-5 text-purple-600" />
                        <h4 className="font-semibold text-slate-900">Proactive Monitoring</h4>
                      </div>
                      <p className="text-sm text-slate-600">Continuously monitors your business and alerts you to opportunities and issues.</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button
                      onClick={() => navigate(createPageUrl('AIAdvisor'))}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Chat with Orion
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => navigate(createPageUrl('Commands?prompt=' + encodeURIComponent('What should I focus on today to grow my business?')))}
                    >
                      <Target className="w-4 h-4 mr-2" />
                      Get Strategic Advice
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => navigate(createPageUrl('Commands?prompt=' + encodeURIComponent('Analyze my business performance and suggest improvements')))}
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Business Analysis
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'ai-activity':
        return (
          <Card className="bg-white/80 backdrop-blur-sm shadow-none border-none">
            <CardHeader className="p-0 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 sm:gap-3 text-lg sm:text-xl">
                  <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                  AI Activity Log
                </CardTitle>
                <Button
                  size="sm"
                  onClick={() => navigate(createPageUrl('Commands'))}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  New Command
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {recentCommands.length > 0 ? (
                <div className="space-y-3 sm:space-y-4">
                  {recentCommands.slice(0, 4).map((command) => (
                    <div key={command.id} className="group flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg bg-slate-50 border border-slate-200">
                      <div className="mt-1 flex-shrink-0">
                        {command.status === 'completed' ? <CheckCircle className="w-5 h-5 text-green-500" /> : <AlertTriangle className="w-5 h-5 text-red-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm sm:text-base font-medium text-slate-900 flex items-center break-words">
                          {formatCommandLogMessage(command)}
                          {command.is_demo_data && <DemoBadge />}
                        </p>
                        <div className="text-xs text-slate-500 mt-1">
                          {new Date(command.created_date).toLocaleString()}
                        </div>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="w-4 h-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleRunAgain(command.command_text)}>
                                    <Play className="w-4 h-4 mr-2" />
                                    Run Again
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleSaveCommand(command)}>
                                    <Save className="w-4 h-4 mr-2" />
                                    Save as Template
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                    <FileText className="w-4 h-4 mr-2" />
                                    View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => navigate(createPageUrl('Commands?prompt=' + encodeURIComponent(`Create a similar command to: ${command.command_text}`)))}>
                                    <Target className="w-4 h-4 mr-2" />
                                    Create Similar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDeleteClick(command)} className="text-red-500 focus:text-red-500">
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <NoDataEmptyState
                  entityName="Commands"
                  onCreate={() => navigate(createPageUrl('Commands'))}
                />
              )}
            </CardContent>
          </Card>
        );

      case 'top-products':
        return (
          <Card className="bg-white/80 backdrop-blur-sm shadow-none border-none">
            <CardHeader className="p-0 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 sm:gap-3 text-lg sm:text-xl">
                  <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                  Top Performing Products
                </CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(createPageUrl('Inventory'))}
                >
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {products.length > 0 ? (
                <>
                  <div className="grid md:grid-cols-2 gap-3 sm:gap-4">
                    {products.slice(0, 4).map((product, index) => (
                      <div key={product.id || index} className="group flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors">
                        <img
                          src={product.image_url}
                          alt={product.product_name || product.name}
                          className="w-12 h-12 object-cover rounded-lg flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-slate-900 text-sm">{product.product_name || product.name}</h4>
                          <p className="text-lg font-bold text-green-600">${product.base_price || product.price}</p>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => navigate(createPageUrl('Commands?prompt=' + encodeURIComponent(`Analyze performance of ${product.product_name || product.name}`)))}
                          >
                            <BarChart3 className="w-4 h-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(createPageUrl('Commands?prompt=' + encodeURIComponent(`Update SEO for ${product.product_name || product.name}`)))}>
                                <Sparkles className="w-4 h-4 mr-2" />
                                Optimize SEO
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate(createPageUrl('Commands?prompt=' + encodeURIComponent(`Create marketing campaign for ${product.product_name || product.name}`)))}>
                                <Target className="w-4 h-4 mr-2" />
                                Create Campaign
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate(createPageUrl('Commands?prompt=' + encodeURIComponent(`Check inventory for ${product.product_name || product.name}`)))}>
                                <Package className="w-4 h-4 mr-2" />
                                Check Stock
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(createPageUrl('Commands?prompt=' + encodeURIComponent('Update SEO titles for all my top selling products')))}
                    >
                      <Sparkles className="w-4 h-4 mr-1" />
                      Bulk SEO Update
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(createPageUrl('Commands?prompt=' + encodeURIComponent('Create social media posts for my best sellers')))}
                    >
                      <MessageSquareCode className="w-4 h-4 mr-1" />
                      Social Posts
                    </Button>
                  </div>
                </>
              ) : (
                <NoDataEmptyState
                  entityName="Products"
                  onCreate={() => navigate(createPageUrl('Inventory'))}
                />
              )}
            </CardContent>
          </Card>
        );

      case 'recommendations':
        return (
          <Card className="bg-white/80 backdrop-blur-sm shadow-none border-none">
            <CardHeader className="p-0 pb-3">
              <CardTitle className="flex items-center gap-2 sm:gap-3 text-lg sm:text-xl">
                <Lightbulb className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500" />
                AI Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-3 sm:space-y-4">
                {recommendations.length > 0 ? (
                  recommendations.slice(0, 3).map((rec, index) => (
                    <div key={rec.id || index} className="p-3 sm:p-4 rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 hover:from-indigo-100 hover:to-purple-100 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="w-4 h-4 text-indigo-600" />
                        <Badge className={`text-xs ${
                          rec.impact_level === 'Critical' ? 'bg-red-100 text-red-700 border-red-200' :
                          rec.impact_level === 'High' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                          'bg-blue-100 text-blue-700 border-blue-200'
                        }`}>
                          {rec.impact_level} Impact
                        </Badge>
                        {rec.is_demo_data && <DemoBadge />}
                      </div>
                      <h4 className="font-semibold text-slate-900 mb-1 text-sm sm:text-base">{rec.title}</h4>
                      <p className="text-xs sm:text-sm text-slate-600 mb-2">{rec.description}</p>
                      <p className="text-sm font-medium text-green-700 mb-3">{rec.potential_gain}</p>

                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button
                          size="sm"
                          className="bg-indigo-600 hover:bg-indigo-700 text-xs h-8 flex-1"
                          onClick={() => navigate(createPageUrl('Commands?prompt=' + encodeURIComponent(`Implement: ${rec.title}`)))}
                        >
                          <Sparkles className="w-3 h-3 mr-1" />
                          Let AI Handle This
                        </Button>
                        <Button size="sm" variant="outline" className="text-xs h-8 flex-1">
                          <FileText className="w-3 h-3 mr-1" />
                          View Plan
                        </Button>
                        <Button size="sm" variant="ghost" className="text-xs h-8 text-slate-500">
                          <X className="w-3 h-3 mr-1" />
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Lightbulb className="mx-auto h-12 w-12 text-slate-300" />
                    <h3 className="mt-2 text-sm font-medium text-slate-900">No new recommendations</h3>
                    <p className="mt-1 text-sm text-slate-500">Check back later for personalized insights.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );

      case 'platform-status':
        return (
          <Card className="bg-white/80 backdrop-blur-sm shadow-none border-none">
            <CardHeader className="p-0 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 sm:gap-3 text-lg sm:text-xl">
                  <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                  {widgetDef?.title || 'Platform Status'}
                </CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(createPageUrl('Platforms'))}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Connect More
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {platforms.length > 0 ? (
                <div className="space-y-3 sm:space-y-4">
                  {platforms.map((platform, index) => (
                    <div key={platform.id || index} className="group flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                          platform.status === 'connected' ? 'bg-green-500' :
                          platform.status === 'processing' ? 'bg-yellow-500' : 'bg-gray-400'
                        }`} />
                        <div>
                          <p className="font-medium text-slate-900 flex items-center text-sm sm:text-base">
                            {platform.name}
                            {platform.is_demo_data && <DemoBadge />}
                          </p>
                          <p className="text-xs text-slate-500">{platform.store_info?.total_products} products</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {platform.status}
                        </Badge>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => navigate(createPageUrl('Commands?prompt=' + encodeURIComponent(`Sync products from ${platform.name}`)))}
                          >
                            <RotateCw className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <NoDataEmptyState
                  entityName="Platforms"
                  onCreate={() => navigate(createPageUrl('Platforms'))}
                />
              )}
            </CardContent>
          </Card>
        );

      default:
        console.warn(`No content renderer for widget: ${widgetId}`);
        return null;
    }
  };


  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
          <p className="text-lg font-medium text-slate-600">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 space-y-6">
      <div className="max-w-7xl mx-auto">
        {hasBetaAccess && (
            <Alert className="mb-6 border-blue-200 bg-blue-50">
                <Sparkles className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-blue-900">Welcome to Shopify Beta!</AlertTitle>
                <AlertDescription className="text-blue-700">
                    You're testing our Shopify-focused MVP. Connect your store, ask Orion questions, and try SEO optimization.
                    We'd love your feedback!
                </AlertDescription>
            </Alert>
        )}

        <LayoutReminder />

        <div className="mb-4 sm:mb-6 lg:mb-8 flex items-center justify-between">
          <div>
            <p className="text-slate-600 text-sm sm:text-base lg:text-lg">
                {hasBetaAccess
                    ? "Your AI-powered command center for Shopify automation and growth."
                    : "The complete AI-powered operating system for e-commerce sellers. Automate workflows, manage inventory, optimize listings, run smart ad campaigns, and grow across multiple platforms - all powered by Orion, your AI business partner."
                }
            </p>
          </div>
          
          {currentUser?.role === 'admin' && (
            <Button 
              onClick={() => setShowBetaInviteModal(true)}
              className="bg-green-600 hover:bg-green-700 gap-2"
              size="sm"
            >
              <Users className="w-4 h-4" />
              Invite Beta Tester
            </Button>
          )}
        </div>

        <WidgetManager
          pageName="dashboard"
          defaultWidgets={getAvailableWidgets()}
          renderWidgetContent={renderWidgetContent}
          user={currentUser}
          navigate={navigate}
          createPageUrl={createPageUrl}
        />
      </div>

      {commandToSave && (
          <SavedCommandFormModal
              commandToEdit={commandToSave}
              onClose={() => setCommandToSave(null)}
              onSave={handleSaveSuccess}
          />
      )}

      {showBetaInviteModal && (
        <BetaInviteModal
          isOpen={showBetaInviteModal}
          onClose={() => setShowBetaInviteModal(false)}
        />
      )}

      <ConfirmDialog isOpen={isOpen} config={config} onCancel={cancel} />
    </div>
  );
}
