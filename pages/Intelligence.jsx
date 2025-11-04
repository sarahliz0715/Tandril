import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Loader2, 
  TrendingUp,
  RefreshCw,
  Sparkles,
  Info,
  Target,
  BarChart3,
  Search,
  Settings,
  Plus,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import TrendingProductsCard from '../components/intelligence/TrendingProductsCard';
import NicheAnalysisCard from '../components/intelligence/NicheAnalysisCard';
import CompetitorInsightsCard from '../components/intelligence/CompetitorInsightsCard';
import KeywordOpportunitiesCard from '../components/intelligence/KeywordOpportunitiesCard';
import { handleAuthError } from '../components/utils/authHelpers';
import { useConfirmDialog, ConfirmDialog } from '../components/hooks/useConfirmDialog';
import { NoDataEmptyState } from '../components/common/EmptyState';

export default function Intelligence() {
  const [intelligence, setIntelligence] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('trending');
  const [customNiche, setCustomNiche] = useState('');
  const [selectedNiches, setSelectedNiches] = useState([]);
  const [showNicheInput, setShowNicheInput] = useState(false);
  const navigate = useNavigate();
  const { isOpen, config, confirm, cancel } = useConfirmDialog();

  // Memoize beta access check
  const hasBetaAccess = useMemo(() => {
    return currentUser && currentUser.user_mode === 'beta';
  }, [currentUser]);

  // Get user's saved niches
  const userNiches = useMemo(() => {
    const niches = currentUser?.business_info?.niches || [];
    const legacyNiche = currentUser?.business_info?.niche;
    
    if (niches.length === 0 && legacyNiche) {
      return [legacyNiche];
    }
    
    return niches.length > 0 ? niches : ['print on demand'];
  }, [currentUser]);

  // Initialize selected niches when user loads
  useEffect(() => {
    if (userNiches.length > 0 && selectedNiches.length === 0) {
      setSelectedNiches(userNiches);
    }
  }, [userNiches]);

  // Group intelligence by type and category
  const groupedIntelligence = useMemo(() => {
    const groups = {
      trending_products: [],
      niche_analysis: [],
      competitor_analysis: [],
      keyword_performance: []
    };
    
    intelligence.forEach(item => {
      if (item.data_type && groups[item.data_type]) {
        groups[item.data_type].push(item);
      }
    });
    
    return groups;
  }, [intelligence]);

  // Load intelligence data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [user, intelligenceData] = await Promise.all([
        base44.auth.me(),
        base44.entities.MarketIntelligence.list('-created_date').catch(err => {
          console.error('Error fetching intelligence:', err);
          return [];
        })
      ]);

      setCurrentUser(user);
      
      // Filter valid intelligence data
      const validIntelligence = intelligenceData.filter(item => 
        item && typeof item === 'object' && item.id
      );
      
      setIntelligence(validIntelligence);
    } catch (error) {
      console.error('Failed to load market intelligence:', error);
      
      if (handleAuthError(error, navigate, { showToast: true })) {
        return;
      }
      
      toast.error("Failed to load market intelligence", {
        description: "Please try refreshing the page."
      });
      
      setIntelligence([]);
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Toggle niche selection
  const handleToggleNiche = (niche) => {
    if (selectedNiches.includes(niche)) {
      setSelectedNiches(selectedNiches.filter(n => n !== niche));
    } else {
      setSelectedNiches([...selectedNiches, niche]);
    }
  };

  // Add custom niche
  const handleAddCustomNiche = () => {
    const trimmedNiche = customNiche.trim();
    if (!trimmedNiche) {
      toast.error("Please enter a niche");
      return;
    }
    
    if (selectedNiches.includes(trimmedNiche)) {
      toast.error("This niche is already selected");
      return;
    }
    
    setSelectedNiches([...selectedNiches, trimmedNiche]);
    setCustomNiche('');
    toast.success(`Added "${trimmedNiche}" for analysis`);
  };

  // Generate new intelligence
  const handleGenerateIntelligence = useCallback(async () => {
    if (selectedNiches.length === 0) {
      toast.error("Please select at least one niche to analyze");
      return;
    }

    await confirm({
      title: 'Generate Market Intelligence?',
      description: `This will analyze current market trends, competitors, and opportunities for ${selectedNiches.length} ${selectedNiches.length === 1 ? 'niche' : 'niches'}: ${selectedNiches.join(', ')}. It may take a few moments.`,
      confirmText: 'Generate',
      onConfirm: async () => {
        setIsGenerating(true);
        try {
          // Generate intelligence for each selected niche
          const promises = selectedNiches.map(niche => 
            base44.functions.invoke('generateMarketIntelligence', {
              analysis_types: ['trending_products', 'niche_analysis', 'competitor_analysis', 'keyword_performance'],
              category: niche
            })
          );

          const results = await Promise.allSettled(promises);
          
          const successCount = results.filter(r => r.status === 'fulfilled' && r.value?.data?.success).length;
          const failCount = results.length - successCount;

          if (successCount > 0) {
            toast.success(`Market intelligence generated for ${successCount} ${successCount === 1 ? 'niche' : 'niches'}!`, {
              description: failCount > 0 ? `${failCount} ${failCount === 1 ? 'niche' : 'niches'} failed to generate.` : undefined
            });
            loadData();
          } else {
            throw new Error('Failed to generate intelligence for any niche');
          }
        } catch (error) {
          console.error('Intelligence generation error:', error);
          
          if (handleAuthError(error, navigate)) {
            return;
          }
          
          toast.error("Failed to generate intelligence", {
            description: error.response?.data?.error || error.message || "Please try again."
          });
        } finally {
          setIsGenerating(false);
        }
      }
    });
  }, [confirm, navigate, loadData, selectedNiches]);

  // Save selected niches to profile
  const handleSaveNichesToProfile = useCallback(async () => {
    if (selectedNiches.length === 0) {
      toast.error("Please select at least one niche");
      return;
    }

    try {
      await base44.auth.updateMe({
        business_info: {
          ...currentUser?.business_info,
          niches: selectedNiches,
          niche: selectedNiches[0] // Keep first as legacy field
        }
      });
      
      const updatedUser = await base44.auth.me();
      setCurrentUser(updatedUser);
      
      toast.success("Niches saved to your profile!");
      setShowNicheInput(false);
    } catch (error) {
      console.error('Error saving niches:', error);
      
      if (handleAuthError(error, navigate)) {
        return;
      }
      
      toast.error("Failed to save niches");
    }
  }, [selectedNiches, currentUser, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-slate-600">Loading market intelligence...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-green-600" />
            Market Intelligence
          </h1>
          <p className="text-slate-600 mt-1">
            AI-powered insights for your niches
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => setShowNicheInput(!showNicheInput)}
          >
            <Settings className="w-4 h-4 mr-2" />
            {showNicheInput ? 'Hide' : 'Manage Niches'}
          </Button>
          <Button 
            onClick={handleGenerateIntelligence} 
            disabled={isGenerating || selectedNiches.length === 0}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Generate Intelligence
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Niche Selection Section */}
      <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-600" />
            Selected Niches ({selectedNiches.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Selected Niches Display */}
          {selectedNiches.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {selectedNiches.map((niche, index) => (
                <Badge 
                  key={index}
                  className="px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 flex items-center gap-2"
                >
                  {niche}
                  <button
                    onClick={() => handleToggleNiche(niche)}
                    className="hover:text-red-200 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-600 italic">
              No niches selected. Select niches below or add a custom one.
            </p>
          )}

          {showNicheInput && (
            <>
              {/* Saved Niches Checkboxes */}
              {userNiches.length > 0 && (
                <div>
                  <Label className="text-sm font-semibold text-slate-700 mb-2 block">
                    Your Saved Niches
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {userNiches.map((niche, index) => (
                      <div key={index} className="flex items-center space-x-2 bg-white p-3 rounded-md border border-slate-200">
                        <Checkbox
                          id={`niche-${index}`}
                          checked={selectedNiches.includes(niche)}
                          onCheckedChange={() => handleToggleNiche(niche)}
                        />
                        <label
                          htmlFor={`niche-${index}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {niche}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add Custom Niche */}
              <div>
                <Label className="text-sm font-semibold text-slate-700 mb-2 block">
                  Add Custom Niche
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., vintage band t-shirts, eco-friendly tote bags..."
                    value={customNiche}
                    onChange={(e) => setCustomNiche(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomNiche();
                      }
                    }}
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleAddCustomNiche}
                    variant="outline"
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </div>
              </div>

              {/* Save to Profile Button */}
              <div className="flex gap-2 pt-2 border-t border-indigo-200">
                <Button onClick={handleSaveNichesToProfile} size="sm">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Save Selected Niches to Profile
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedNiches(userNiches)}
                >
                  Reset to Saved
                </Button>
              </div>

              <Alert className="bg-white/50">
                <Info className="h-4 w-4 text-indigo-600" />
                <AlertDescription className="text-slate-700">
                  <strong>Tip:</strong> Be specific! Instead of "clothing," try "sustainable athletic wear" or "vintage band t-shirts" for better insights.
                </AlertDescription>
              </Alert>
            </>
          )}
        </CardContent>
      </Card>

      {/* Beta Notice */}
      {hasBetaAccess && (
        <Alert className="border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900">
            Market intelligence features are being refined for the beta release. More insights coming soon!
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
          <TabsTrigger value="trending">
            Trending Products
          </TabsTrigger>
          <TabsTrigger value="niches">
            Niche Analysis
          </TabsTrigger>
          <TabsTrigger value="competitors">
            Competitors
          </TabsTrigger>
          <TabsTrigger value="keywords">
            Keywords
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trending" className="mt-6">
          {groupedIntelligence.trending_products.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {groupedIntelligence.trending_products.map((item) => (
                <TrendingProductsCard key={item.id} data={item} />
              ))}
            </div>
          ) : (
            <NoDataEmptyState
              entityName="Trending Products Intelligence"
              onCreate={handleGenerateIntelligence}
            />
          )}
        </TabsContent>

        <TabsContent value="niches" className="mt-6">
          {groupedIntelligence.niche_analysis.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {groupedIntelligence.niche_analysis.map((item) => (
                <NicheAnalysisCard key={item.id} data={item} />
              ))}
            </div>
          ) : (
            <NoDataEmptyState
              entityName="Niche Analysis"
              onCreate={handleGenerateIntelligence}
            />
          )}
        </TabsContent>

        <TabsContent value="competitors" className="mt-6">
          {groupedIntelligence.competitor_analysis.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {groupedIntelligence.competitor_analysis.map((item) => (
                <CompetitorInsightsCard key={item.id} data={item} />
              ))}
            </div>
          ) : (
            <NoDataEmptyState
              entityName="Competitor Intelligence"
              onCreate={handleGenerateIntelligence}
            />
          )}
        </TabsContent>

        <TabsContent value="keywords" className="mt-6">
          {groupedIntelligence.keyword_performance.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {groupedIntelligence.keyword_performance.map((item) => (
                <KeywordOpportunitiesCard key={item.id} data={item} />
              ))}
            </div>
          ) : (
            <NoDataEmptyState
              entityName="Keyword Intelligence"
              onCreate={handleGenerateIntelligence}
            />
          )}
        </TabsContent>
      </Tabs>

      <ConfirmDialog isOpen={isOpen} config={config} onCancel={cancel} />
    </div>
  );
}