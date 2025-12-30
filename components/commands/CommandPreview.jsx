import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Eye,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Package,
  DollarSign,
  Tag,
  TrendingDown,
  Info,
  Play,
  X
} from 'lucide-react';

export default function CommandPreview({ previewData, onExecute, onCancel }) {
  if (!previewData) return null;

  const { results, summary, estimated_impact } = previewData;

  const getRiskColor = (riskLevel) => {
    switch (riskLevel) {
      case 'low':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'high':
        return 'bg-red-100 text-red-700 border-red-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  const getActionIcon = (actionType) => {
    switch (actionType) {
      case 'update_products':
        return Package;
      case 'apply_discount':
        return TrendingDown;
      case 'update_seo':
        return Tag;
      case 'update_inventory':
        return Package;
      default:
        return Info;
    }
  };

  return (
    <div className="space-y-4">
      {/* Preview Header */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-blue-600" />
            Command Preview - What Will Change
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Impact Summary */}
            {estimated_impact && (
              <Alert className={getRiskColor(estimated_impact.risk_level)}>
                <AlertTriangle className="w-4 h-4" />
                <AlertTitle>
                  Impact Analysis - {estimated_impact.risk_level?.toUpperCase()} Risk
                </AlertTitle>
                <AlertDescription>
                  <p className="font-medium mb-2">{estimated_impact.description}</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="font-semibold">Estimated Items:</span>{' '}
                      {estimated_impact.affected_items_estimate}
                    </div>
                    <div>
                      <span className="font-semibold">Reversible:</span>{' '}
                      {estimated_impact.reversible ? (
                        <CheckCircle className="w-4 h-4 inline text-green-600" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 inline text-red-600" />
                      )}
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-white border border-slate-200">
                <p className="text-xs text-slate-500">Total Actions</p>
                <p className="text-2xl font-bold text-slate-900">{summary?.total_actions || 0}</p>
              </div>
              <div className="p-3 rounded-lg bg-white border border-slate-200">
                <p className="text-xs text-slate-500">Items Affected</p>
                <p className="text-2xl font-bold text-blue-600">
                  {estimated_impact?.affected_items_estimate || 'Unknown'}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-white border border-slate-200">
                <p className="text-xs text-slate-500">Can Undo</p>
                <p className="text-2xl font-bold text-green-600">
                  {estimated_impact?.reversible ? 'Yes' : 'No'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Changes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detailed Changes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {results && results.length > 0 ? (
              results.map((result, index) => {
                const Icon = getActionIcon(result.action);

                return (
                  <div
                    key={index}
                    className="p-4 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-blue-100">
                        <Icon className="w-4 h-4 text-blue-600" />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-slate-900">
                            {result.action.replace(/_/g, ' ').toUpperCase()}
                          </h4>
                          <Badge variant="outline" className="text-xs">
                            {result.platform}
                          </Badge>
                          {result.success ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-red-600" />
                          )}
                        </div>

                        {/* Show specific changes based on result data */}
                        {result.result && (
                          <div className="space-y-2">
                            {/* Product Updates */}
                            {result.result.affected_count !== undefined && (
                              <p className="text-sm text-slate-600">
                                <span className="font-medium">Products Affected:</span>{' '}
                                {result.result.affected_count}
                              </p>
                            )}

                            {/* Discount Preview */}
                            {result.result.discount_type && (
                              <p className="text-sm text-slate-600">
                                <span className="font-medium">Discount:</span>{' '}
                                {result.result.discount_value}
                                {result.result.discount_type === 'percentage' ? '%' : ' off'}
                                {' on '}
                                {result.result.estimated_products} products
                              </p>
                            )}

                            {/* SEO Updates */}
                            {result.result.seo_updates && (
                              <div className="text-sm text-slate-600">
                                <p className="font-medium mb-1">SEO Changes:</p>
                                <ul className="list-disc list-inside space-y-1">
                                  {Object.keys(result.result.seo_updates).map((key) => (
                                    <li key={key}>
                                      {key}: {result.result.seo_updates[key]}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Before/After for Updates */}
                            {result.result.results && result.result.results.length > 0 && (
                              <div className="mt-3">
                                <p className="text-xs font-medium text-slate-500 mb-2">
                                  Sample Changes (first 3):
                                </p>
                                {result.result.results.slice(0, 3).map((item, idx) => (
                                  <div
                                    key={idx}
                                    className="p-2 rounded bg-white border border-slate-200 mb-2"
                                  >
                                    {item.product_title && (
                                      <p className="text-xs font-medium text-slate-700 mb-1">
                                        {item.product_title}
                                      </p>
                                    )}
                                    {item.before && item.after && (
                                      <div className="flex items-center gap-2 text-xs">
                                        <span className="text-red-600">Before: {JSON.stringify(item.before).substring(0, 50)}...</span>
                                        <ArrowRight className="w-3 h-3" />
                                        <span className="text-green-600">After: {JSON.stringify(item.after).substring(0, 50)}...</span>
                                      </div>
                                    )}
                                    {item.simulated && (
                                      <Badge variant="outline" className="text-xs mt-1">
                                        Simulated
                                      </Badge>
                                    )}
                                  </div>
                                ))}
                                {result.result.affected_count > 3 && (
                                  <p className="text-xs text-slate-500 mt-2">
                                    + {result.result.affected_count - 3} more items...
                                  </p>
                                )}
                              </div>
                            )}

                            {/* Conditional Update Preview */}
                            {result.result.then_action_preview && (
                              <div className="mt-3 p-2 rounded bg-green-50 border border-green-200">
                                <p className="text-xs font-medium text-green-700 mb-1">
                                  IF Condition Met ({result.result.condition_met_count} products):
                                </p>
                                <p className="text-xs text-green-600">
                                  Then: {result.result.then_action_preview.action.type}
                                </p>
                                {result.result.then_action_preview.sample_products && (
                                  <div className="mt-1">
                                    <p className="text-xs text-slate-600">Sample products:</p>
                                    <ul className="text-xs text-slate-500">
                                      {result.result.then_action_preview.sample_products.map((p) => (
                                        <li key={p.id}>• {p.title}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            )}

                            {result.result.else_action_preview && (
                              <div className="mt-2 p-2 rounded bg-amber-50 border border-amber-200">
                                <p className="text-xs font-medium text-amber-700 mb-1">
                                  ELSE ({result.result.condition_not_met_count} products):
                                </p>
                                <p className="text-xs text-amber-600">
                                  Else: {result.result.else_action_preview.action.type}
                                </p>
                              </div>
                            )}

                            {/* Generic Message */}
                            {result.result.message && (
                              <p className="text-sm text-slate-600 italic">{result.result.message}</p>
                            )}
                          </div>
                        )}

                        {/* Error Display */}
                        {result.error && (
                          <Alert variant="destructive" className="mt-2">
                            <AlertDescription className="text-xs">{result.error}</AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-center text-slate-500 py-8">No preview data available</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-between gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
        <div className="text-sm text-slate-600">
          <p className="font-medium">Ready to execute?</p>
          <p className="text-xs">This preview shows what will happen when you run this command.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={onExecute} className="bg-green-600 hover:bg-green-700">
            <Play className="w-4 h-4 mr-2" />
            Execute Command
          </Button>
        </div>
      </div>
    </div>
  );
}
