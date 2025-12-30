import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { BusinessStrategy } from '@/api/entities';
import { User } from '@/api/entities';
import { api } from '@/api/apiClient';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, 
  Target, 
  TrendingUp, 
  Loader2, 
  Plus,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Play,
  Pause,
  Sparkles,
  BarChart3
} from 'lucide-react';
import { toast } from 'sonner';
import { handleAuthError } from '@/utils/authHelpers';
import { useConfirmDialog, ConfirmDialog } from '@/hooks/useConfirmDialog';
import { NoDataEmptyState } from '../components/common/EmptyState';

export default function MasterStrategist() {
  const [strategies, setStrategies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showNewStrategyForm, setShowNewStrategyForm] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [newStrategy, setNewStrategy] = useState({
    name: '',
    target_revenue: '',
    timeframe_months: '',
    current_revenue: ''
  });
  const navigate = useNavigate();
  const { isOpen, config, confirm, cancel } = useConfirmDialog();

  // Memoize beta access check
  const hasBetaAccess = useMemo(() => {
    return currentUser && currentUser.user_mode === 'beta';
  }, [currentUser]);

  // Load strategies and user
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const user = await User.me();
      setCurrentUser(user);

      const strategiesData = await BusinessStrategy.list('-created_date').catch(err => {
        console.error('Error fetching strategies:', err);
        return [];
      });

      // Filter out invalid data
      const validStrategies = strategiesData.filter(s => 
        s && typeof s === 'object' && s.id
      );

      setStrategies(validStrategies);
    } catch (error) {
      console.error('Error loading master strategist:', error);
      
      if (handleAuthError(error, navigate, { showToast: true })) {
        return;
      }

      toast.error("Failed to load strategies", {
        description: "Please try refreshing the page."
      });
      
      setStrategies([]);
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle strategy creation
  const handleCreateStrategy = useCallback(async (e) => {
    e.preventDefault();
    
    if (!newStrategy.name || !newStrategy.target_revenue || !newStrategy.timeframe_months) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsGenerating(true);
    try {
      // Call AI function to generate comprehensive strategy
      const response = await api.functions.invoke('masterStrategist', {
        goal: {
          target_revenue: parseFloat(newStrategy.target_revenue),
          timeframe_months: parseInt(newStrategy.timeframe_months),
          current_revenue: parseFloat(newStrategy.current_revenue) || 0
        },
        name: newStrategy.name
      });

      if (response.data && response.data.strategy) {
        toast.success("Strategy generated successfully!");
        setNewStrategy({ name: '', target_revenue: '', timeframe_months: '', current_revenue: '' });
        setShowNewStrategyForm(false);
        loadData();
      } else {
        throw new Error('Invalid response from strategist');
      }
    } catch (error) {
      console.error('Strategy generation error:', error);
      
      if (handleAuthError(error, navigate)) {
        return;
      }

      toast.error("Failed to generate strategy", {
        description: error.message || "Please try again."
      });
    } finally {
      setIsGenerating(false);
    }
  }, [newStrategy, loadData, navigate]);

  // Handle strategy status toggle
  const handleToggleStatus = useCallback(async (strategy) => {
    const newStatus = strategy.status === 'active' ? 'paused' : 'active';
    
    await confirm({
      title: `${newStatus === 'active' ? 'Activate' : 'Pause'} Strategy?`,
      description: `Are you sure you want to ${newStatus === 'active' ? 'activate' : 'pause'} "${strategy.name}"?`,
      confirmText: newStatus === 'active' ? 'Activate' : 'Pause',
      onConfirm: async () => {
        try {
          await BusinessStrategy.update(strategy.id, { status: newStatus });
          toast.success(`Strategy ${newStatus === 'active' ? 'activated' : 'paused'}`);
          loadData();
        } catch (error) {
          console.error('Error toggling strategy:', error);
          
          if (handleAuthError(error, navigate)) {
            return;
          }

          toast.error("Failed to update strategy status", {
            description: "Please try again."
          });
        }
      }
    });
  }, [confirm, loadData, navigate]);

  // Handle strategy deletion
  const handleDeleteStrategy = useCallback(async (strategy) => {
    await confirm({
      title: 'Delete Strategy?',
      description: `Are you sure you want to delete "${strategy.name}"? This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'destructive',
      onConfirm: async () => {
        try {
          await BusinessStrategy.delete(strategy.id);
          toast.success("Strategy deleted");
          loadData();
        } catch (error) {
          console.error('Error deleting strategy:', error);
          
          if (handleAuthError(error, navigate)) {
            return;
          }

          toast.error("Failed to delete strategy", {
            description: "Please try again."
          });
        }
      }
    });
  }, [confirm, loadData, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-purple-600 animate-spin" />
          <p className="text-lg font-medium text-slate-600">Loading Master Strategist...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-full bg-purple-100">
                <Brain className="w-8 h-8 text-purple-600" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">Master Strategist</h1>
                <p className="text-slate-600 mt-1">AI-powered business strategy and growth planning</p>
              </div>
            </div>
            
            {!showNewStrategyForm && (
              <Button onClick={() => setShowNewStrategyForm(true)} className="bg-purple-600 hover:bg-purple-700">
                <Plus className="w-4 h-4 mr-2" />
                Create New Strategy
              </Button>
            )}
          </div>

          {/* New Strategy Form */}
          {showNewStrategyForm && (
            <Card className="mb-8 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  Generate Business Strategy
                </CardTitle>
                <CardDescription>
                  Tell us your goals and AI will create a comprehensive, phased strategy to achieve them.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateStrategy} className="space-y-4">
                  <div>
                    <Label htmlFor="strategyName">Strategy Name</Label>
                    <Input
                      id="strategyName"
                      placeholder="e.g., Reach $100K MRR by Q3"
                      value={newStrategy.name}
                      onChange={(e) => setNewStrategy({...newStrategy, name: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="currentRevenue">Current Monthly Revenue</Label>
                      <Input
                        id="currentRevenue"
                        type="number"
                        placeholder="e.g., 5000"
                        value={newStrategy.current_revenue}
                        onChange={(e) => setNewStrategy({...newStrategy, current_revenue: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="targetRevenue">Target Monthly Revenue</Label>
                      <Input
                        id="targetRevenue"
                        type="number"
                        placeholder="e.g., 100000"
                        value={newStrategy.target_revenue}
                        onChange={(e) => setNewStrategy({...newStrategy, target_revenue: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="timeframe">Timeframe (Months)</Label>
                      <Input
                        id="timeframe"
                        type="number"
                        placeholder="e.g., 6"
                        value={newStrategy.timeframe_months}
                        onChange={(e) => setNewStrategy({...newStrategy, timeframe_months: e.target.value})}
                        required
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button type="submit" disabled={isGenerating} className="bg-purple-600 hover:bg-purple-700">
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating Strategy...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Generate Strategy
                        </>
                      )}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        setShowNewStrategyForm(false);
                        setNewStrategy({ name: '', target_revenue: '', timeframe_months: '', current_revenue: '' });
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Strategies List */}
          {strategies.length > 0 ? (
            <div className="grid gap-6">
              {strategies.map((strategy) => {
                const progressPercent = strategy.performance_tracking?.goal_progress || 0;
                
                return (
                  <Card key={strategy.id} className="bg-white/80 backdrop-blur-sm hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-2xl mb-2 flex items-center gap-3">
                            {strategy.name}
                            <Badge variant={
                              strategy.status === 'active' ? 'default' : 
                              strategy.status === 'completed' ? 'secondary' : 
                              'outline'
                            }>
                              {strategy.status}
                            </Badge>
                          </CardTitle>
                          <CardDescription>
                            Goal: ${strategy.goal?.target_revenue?.toLocaleString()} monthly revenue in {strategy.goal?.timeframe_months} months
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleStatus(strategy)}
                          >
                            {strategy.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDeleteStrategy(strategy)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Progress Bar */}
                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm font-medium">Progress to Goal</span>
                          <span className="text-sm font-bold">{progressPercent}%</span>
                        </div>
                        <Progress value={progressPercent} className="h-2" />
                      </div>

                      {/* Current State */}
                      {strategy.current_state_analysis && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {strategy.current_state_analysis.strengths && strategy.current_state_analysis.strengths.length > 0 && (
                            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                              <h4 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4" />
                                Strengths
                              </h4>
                              <ul className="text-sm text-green-800 space-y-1">
                                {strategy.current_state_analysis.strengths.slice(0, 3).map((item, idx) => (
                                  <li key={idx}>• {item}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {strategy.current_state_analysis.opportunities && strategy.current_state_analysis.opportunities.length > 0 && (
                            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                              <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                                <Lightbulb className="w-4 h-4" />
                                Opportunities
                              </h4>
                              <ul className="text-sm text-blue-800 space-y-1">
                                {strategy.current_state_analysis.opportunities.slice(0, 3).map((item, idx) => (
                                  <li key={idx}>• {item}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Strategy Phases */}
                      {strategy.strategy_phases && strategy.strategy_phases.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                            <Target className="w-5 h-5 text-purple-600" />
                            Strategic Phases
                          </h4>
                          <div className="grid gap-3">
                            {strategy.strategy_phases.map((phase, idx) => (
                              <div key={idx} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                                <div className="flex justify-between items-start mb-2">
                                  <h5 className="font-semibold text-slate-900">
                                    Phase {idx + 1}: {phase.phase_name}
                                  </h5>
                                  <Badge variant="outline">{phase.duration_weeks} weeks</Badge>
                                </div>
                                {phase.objectives && phase.objectives.length > 0 && (
                                  <ul className="text-sm text-slate-700 space-y-1 mt-2">
                                    {phase.objectives.slice(0, 2).map((obj, oIdx) => (
                                      <li key={oIdx}>• {obj}</li>
                                    ))}
                                  </ul>
                                )}
                                {phase.expected_revenue && (
                                  <p className="text-sm font-medium text-green-700 mt-2">
                                    Expected Revenue: ${phase.expected_revenue.toLocaleString()}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* AI Recommendations */}
                      {strategy.ai_recommendations && strategy.ai_recommendations.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                            <Lightbulb className="w-5 h-5 text-yellow-600" />
                            AI Recommendations
                          </h4>
                          <div className="grid gap-3">
                            {strategy.ai_recommendations.slice(0, 3).map((rec, idx) => (
                              <div key={idx} className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                                <div className="flex justify-between items-start">
                                  <p className="text-sm font-medium text-yellow-900">{rec.recommendation}</p>
                                  <Badge variant="outline" className={
                                    rec.impact === 'critical' ? 'border-red-500 text-red-700' :
                                    rec.impact === 'high' ? 'border-orange-500 text-orange-700' :
                                    'border-yellow-500 text-yellow-700'
                                  }>
                                    {rec.impact} impact
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="bg-white/80 backdrop-blur-sm">
              <CardContent className="p-12">
                <NoDataEmptyState
                  entityName="Business Strategies"
                  onCreate={() => setShowNewStrategyForm(true)}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <ConfirmDialog isOpen={isOpen} config={config} onCancel={cancel} />
    </>
  );
}