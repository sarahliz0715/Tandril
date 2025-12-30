import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Package,
  ShoppingBag,
  Lightbulb,
  RefreshCw,
  Loader2,
  ChevronRight,
  CheckCircle
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { handleAuthError } from '@/utils/authHelpers';
import { useNavigate } from 'react-router-dom';

export default function AIInsightsDashboard({ compact = false }) {
  const [insights, setInsights] = useState([]);
  const [summary, setSummary] = useState({ total: 0, critical: 0, high: 0, medium: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const loadInsights = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await base44.functions.generateAIInsights();
      setInsights(data.insights || []);
      setSummary(data.summary || { total: 0, critical: 0, high: 0, medium: 0 });
    } catch (error) {
      console.error('Failed to load insights:', error);

      if (handleAuthError(error, navigate, { showToast: true })) {
        return;
      }

      toast.error("Failed to load AI insights", {
        description: "Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadInsights();
  }, [loadInsights]);

  const getInsightIcon = (type) => {
    switch (type) {
      case 'seo':
        return Sparkles;
      case 'orders':
        return AlertTriangle;
      case 'pricing':
        return DollarSign;
      case 'inventory':
        return Package;
      case 'trend':
        return TrendingUp;
      default:
        return Lightbulb;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      default:
        return 'bg-blue-100 text-blue-700 border-blue-300';
    }
  };

  const getSeverityBadgeColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-yellow-500';
      default:
        return 'bg-blue-500';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-12">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-slate-600">Analyzing your store...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (insights.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
        <CardContent className="p-8">
          <div className="flex items-start gap-4">
            <CheckCircle className="w-12 h-12 text-green-600 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-green-900 mb-2">All Systems Running Smoothly!</h3>
              <p className="text-green-700">
                No critical issues detected. Your store is performing well. Keep up the great work!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayInsights = compact ? insights.slice(0, 3) : insights;

  return (
    <div className="space-y-4">
      {/* Summary Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-purple-600" />
              AI Insights & Recommendations
            </CardTitle>
            <Button onClick={loadInsights} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-sm text-slate-600">{summary.critical} Critical</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
              <span className="text-sm text-slate-600">{summary.high} High</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span className="text-sm text-slate-600">{summary.medium} Medium</span>
            </div>
            <div className="ml-auto text-sm font-medium text-slate-700">
              {summary.total} {summary.total === 1 ? 'insight' : 'insights'} found
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Insights List */}
      <div className="space-y-3">
        {displayInsights.map((insight, index) => {
          const Icon = getInsightIcon(insight.type);

          return (
            <Card key={index} className={`border-l-4 ${getSeverityColor(insight.severity)}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-white/80 flex-shrink-0">
                    <Icon className="w-5 h-5 text-slate-700" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div>
                        <h4 className="font-semibold text-slate-900 mb-1">{insight.title}</h4>
                        <Badge className={`text-xs ${getSeverityBadgeColor(insight.severity)} text-white`}>
                          {insight.severity.toUpperCase()}
                        </Badge>
                      </div>
                    </div>

                    <p className="text-sm text-slate-600 mb-3">{insight.description}</p>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700"
                        onClick={() => {
                          // Navigate to Commands with pre-filled command
                          navigate(`/Commands?prompt=${encodeURIComponent(insight.command_suggestion)}`);
                        }}
                      >
                        <Sparkles className="w-3 h-3 mr-1" />
                        {insight.action}
                      </Button>

                      {insight.data && (
                        <span className="text-xs text-slate-500">
                          {insight.data.product_count && `${insight.data.product_count} products affected`}
                          {insight.data.stuck_count && `${insight.data.stuck_count} orders stuck`}
                          {insight.data.growth_rate && `${insight.data.growth_rate}% change`}
                        </span>
                      )}
                    </div>

                    {insight.platform && (
                      <div className="mt-2 text-xs text-slate-500">
                        <ShoppingBag className="w-3 h-3 inline mr-1" />
                        {insight.platform}
                      </div>
                    )}
                  </div>

                  <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {compact && insights.length > 3 && (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => navigate('/Dashboard')}
        >
          View All {insights.length} Insights
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      )}
    </div>
  );
}
