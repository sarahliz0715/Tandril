import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  X,
  Loader2,
  FileText,
  Hash,
  MessageSquare,
  Image as ImageIcon,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { api } from '@/lib/apiClient';
import { toast } from 'sonner';
import { handleAuthError } from '@/utils/authHelpers';
import { useNavigate } from 'react-router-dom';

export default function ContentGeneratorModal({ isOpen, onClose, selectedProducts = [], platformId = null }) {
  const [contentType, setContentType] = useState('description');
  const [tone, setTone] = useState('professional');
  const [targetAudience, setTargetAudience] = useState('general');
  const [applyToStore, setApplyToStore] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState(null);
  const navigate = useNavigate();

  const contentTypes = [
    { value: 'description', label: 'Product Description', icon: FileText, description: 'Compelling descriptions highlighting features & benefits' },
    { value: 'title', label: 'Product Title', icon: Hash, description: 'SEO-optimized titles (50-70 characters)' },
    { value: 'meta', label: 'Meta Description', icon: MessageSquare, description: 'SEO meta descriptions for search results' },
    { value: 'social', label: 'Social Caption', icon: MessageSquare, description: 'Engaging captions for Instagram/Facebook' },
    { value: 'alt_text', label: 'Image Alt Text', icon: ImageIcon, description: 'Accessible alt text for product images' },
  ];

  const tones = [
    { value: 'professional', label: 'Professional' },
    { value: 'casual', label: 'Casual & Friendly' },
    { value: 'luxury', label: 'Luxury & Premium' },
    { value: 'playful', label: 'Playful & Fun' },
  ];

  const audiences = [
    { value: 'general', label: 'General Consumers' },
    { value: 'b2b', label: 'Business (B2B)' },
    { value: 'b2c', label: 'Consumers (B2C)' },
    { value: 'youth', label: 'Young Adults' },
    { value: 'premium', label: 'Luxury Buyers' },
  ];

  const handleGenerate = async () => {
    if (selectedProducts.length === 0) {
      toast.error("No products selected");
      return;
    }

    if (applyToStore && !platformId) {
      toast.error("Platform ID required to apply changes");
      return;
    }

    setIsGenerating(true);
    setResults(null);

    try {
      const data = await api.functions.generateAIContent({
        content_type: contentType,
        product_ids: selectedProducts,
        tone,
        target_audience: targetAudience,
        apply_to_store: applyToStore,
        platform_id: platformId
      });

      setResults(data);

      if (applyToStore) {
        toast.success(`Content applied to ${data.summary.successful} products!`);
      } else {
        toast.success(`Generated content for ${data.summary.successful} products`);
      }
    } catch (error) {
      console.error('Failed to generate content:', error);

      if (handleAuthError(error, navigate, { showToast: true })) {
        return;
      }

      toast.error("Failed to generate content", {
        description: error.message
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  const selectedContentType = contentTypes.find(ct => ct.value === contentType);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-purple-600" />
              AI Content Generator
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
          <p className="text-sm text-slate-600 mt-2">
            Generate professional content for {selectedProducts.length} {selectedProducts.length === 1 ? 'product' : 'products'} using AI
          </p>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Content Type Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">Content Type</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {contentTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.value}
                    onClick={() => setContentType(type.value)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      contentType === type.value
                        ? 'border-purple-600 bg-purple-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-4 h-4" />
                      <span className="font-medium text-sm">{type.label}</span>
                    </div>
                    <p className="text-xs text-slate-600">{type.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tone Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Tone & Style</label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {tones.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Target Audience */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Target Audience</label>
            <select
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {audiences.map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </div>

          {/* Apply to Store Option */}
          <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <input
              type="checkbox"
              id="applyToStore"
              checked={applyToStore}
              onChange={(e) => setApplyToStore(e.target.checked)}
              className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
            />
            <label htmlFor="applyToStore" className="flex-1 text-sm">
              <span className="font-medium text-slate-900">Apply changes to Shopify store</span>
              <p className="text-xs text-slate-600 mt-1">
                Content will be automatically updated in your store. Without this, you'll just see a preview.
              </p>
            </label>
          </div>

          {/* Results */}
          {results && (
            <div className="border-t pt-6">
              <h3 className="font-semibold text-slate-900 mb-3">Generated Content</h3>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {results.results.map((result, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${
                      result.success
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {result.success ? (
                        <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900">{result.product_title}</p>
                        {result.success && result.generated_content && (
                          <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                            {result.generated_content.content || 'Content generated successfully'}
                          </p>
                        )}
                        {!result.success && (
                          <p className="text-xs text-red-600 mt-1">{result.error}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Content
                </>
              )}
            </Button>
            <Button onClick={onClose} variant="outline">
              {results ? 'Done' : 'Cancel'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
