import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AdCampaign } from '@/api/entities';
import { AdCreative } from '@/api/entities';
import { AdTemplate } from '@/api/entities';
import { User } from '@/api/entities';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Loader2, 
  Plus, 
  Sparkles,
  TrendingUp,
  DollarSign,
  Target,
  Image,
  Info,
  Wand2
} from 'lucide-react';
import { toast } from 'sonner';
import CampaignCard from '../components/ads/CampaignCard';
import AdCreativeCard from '../components/ads/AdCreativeCard';
import AdTemplateCard from '../components/ads/AdTemplateCard';
import CreateCampaignModal from '../components/ads/CreateCampaignModal';
import CreateAdModal from '../components/ads/CreateAdModal';
import ProductAdGenerator from '../components/ads/ProductAdGenerator';
import { handleAuthError } from '../components/utils/authHelpers';
import { useConfirmDialog, ConfirmDialog } from '../components/hooks/useConfirmDialog';
import { NoDataEmptyState } from '../components/common/EmptyState';

export default function Ads() {
  const [campaigns, setCampaigns] = useState([]);
  const [creatives, setCreatives] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showCreativeModal, setShowCreativeModal] = useState(false);
  const [showGeneratorModal, setShowGeneratorModal] = useState(false);
  const [activeTab, setActiveTab] = useState('campaigns');
  const navigate = useNavigate();
  const { isOpen, config, confirm, cancel } = useConfirmDialog();

  // Memoize beta access check
  const hasBetaAccess = useMemo(() => {
    return currentUser && currentUser.user_mode === 'beta';
  }, [currentUser]);

  // Load all ad-related data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [user, campaignsData, creativesData, templatesData] = await Promise.all([
        User.me(),
        AdCampaign.list('-created_date').catch(err => {
          console.error('Error fetching campaigns:', err);
          return [];
        }),
        AdCreative.list('-created_date').catch(err => {
          console.error('Error fetching creatives:', err);
          return [];
        }),
        AdTemplate.list().catch(err => {
          console.error('Error fetching templates:', err);
          return [];
        })
      ]);

      setCurrentUser(user);
      
      // Filter valid data
      const validCampaigns = campaignsData.filter(c => 
        c && typeof c === 'object' && c.id
      );
      const validCreatives = creativesData.filter(c => 
        c && typeof c === 'object' && c.id
      );
      const validTemplates = templatesData.filter(t => 
        t && typeof t === 'object' && t.id
      );
      
      setCampaigns(validCampaigns);
      setCreatives(validCreatives);
      setTemplates(validTemplates);
    } catch (error) {
      console.error('Failed to load ad data:', error);
      
      if (handleAuthError(error, navigate, { showToast: true })) {
        return;
      }
      
      toast.error("Failed to load ad data", {
        description: "Please try refreshing the page."
      });
      
      setCampaigns([]);
      setCreatives([]);
      setTemplates([]);
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Calculate campaign stats
  const campaignStats = useMemo(() => {
    if (campaigns.length === 0) return null;
    
    const active = campaigns.filter(c => c.status === 'active').length;
    const totalSpend = campaigns.reduce((sum, c) => sum + (c.performance_metrics?.spend || 0), 0);
    const totalConversions = campaigns.reduce((sum, c) => sum + (c.performance_metrics?.conversions || 0), 0);
    const avgROAS = campaigns.reduce((sum, c) => sum + (c.performance_metrics?.roas || 0), 0) / campaigns.length;
    
    return {
      active,
      totalSpend,
      totalConversions,
      avgROAS: avgROAS.toFixed(2)
    };
  }, [campaigns]);

  // Handle campaign creation success
  const handleCampaignCreated = useCallback((newCampaign) => {
    setCampaigns(prev => [newCampaign, ...prev]);
    setShowCampaignModal(false);
    toast.success("Campaign created successfully!");
  }, []);

  // Handle creative creation success
  const handleCreativeCreated = useCallback((newCreative) => {
    setCreatives(prev => [newCreative, ...prev]);
    setShowCreativeModal(false);
    toast.success("Ad creative created successfully!");
  }, []);

  // Handle AI-generated ad success
  const handleAdGenerated = useCallback((generatedAd) => {
    setCreatives(prev => [generatedAd, ...prev]);
    setShowGeneratorModal(false);
    toast.success("AI-generated ad created successfully!");
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-slate-600">Loading ad campaigns...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Target className="w-8 h-8 text-indigo-600" />
            Ad Campaigns
          </h1>
          <p className="text-slate-600 mt-1">
            Create and manage advertising campaigns across platforms
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={() => setShowGeneratorModal(true)} variant="outline">
            <Wand2 className="w-4 h-4 mr-2" />
            AI Ad Generator
          </Button>
          <Button onClick={() => setShowCampaignModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Campaign
          </Button>
        </div>
      </div>

      {/* Beta Notice */}
      {hasBetaAccess && (
        <Alert className="border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900">
            Ad campaign management is currently in beta. Connect your Facebook Ads account to get started with AI-powered campaigns.
          </AlertDescription>
        </Alert>
      )}

      {/* Campaign Stats */}
      {campaignStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Active Campaigns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{campaignStats.active}</div>
              <p className="text-xs text-slate-500 mt-1">of {campaigns.length} total</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total Spend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                ${campaignStats.totalSpend.toLocaleString()}
              </div>
              <p className="text-xs text-slate-500 mt-1">across all campaigns</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Conversions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {campaignStats.totalConversions.toLocaleString()}
              </div>
              <p className="text-xs text-slate-500 mt-1">total conversions</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Avg ROAS</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {campaignStats.avgROAS}x
              </div>
              <p className="text-xs text-slate-500 mt-1">return on ad spend</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="campaigns">
            Campaigns ({campaigns.length})
          </TabsTrigger>
          <TabsTrigger value="creatives">
            Creatives ({creatives.length})
          </TabsTrigger>
          <TabsTrigger value="templates">
            Templates ({templates.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="mt-6">
          {campaigns.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {campaigns.map((campaign) => (
                <CampaignCard key={campaign.id} campaign={campaign} />
              ))}
            </div>
          ) : (
            <NoDataEmptyState
              entityName="Campaigns"
              onCreate={() => setShowCampaignModal(true)}
            />
          )}
        </TabsContent>

        <TabsContent value="creatives" className="mt-6">
          <div className="flex justify-end mb-4">
            <Button onClick={() => setShowCreativeModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Ad Creative
            </Button>
          </div>
          
          {creatives.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {creatives.map((creative) => (
                <AdCreativeCard key={creative.id} creative={creative} />
              ))}
            </div>
          ) : (
            <NoDataEmptyState
              entityName="Ad Creatives"
              onCreate={() => setShowCreativeModal(true)}
            />
          )}
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          {templates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((template) => (
                <AdTemplateCard key={template.id} template={template} />
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <Sparkles className="w-12 h-12 mx-auto text-slate-400 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No Templates Available</h3>
              <p className="text-slate-500">
                Ad templates will be added soon to help you create campaigns faster.
              </p>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Modals */}
      {showCampaignModal && (
        <CreateCampaignModal
          onClose={() => setShowCampaignModal(false)}
          onSuccess={handleCampaignCreated}
        />
      )}

      {showCreativeModal && (
        <CreateAdModal
          onClose={() => setShowCreativeModal(false)}
          onSuccess={handleCreativeCreated}
        />
      )}

      {showGeneratorModal && (
        <ProductAdGenerator
          onClose={() => setShowGeneratorModal(false)}
          onSuccess={handleAdGenerated}
        />
      )}

      <ConfirmDialog isOpen={isOpen} config={config} onCancel={cancel} />
    </div>
  );
}