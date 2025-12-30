import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { api } from '@/api/apiClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
    Sparkles, Bot, Store, Loader2, CheckCircle, 
    Package, TrendingUp, Mail, DollarSign, AlertTriangle,
    BarChart, Clock, Zap, Target, MessageSquare, ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import ShopifyConnectButton from '../platforms/ShopifyConnectButton';
import AIAvatar from '../advisor/AIAvatar';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const WORKFLOW_PRESETS = [
    {
        id: 'weekly_inventory',
        name: 'Weekly Inventory Health Check',
        description: 'Every Monday at 9 AM, scan inventory and alert on low stock items',
        icon: Package,
        category: 'inventory',
        schedule: 'weekly',
        commands: ['Check inventory levels and alert me to any products with less than 10 units in stock']
    },
    {
        id: 'seo_optimization',
        name: 'Weekly SEO Optimizer',
        description: 'Every Sunday, optimize SEO for your top 10 products',
        icon: TrendingUp,
        category: 'marketing',
        schedule: 'weekly',
        commands: ['Analyze and update SEO titles and descriptions for my top 10 best-selling products']
    },
    {
        id: 'daily_performance',
        name: 'Daily Performance Report',
        description: 'Morning email with yesterday\'s key metrics and insights',
        icon: BarChart,
        category: 'analytics',
        schedule: 'daily',
        commands: ['Generate a summary of yesterday\'s sales, orders, and top products']
    },
    {
        id: 'price_monitoring',
        name: 'Competitor Price Monitor',
        description: 'Weekly check for competitive pricing opportunities',
        icon: DollarSign,
        category: 'pricing',
        schedule: 'weekly',
        commands: ['Analyze my product pricing and suggest adjustments based on market trends']
    },
    {
        id: 'low_stock_daily',
        name: 'Daily Low Stock Alerts',
        description: 'Get notified every morning about products running low',
        icon: AlertTriangle,
        category: 'inventory',
        schedule: 'daily',
        commands: ['Check for products with less than 5 units in stock and create alerts']
    },
    {
        id: 'weekend_sales_boost',
        name: 'Weekend Sales Booster',
        description: 'Friday afternoon: Optimize featured products for weekend traffic',
        icon: Target,
        category: 'marketing',
        schedule: 'weekly',
        commands: ['Update featured products and ensure SEO is optimized for weekend shoppers']
    },
    {
        id: 'monthly_bestsellers',
        name: 'Monthly Bestseller Analysis',
        description: 'First of each month: Analyze top performers and create marketing plan',
        icon: TrendingUp,
        category: 'analytics',
        schedule: 'monthly',
        commands: ['Analyze last month\'s best sellers and suggest marketing strategies for next month']
    },
    {
        id: 'new_product_seo',
        name: 'New Product SEO Setup',
        description: 'Automatically optimize SEO for any new products added',
        icon: Sparkles,
        category: 'automation',
        schedule: 'event',
        commands: ['When a new product is added, generate optimized SEO title, description, and tags']
    },
    {
        id: 'bi_weekly_catalog',
        name: 'Bi-Weekly Catalog Refresh',
        description: 'Every 2 weeks: Update product descriptions and images',
        icon: Package,
        category: 'products',
        schedule: 'bi-weekly',
        commands: ['Review and refresh product descriptions for my entire catalog to keep content fresh']
    },
    {
        id: 'smart_restock',
        name: 'Smart Restocking Assistant',
        description: 'Weekly analysis of sales velocity with restock recommendations',
        icon: Clock,
        category: 'inventory',
        schedule: 'weekly',
        commands: ['Analyze sales velocity and suggest which products to restock based on demand trends']
    }
];

