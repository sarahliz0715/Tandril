import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Sparkles,
  Brain,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Zap,
  RefreshCw,
  Loader2,
  ArrowRight,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/apiClient';

export default function SmartTriggerRecommendations({ automationId, onApplyRecommendation }) {
  const [isLoading, setIsLoading] = useState(true);
  const [analysis, setAnalysis] = useState(null);
  const [schedule, setSchedule] = useState(null);

  useEffect(() => {
    loadRecommendations();
  }, [automationId]);

  const loadRecommendations = async () => {
    setIsLoading(true);
    try {
      // Get smart trigger analysis
      const triggerAnalysis = await api.functions.invoke('smart-trigger-evaluator', {
        automation_id: automationId,
      });

      // Get intelligent scheduling recommendations
      const scheduleData = await api.functions.invoke('intelligent-scheduler', {
        mode: 'analyze',
      });

      setAnalysis(triggerAnalysis.data || triggerAnalysis);

      // Find schedule for this automation
      const automationSchedule = scheduleData.data?.schedule?.find(
        (s) => s.automation_id === automationId
      );
      setSchedule(automationSchedule);
    } catch (error) {
      console.error('Failed to load recommendations:', error);
      toast.error('Failed to load AI recommendations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplySchedule = async () => {
    if (!schedule) return;

    try {
      // Apply the AI-recommended schedule
      await onApplyRecommendation({
        type: 'schedule',
        data: schedule.recommended_schedule,
      });

      toast.success('AI-recommended schedule applied!');
      loadRecommendations(); // Refresh
    } catch (error) {
      console.error('Failed to apply schedule:', error);
      toast.error('Failed to apply schedule');
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'low':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-12">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            <p className="text-slate-600">Analyzing with AI...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analysis && !schedule) {
    return (
      <Card className="bg-slate-50">
        <CardContent className="p-8">
          <div className="text-center text-slate-500">
            <Brain className="w-12 h-12 mx-auto mb-3 text-slate-400" />
            <p>No AI recommendations available yet.</p>
            <p className="text-sm mt-1">Run this automation a few times to generate insights.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* AI Analysis Header */}
      <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            AI-Powered Automation Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">
            Our AI analyzes your store patterns and automation performance to recommend optimal
            timing and improvements.
          </p>
        </CardContent>
      </Card>

      {/* Trigger Decision */}
      {analysis && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-600" />
              Should This Trigger Fire Now?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Decision */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-3">
                  {analysis.should_trigger ? (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  ) : (
                    <Clock className="w-6 h-6 text-orange-600" />
                  )}
                  <div>
                    <p className="font-semibold text-slate-900">
                      {analysis.should_trigger ? 'Yes, Trigger Now' : 'Wait for Better Timing'}
                    </p>
                    <p className="text-sm text-slate-600">{analysis.reasoning}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">Confidence</p>
                  <p className={`text-2xl font-bold ${getConfidenceColor(analysis.confidence)}`}>
                    {(analysis.confidence * 100).toFixed(0)}%
                  </p>
                </div>
              </div>

              {/* Optimal Timing */}
              {analysis.optimal_timing && (
                <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                  <div className="flex items-start gap-2">
                    <Calendar className="w-4 h-4 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-900">Optimal Timing</p>
                      <p className="text-sm text-blue-700 mt-1">
                        {analysis.optimal_timing.recommended_time === 'now'
                          ? 'Now is the optimal time'
                          : `Best time: ${analysis.optimal_timing.recommended_time}`}
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        {analysis.optimal_timing.reason}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Patterns Detected */}
              {analysis.patterns_detected && analysis.patterns_detected.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-700">Patterns Detected:</p>
                  {analysis.patterns_detected.map((pattern, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-purple-50 border border-purple-200"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-purple-900">{pattern.pattern}</p>
                          {pattern.recommendation && (
                            <p className="text-xs text-purple-700 mt-1">{pattern.recommendation}</p>
                          )}
                        </div>
                        <Badge
                          className={
                            pattern.strength === 'strong'
                              ? 'bg-purple-600 text-white'
                              : pattern.strength === 'moderate'
                              ? 'bg-purple-400 text-white'
                              : 'bg-purple-200 text-purple-800'
                          }
                        >
                          {pattern.strength}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Smart Scheduling */}
      {schedule && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="w-4 h-4 text-purple-600" />
              AI-Recommended Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Current vs Recommended */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* Current Schedule */}
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                  <p className="text-xs font-medium text-slate-500 mb-2">CURRENT SCHEDULE</p>
                  {schedule.current_schedule ? (
                    <>
                      <p className="font-semibold text-slate-900">
                        {schedule.current_schedule.frequency}
                      </p>
                      {schedule.current_schedule.time_of_day && (
                        <p className="text-sm text-slate-600">
                          at {schedule.current_schedule.time_of_day}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-slate-500 italic">Not scheduled</p>
                  )}
                </div>

                {/* Recommended Schedule */}
                <div className="p-4 rounded-lg bg-purple-50 border border-purple-300">
                  <p className="text-xs font-medium text-purple-600 mb-2">AI RECOMMENDED</p>
                  <p className="font-semibold text-purple-900">
                    {schedule.recommended_schedule.frequency}
                  </p>
                  {schedule.recommended_schedule.time_of_day && (
                    <p className="text-sm text-purple-700">
                      at {schedule.recommended_schedule.time_of_day} {schedule.recommended_schedule.timezone}
                    </p>
                  )}
                  {schedule.recommended_schedule.days_of_week && (
                    <p className="text-xs text-purple-600 mt-1">
                      Days: {schedule.recommended_schedule.days_of_week.join(', ')}
                    </p>
                  )}
                </div>
              </div>

              {/* Reasoning */}
              <Alert className="bg-blue-50 border-blue-200">
                <Info className="w-4 h-4" />
                <AlertDescription className="text-sm text-blue-800">
                  <span className="font-semibold">Why this schedule?</span> {schedule.reasoning}
                </AlertDescription>
              </Alert>

              {/* Estimated Improvement */}
              {schedule.estimated_improvement && (
                <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-900">
                      Estimated {schedule.estimated_improvement}% improvement in performance
                    </span>
                  </div>
                </div>
              )}

              {/* Confidence */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">AI Confidence:</span>
                <span className={`text-lg font-bold ${getConfidenceColor(schedule.confidence)}`}>
                  {(schedule.confidence * 100).toFixed(0)}%
                </span>
              </div>

              {/* Apply Button */}
              {schedule.confidence > 0.6 && (
                <Button
                  onClick={handleApplySchedule}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Apply AI-Recommended Schedule
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Recommendations */}
      {analysis?.recommendations && analysis.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              AI Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analysis.recommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border ${getPriorityColor(rec.priority)}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold">{rec.title}</p>
                        <Badge variant="outline" className="text-xs">
                          {rec.priority}
                        </Badge>
                      </div>
                      <p className="text-sm mb-2">{rec.description}</p>
                      {rec.reason && (
                        <p className="text-xs italic opacity-80">{rec.reason}</p>
                      )}
                    </div>
                    {rec.action && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          onApplyRecommendation({
                            type: rec.action,
                            data: rec,
                          })
                        }
                      >
                        <ArrowRight className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Refresh Button */}
      <Button variant="outline" onClick={loadRecommendations} className="w-full">
        <RefreshCw className="w-4 h-4 mr-2" />
        Refresh AI Analysis
      </Button>
    </div>
  );
}