export default function BetaOnboardingFlow() {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1);
    const [userMode, setUserMode] = useState(null); // 'demo' or 'live'
    const [shopifyConnected, setShopifyConnected] = useState(false);
    const [syncInProgress, setSyncInProgress] = useState(false);
    const [syncComplete, setSyncComplete] = useState(false);
    const [productCount, setProductCount] = useState(0);
    const [userChallenge, setUserChallenge] = useState('');
    const [orionResponse, setOrionResponse] = useState('');
    const [suggestedWorkflow, setSuggestedWorkflow] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [selectedWorkflow, setSelectedWorkflow] = useState(null);
    const [isCreatingWorkflow, setIsCreatingWorkflow] = useState(false);

    useEffect(() => {
        const checkExistingUser = async () => {
            try {
                const user = await api.auth.me();
                if (user.onboarding_completed) {
                    navigate(createPageUrl('Dashboard'));
                }
            } catch (error) {
                console.log('User check failed:', error);
            }
        };
        checkExistingUser();
    }, [navigate]);

    const handleModeSelection = async (mode) => {
        setUserMode(mode);
        
        if (mode === 'demo') {
            // Demo mode - update user and go straight to dashboard
            try {
                await api.auth.updateMe({ 
                    user_mode: 'demo',
                    onboarding_completed: true 
                });
                toast.success("Demo Mode Activated!", {
                    description: "Explore Tandril with sample data. Switch to Live Mode anytime from Settings."
                });
                navigate(createPageUrl('Dashboard'));
            } catch (error) {
                console.error('Error setting demo mode:', error);
                toast.error("Failed to activate demo mode");
            }
        } else {
            // Live mode - continue to next step
            await api.auth.updateMe({ user_mode: 'live' });
            setCurrentStep(2);
        }
    };

    const handleShopifyConnected = async () => {
        setShopifyConnected(true);
        setCurrentStep(3);
        setSyncInProgress(true);
        
        // Simulate sync process (in reality, this happens via backend)
        setTimeout(async () => {
            try {
                // Check if products were synced
                const products = await api.entities.InventoryItem.list();
                setProductCount(products.length);
                setSyncInProgress(false);
                setSyncComplete(true);
                
                setTimeout(() => {
                    setCurrentStep(4);
                }, 2000);
            } catch (error) {
                console.error('Sync check failed:', error);
                setSyncInProgress(false);
                setSyncComplete(true);
                setProductCount(0);
                setTimeout(() => {
                    setCurrentStep(4);
                }, 2000);
            }
        }, 3000);
    };

    const handleSkipShopify = () => {
        setCurrentStep(4);
    };

    const handleChallengeSubmit = async () => {
        if (!userChallenge.trim()) {
            toast.error("Please share your biggest challenge");
            return;
        }

        setIsAnalyzing(true);

        try {
            // Use AI to analyze the challenge and suggest a workflow
            const response = await api.integrations.Core.InvokeLLM({
                prompt: `A Shopify seller just told me their biggest challenge is: "${userChallenge}"

Based on this challenge, I need to:
1. Provide a warm, encouraging response (2-3 sentences)
2. Suggest which of these workflows would help them most (return just the workflow ID)

Workflows available:
${WORKFLOW_PRESETS.map(w => `- ${w.id}: ${w.name} - ${w.description}`).join('\n')}

Return JSON with:
- response: Your encouraging message to the seller
- suggested_workflow_id: The ID of the most helpful workflow`,
                response_json_schema: {
                    type: 'object',
                    properties: {
                        response: { type: 'string' },
                        suggested_workflow_id: { type: 'string' }
                    }
                }
            });

            setOrionResponse(response.response);
            const suggested = WORKFLOW_PRESETS.find(w => w.id === response.suggested_workflow_id);
            setSuggestedWorkflow(suggested || WORKFLOW_PRESETS[0]);
            
            setIsAnalyzing(false);
            setCurrentStep(4.5);
        } catch (error) {
            console.error('Error analyzing challenge:', error);
            setOrionResponse("I understand - managing a Shopify store can be overwhelming! Let me help you automate some of that work.");
            setSuggestedWorkflow(WORKFLOW_PRESETS[0]);
            setIsAnalyzing(false);
            setCurrentStep(4.5);
        }
    };

    const handleWorkflowSelection = (workflow) => {
        setSelectedWorkflow(workflow);
    };

    const handleCreateWorkflow = async () => {
        if (!selectedWorkflow) {
            toast.error("Please select a workflow to set up");
            return;
        }

        setIsCreatingWorkflow(true);

        try {
            // Create the workflow
            await api.entities.AIWorkflow.create({
                name: selectedWorkflow.name,
                description: selectedWorkflow.description,
                trigger_type: selectedWorkflow.schedule === 'event' ? 'event' : 'schedule',
                trigger_config: {
                    schedule: selectedWorkflow.schedule,
                    enabled: true
                },
                commands: selectedWorkflow.commands,
                is_active: true
            });

            toast.success("Workflow Created!", {
                description: `${selectedWorkflow.name} is now active and will run automatically.`
            });

            setIsCreatingWorkflow(false);
            setCurrentStep(5);
        } catch (error) {
            console.error('Error creating workflow:', error);
            toast.error("Failed to create workflow");
            setIsCreatingWorkflow(false);
        }
    };

    const handleSkipWorkflow = () => {
        setCurrentStep(5);
    };

    const handleComplete = async () => {
        try {
            await api.auth.updateMe({ onboarding_completed: true });
            toast.success("Welcome to Tandril! 🎉", {
                description: "You're all set up and ready to grow your business with AI."
            });
            navigate(createPageUrl('Dashboard'));
        } catch (error) {
            console.error('Error completing onboarding:', error);
            toast.error("Failed to complete onboarding");
        }
    };

    // Step 1: Mode Selection
    if (currentStep === 1) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
                <Card className="w-full max-w-2xl">
                    <CardHeader className="text-center">
                        <div className="mb-4 flex justify-center">
                            <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
                                <Sparkles className="w-8 h-8 text-white" />
                            </div>
                        </div>
                        <CardTitle className="text-3xl">Welcome to Tandril Beta! 🎉</CardTitle>
                        <CardDescription className="text-lg mt-2">
                            Thank you for being an early tester. Let's get you set up!
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="text-center mb-6">
                            <p className="text-slate-600">
                                Choose how you'd like to start:
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <Card 
                                className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-indigo-400"
                                onClick={() => handleModeSelection('demo')}
                            >
                                <CardContent className="p-6 text-center">
                                    <div className="mb-4 flex justify-center">
                                        <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                                            <Zap className="w-6 h-6 text-amber-600" />
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900 mb-2">Demo Mode</h3>
                                    <p className="text-sm text-slate-600 mb-4">
                                        Explore with sample data. Perfect for testing features without connecting your real store.
                                    </p>
                                    <Button className="w-full bg-amber-500 hover:bg-amber-600">
                                        Start Exploring
                                    </Button>
                                </CardContent>
                            </Card>

                            <Card 
                                className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-green-400"
                                onClick={() => handleModeSelection('live')}
                            >
                                <CardContent className="p-6 text-center">
                                    <div className="mb-4 flex justify-center">
                                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                            <Store className="w-6 h-6 text-green-600" />
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900 mb-2">Live Mode</h3>
                                    <p className="text-sm text-slate-600 mb-4">
                                        Connect your Shopify store and let Orion help optimize your real business.
                                    </p>
                                    <Button className="w-full bg-green-500 hover:bg-green-600">
                                        Connect Shopify
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Step 2: Connect Shopify
    if (currentStep === 2) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
                <Card className="w-full max-w-2xl">
                    <CardHeader>
                        <div className="flex items-center gap-4 mb-4">
                            <AIAvatar size="lg" />
                            <div>
                                <CardTitle className="text-2xl">Hi! I'm Orion 👋</CardTitle>
                                <CardDescription>Your AI business partner</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
                            <p className="text-slate-700 text-lg mb-4">
                                Let's connect your Shopify store so I can help optimize your business and automate tedious tasks.
                            </p>
                            <p className="text-sm text-slate-600">
                                Don't worry - I'll only make changes when you approve them. You're always in control.
                            </p>
                        </div>

                        <div className="flex flex-col gap-3">
                            <ShopifyConnectButton 
                                onSuccess={handleShopifyConnected}
                                buttonText="Connect My Shopify Store"
                                fullWidth={true}
                            />
                            
                            <Button 
                                variant="ghost" 
                                onClick={handleSkipShopify}
                                className="text-slate-500"
                            >
                                Skip for now (I'll connect later)
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Step 3: Syncing
    if (currentStep === 3) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
                <Card className="w-full max-w-2xl">
                    <CardContent className="p-12 text-center">
                        {syncInProgress && (
                            <>
                                <Loader2 className="w-16 h-16 text-indigo-600 animate-spin mx-auto mb-6" />
                                <h2 className="text-2xl font-bold text-slate-900 mb-3">
                                    Analyzing Your Store...
                                </h2>
                                <p className="text-slate-600">
                                    I'm reviewing your products, inventory, and store setup. This should only take a moment.
                                </p>
                            </>
                        )}
                        
                        {syncComplete && (
                            <>
                                <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-6" />
                                <h2 className="text-2xl font-bold text-slate-900 mb-3">
                                    All Set! ✨
                                </h2>
                                <p className="text-slate-600 mb-2">
                                    Found {productCount} products in your store
                                </p>
                                <p className="text-sm text-slate-500">
                                    Continuing to setup...
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Step 4: Chat with Orion
    if (currentStep === 4) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
                <Card className="w-full max-w-2xl">
                    <CardHeader>
                        <div className="flex items-center gap-4">
                            <AIAvatar size="lg" />
                            <div>
                                <CardTitle className="text-2xl">Let's Get To Know Each Other</CardTitle>
                                <CardDescription>This helps me provide better recommendations</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                            <p className="text-slate-700 text-lg font-medium mb-4">
                                What's your biggest challenge with managing your Shopify store?
                            </p>
                            <p className="text-sm text-slate-600">
                                For example: keeping product descriptions updated, managing inventory, finding time for SEO, tracking competitors, etc.
                            </p>
                        </div>

                        <Textarea
                            value={userChallenge}
                            onChange={(e) => setUserChallenge(e.target.value)}
                            placeholder="I struggle most with..."
                            className="min-h-[120px] text-base"
                        />

                        <Button 
                            onClick={handleChallengeSubmit}
                            className="w-full bg-indigo-600 hover:bg-indigo-700"
                            size="lg"
                            disabled={isAnalyzing || !userChallenge.trim()}
                        >
                            {isAnalyzing ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Analyzing...
                                </>
                            ) : (
                                <>
                                    Continue
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Step 4.5: Workflow Suggestion
    if (currentStep === 4.5) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4 overflow-y-auto">
                <div className="max-w-4xl mx-auto py-8">
                    <Card className="mb-6">
                        <CardHeader>
                            <div className="flex items-center gap-4">
                                <AIAvatar size="lg" />
                                <div className="flex-1">
                                    <CardTitle className="text-2xl">I Can Help With That! 💡</CardTitle>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6 mb-6">
                                <p className="text-slate-700 text-lg">
                                    {orionResponse}
                                </p>
                            </div>

                            {suggestedWorkflow && (
                                <div className="mb-6">
                                    <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                                        <Sparkles className="w-5 h-5 text-amber-500" />
                                        Recommended For You:
                                    </h3>
                                    <Card 
                                        className={`cursor-pointer transition-all border-2 ${
                                            selectedWorkflow?.id === suggestedWorkflow.id 
                                                ? 'border-indigo-500 shadow-lg' 
                                                : 'border-amber-300 hover:border-amber-400'
                                        }`}
                                        onClick={() => handleWorkflowSelection(suggestedWorkflow)}
                                    >
                                        <CardContent className="p-6">
                                            <div className="flex items-start gap-4">
                                                <div className="p-3 bg-amber-100 rounded-lg">
                                                    <suggestedWorkflow.icon className="w-6 h-6 text-amber-600" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <h4 className="font-bold text-lg text-slate-900">{suggestedWorkflow.name}</h4>
                                                        <Badge className="bg-amber-100 text-amber-800">Recommended</Badge>
                                                    </div>
                                                    <p className="text-slate-600 mb-2">{suggestedWorkflow.description}</p>
                                                    <Badge variant="outline" className="text-xs">
                                                        {suggestedWorkflow.schedule}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            )}

                            <div className="mb-4">
                                <h3 className="text-lg font-semibold text-slate-900 mb-3">
                                    Or Choose From These Popular Workflows:
                                </h3>
                                <div className="grid md:grid-cols-2 gap-3">
                                    {WORKFLOW_PRESETS.filter(w => w.id !== suggestedWorkflow?.id).map((workflow) => (
                                        <Card 
                                            key={workflow.id}
                                            className={`cursor-pointer transition-all border hover:shadow-md ${
                                                selectedWorkflow?.id === workflow.id 
                                                    ? 'border-indigo-500 shadow-lg' 
                                                    : 'border-slate-200'
                                            }`}
                                            onClick={() => handleWorkflowSelection(workflow)}
                                        >
                                            <CardContent className="p-4">
                                                <div className="flex items-start gap-3">
                                                    <div className="p-2 bg-indigo-50 rounded-lg">
                                                        <workflow.icon className="w-5 h-5 text-indigo-600" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-semibold text-sm text-slate-900 mb-1">
                                                            {workflow.name}
                                                        </h4>
                                                        <p className="text-xs text-slate-600 line-clamp-2">
                                                            {workflow.description}
                                                        </p>
                                                        <Badge variant="outline" className="text-xs mt-2">
                                                            {workflow.schedule}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <Button 
                                    onClick={handleCreateWorkflow}
                                    className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                                    size="lg"
                                    disabled={!selectedWorkflow || isCreatingWorkflow}
                                >
                                    {isCreatingWorkflow ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Setting Up...
                                        </>
                                    ) : (
                                        <>
                                            <Zap className="w-4 h-4 mr-2" />
                                            Activate This Workflow
                                        </>
                                    )}
                                </Button>
                                <Button 
                                    variant="outline"
                                    onClick={handleSkipWorkflow}
                                    size="lg"
                                >
                                    Skip For Now
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    // Step 5: Complete
    if (currentStep === 5) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
                <Card className="w-full max-w-2xl">
                    <CardContent className="p-12 text-center">
                        <div className="mb-6 flex justify-center">
                            <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
                                <CheckCircle className="w-10 h-10 text-white" />
                            </div>
                        </div>
                        
                        <h2 className="text-3xl font-bold text-slate-900 mb-4">
                            You're All Set! 🎉
                        </h2>
                        
                        <p className="text-lg text-slate-600 mb-8">
                            Welcome to Tandril! Here's what you can do next:
                        </p>

                        <div className="grid md:grid-cols-3 gap-4 mb-8">
                            <div className="bg-white border border-slate-200 rounded-lg p-4">
                                <MessageSquare className="w-8 h-8 text-indigo-600 mx-auto mb-3" />
                                <h4 className="font-semibold text-slate-900 mb-2">Chat with Orion</h4>
                                <p className="text-sm text-slate-600">
                                    Ask questions and get business advice
                                </p>
                            </div>
                            <div className="bg-white border border-slate-200 rounded-lg p-4">
                                <Zap className="w-8 h-8 text-indigo-600 mx-auto mb-3" />
                                <h4 className="font-semibold text-slate-900 mb-2">Run Commands</h4>
                                <p className="text-sm text-slate-600">
                                    Tell Orion what to do in plain English
                                </p>
                            </div>
                            <div className="bg-white border border-slate-200 rounded-lg p-4">
                                <BarChart className="w-8 h-8 text-indigo-600 mx-auto mb-3" />
                                <h4 className="font-semibold text-slate-900 mb-2">View Analytics</h4>
                                <p className="text-sm text-slate-600">
                                    See insights about your business
                                </p>
                            </div>
                        </div>

                        <Button 
                            onClick={handleComplete}
                            className="bg-indigo-600 hover:bg-indigo-700"
                            size="lg"
                        >
                            Go to Dashboard
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return null;
}