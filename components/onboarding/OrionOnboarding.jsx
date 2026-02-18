import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Sparkles,
  Rocket,
  Store,
  Search,
  Lightbulb,
  Zap,
  CheckCircle,
  ArrowRight,
  Loader2,
  Target,
  TrendingUp,
  AlertTriangle,
  Package,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/apiClient';
import { useNavigate } from 'react-router-dom';
import ShopifyConnectButton from '../platforms/ShopifyConnectButton';

const ONBOARDING_STEPS = [
  { id: 'welcome', title: 'Welcome', icon: Sparkles },
  { id: 'connect', title: 'Connect Store', icon: Store },
  { id: 'analyze', title: 'Analyze', icon: Search },
  { id: 'findings', title: 'Findings', icon: Lightbulb },
  { id: 'quick_wins', title: 'Quick Wins', icon: Target },
  { id: 'automation', title: 'First Automation', icon: Zap },
  { id: 'complete', title: 'All Set!', icon: CheckCircle },
];

export default function OrionOnboarding({ onComplete }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [connectedPlatform, setConnectedPlatform] = useState(null);
  const [completedQuickWins, setCompletedQuickWins] = useState([]);
  const navigate = useNavigate();

  const currentStep = ONBOARDING_STEPS[currentStepIndex];
  const progress = ((currentStepIndex + 1) / ONBOARDING_STEPS.length) * 100;

  const handleNext = () => {
    if (currentStepIndex < ONBOARDING_STEPS.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const handleSkip = () => {
    if (onComplete) {
      onComplete();
    }
  };

  const handleShopifyConnected = async (platform) => {
    setConnectedPlatform(platform);
    toast.success('Shopify store connected!');

    // Auto-advance to analysis
    setTimeout(() => {
      setCurrentStepIndex(2); // Go to analyze step
      startAnalysis(platform);
    }, 1000);
  };

  const startAnalysis = async (platform) => {
    setIsLoading(true);
    try {
      const result = await api.functions.invoke('onboarding-store-analyzer', {
        platform_id: platform.id,
      });

      setAnalysisData(result.data?.analysis || result.analysis);
      setRecommendations(result.data?.recommendations || result.recommendations);

      // Auto-advance to findings after analysis
      setTimeout(() => {
        setCurrentStepIndex(3);
        setIsLoading(false);
      }, 2000);
    } catch (error) {
      console.error('Analysis failed:', error);
      toast.error('Failed to analyze store');
      setIsLoading(false);
    }
  };

  const handleQuickWinComplete = (index) => {
    setCompletedQuickWins([...completedQuickWins, index]);
    toast.success('Quick win completed!');
  };

  const renderStepContent = () => {
    switch (currentStep.id) {
      case 'welcome':
        return <WelcomeStep onNext={handleNext} onSkip={handleSkip} />;

      case 'connect':
        return <ConnectStep onConnected={handleShopifyConnected} />;

      case 'analyze':
        return <AnalyzeStep isLoading={isLoading} />;

      case 'findings':
        return (
          <FindingsStep
            analysis={analysisData}
            recommendations={recommendations}
            onNext={handleNext}
          />
        );

      case 'quick_wins':
        return (
          <QuickWinsStep
            recommendations={recommendations}
            completedWins={completedQuickWins}
            onComplete={handleQuickWinComplete}
            onNext={handleNext}
          />
        );

      case 'automation':
        return (
          <AutomationStep
            recommendations={recommendations}
            onNext={handleNext}
          />
        );

      case 'complete':
        return <CompleteStep onFinish={onComplete} />;

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header with Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Welcome to Tandril</h1>
                <p className="text-sm text-slate-600">with Orion, your AI guide</p>
              </div>
            </div>
            {currentStepIndex > 0 && currentStepIndex < ONBOARDING_STEPS.length - 1 && (
              <Button variant="ghost" onClick={handleSkip} className="text-slate-600">
                Skip for now
              </Button>
            )}
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-xs text-slate-600">
              <span>Step {currentStepIndex + 1} of {ONBOARDING_STEPS.length}</span>
              <span>{Math.round(progress)}% complete</span>
            </div>
          </div>

          {/* Step Indicators */}
          <div className="mt-6 flex items-center justify-between">
            {ONBOARDING_STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStepIndex;
              const isComplete = index < currentStepIndex;

              return (
                <div
                  key={step.id}
                  className={`flex flex-col items-center gap-2 ${
                    index > 0 ? 'hidden sm:flex' : 'flex'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      isActive
                        ? 'bg-purple-600 text-white scale-110'
                        : isComplete
                        ? 'bg-green-500 text-white'
                        : 'bg-slate-200 text-slate-400'
                    }`}
                  >
                    {isComplete ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      isActive ? 'text-purple-600' : isComplete ? 'text-green-600' : 'text-slate-400'
                    }`}
                  >
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="animate-in fade-in duration-500">
          {renderStepContent()}
        </div>
      </div>
    </div>
  );
}

// Individual Step Components

function WelcomeStep({ onNext, onSkip }) {
  return (
    <Card className="border-2 border-purple-200 shadow-xl">
      <CardContent className="p-8 md:p-12">
        <div className="text-center space-y-6">
          {/* Orion Avatar */}
          <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center animate-pulse">
            <Rocket className="w-12 h-12 text-white" />
          </div>

          {/* Greeting */}
          <div>
            <h2 className="text-3xl font-bold text-slate-900 mb-3">
              Hi! I'm Orion 👋
            </h2>
            <p className="text-lg text-slate-700 max-w-2xl mx-auto">
              I'm your AI assistant here at Tandril, and I'm excited to help you get the most out of
              your Shopify store!
            </p>
          </div>

          {/* What I'll Do */}
          <div className="bg-purple-50 rounded-lg p-6 text-left max-w-xl mx-auto">
            <h3 className="font-semibold text-purple-900 mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Here's what I'll help you with:
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-slate-700">
                  <strong>Connect</strong> your Shopify store (takes 30 seconds)
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-slate-700">
                  <strong>Analyze</strong> your products, orders, and SEO
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-slate-700">
                  <strong>Suggest</strong> quick wins to improve your store
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-slate-700">
                  <strong>Set up</strong> your first smart automation
                </span>
              </li>
            </ul>
          </div>

          {/* Time estimate */}
          <div className="flex items-center justify-center gap-2 text-sm text-slate-600">
            <Clock className="w-4 h-4" />
            <span>This will take about 5 minutes</span>
          </div>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Button onClick={onNext} size="lg" className="bg-purple-600 hover:bg-purple-700">
              Let's Get Started!
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button onClick={onSkip} variant="outline" size="lg">
              I'll explore on my own
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ConnectStep({ onConnected }) {
  return (
    <Card className="border-2 border-purple-200 shadow-xl">
      <CardContent className="p-8 md:p-12">
        <div className="text-center space-y-6">
          {/* Icon */}
          <div className="w-20 h-20 mx-auto rounded-full bg-purple-100 flex items-center justify-center">
            <Store className="w-10 h-10 text-purple-600" />
          </div>

          {/* Message */}
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">
              Let's Connect Your Shopify Store
            </h2>
            <p className="text-slate-700 max-w-xl mx-auto">
              I need access to your store so I can analyze it and provide personalized recommendations.
              Don't worry - this is completely secure! 🔒
            </p>
          </div>

          {/* Benefits */}
          <div className="bg-blue-50 rounded-lg p-6 text-left max-w-xl mx-auto">
            <h3 className="font-semibold text-blue-900 mb-3">What I'll be able to do:</h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                View your products and help optimize them
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Monitor orders and alert you to issues
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Generate content and improve SEO
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Run smart automations to save you time
              </li>
            </ul>
          </div>

          {/* Connect Button */}
          <div className="pt-4">
            <ShopifyConnectButton
              onSuccess={onConnected}
              size="lg"
              className="bg-purple-600 hover:bg-purple-700"
            />
          </div>

          <p className="text-xs text-slate-500">
            Your data is encrypted and secure. We'll never share it with anyone.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function AnalyzeStep({ isLoading }) {
  return (
    <Card className="border-2 border-purple-200 shadow-xl">
      <CardContent className="p-8 md:p-12">
        <div className="text-center space-y-6">
          {/* Animated Icon */}
          <div className="w-24 h-24 mx-auto rounded-full bg-purple-100 flex items-center justify-center">
            {isLoading ? (
              <Loader2 className="w-12 h-12 text-purple-600 animate-spin" />
            ) : (
              <Search className="w-12 h-12 text-purple-600" />
            )}
          </div>

          {/* Message */}
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">
              Analyzing Your Store...
            </h2>
            <p className="text-slate-700 max-w-xl mx-auto">
              I'm taking a deep look at your products, orders, inventory, and SEO to find opportunities for growth!
            </p>
          </div>

          {/* What I'm checking */}
          <div className="bg-purple-50 rounded-lg p-6 text-left max-w-xl mx-auto">
            <h3 className="font-semibold text-purple-900 mb-4">What I'm checking:</h3>
            <div className="space-y-3">
              <AnalysisItem icon={Package} text="Product quality (images, descriptions, SEO)" />
              <AnalysisItem icon={TrendingUp} text="Sales performance and bestsellers" />
              <AnalysisItem icon={AlertTriangle} text="Inventory levels and stockouts" />
              <AnalysisItem icon={Zap} text="Order fulfillment and potential issues" />
            </div>
          </div>

          <p className="text-sm text-slate-500">This usually takes about 10-15 seconds...</p>
        </div>
      </CardContent>
    </Card>
  );
}

function AnalysisItem({ icon: Icon, text }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-purple-200 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-purple-700" />
      </div>
      <span className="text-slate-700">{text}</span>
    </div>
  );
}

function FindingsStep({ analysis, recommendations, onNext }) {
  if (!analysis || !recommendations) {
    return (
      <Card>
        <CardContent className="p-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-purple-600" />
            <p className="text-slate-600">Loading findings...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-purple-200 shadow-xl">
      <CardContent className="p-8 md:p-12">
        <div className="space-y-6">
          {/* Greeting */}
          <div className="text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-purple-100 flex items-center justify-center mb-4">
              <Lightbulb className="w-8 h-8 text-purple-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Here's What I Found!
            </h2>
            <p className="text-lg text-slate-700">
              {recommendations.greeting}
            </p>
          </div>

          {/* Findings */}
          <div className="space-y-3">
            {recommendations.findings?.map((finding, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border-2 ${
                  finding.type === 'positive'
                    ? 'bg-green-50 border-green-200'
                    : finding.type === 'alert'
                    ? 'bg-red-50 border-red-200'
                    : 'bg-blue-50 border-blue-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{finding.icon}</span>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 mb-1">{finding.title}</h3>
                    <p className="text-sm text-slate-700">{finding.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Store Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Products"
              value={analysis.store_size.total_products}
              icon={Package}
            />
            <StatCard
              label="Orders (30d)"
              value={analysis.store_size.total_orders_30d}
              icon={TrendingUp}
            />
            <StatCard
              label="Revenue (30d)"
              value={`$${analysis.store_size.revenue_30d.toFixed(0)}`}
              icon={TrendingUp}
            />
            <StatCard
              label="Opportunities"
              value={analysis.opportunities_found}
              icon={Target}
            />
          </div>

          {/* Next Steps */}
          <div className="text-center pt-4">
            <p className="text-slate-700 mb-4">{recommendations.next_steps}</p>
            <Button onClick={onNext} size="lg" className="bg-purple-600 hover:bg-purple-700">
              Show Me Quick Wins
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatCard({ label, value, icon: Icon }) {
  return (
    <div className="p-4 rounded-lg bg-white border border-slate-200 text-center">
      <Icon className="w-6 h-6 mx-auto mb-2 text-purple-600" />
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-600">{label}</p>
    </div>
  );
}

function QuickWinsStep({ recommendations, completedWins, onComplete, onNext }) {
  if (!recommendations?.quick_wins) {
    return null;
  }

  const allWinsCompleted = completedWins.length === recommendations.quick_wins.length;

  return (
    <Card className="border-2 border-purple-200 shadow-xl">
      <CardContent className="p-8 md:p-12">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-purple-100 flex items-center justify-center mb-4">
              <Target className="w-8 h-8 text-purple-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Quick Wins - Let's Start Improving!
            </h2>
            <p className="text-slate-700">
              These are things you can do RIGHT NOW to improve your store. Pick the ones that matter most to you!
            </p>
          </div>

          {/* Quick Wins */}
          <div className="space-y-4">
            {recommendations.quick_wins.map((win, index) => {
              const isCompleted = completedWins.includes(index);

              return (
                <div
                  key={index}
                  className={`p-5 rounded-lg border-2 transition-all ${
                    isCompleted
                      ? 'bg-green-50 border-green-300'
                      : 'bg-white border-slate-200 hover:border-purple-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-slate-900">{win.title}</h3>
                        <Badge className={`${
                          win.impact === 'high'
                            ? 'bg-red-500'
                            : win.impact === 'medium'
                            ? 'bg-yellow-500'
                            : 'bg-blue-500'
                        } text-white`}>
                          {win.impact} impact
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-700 mb-2">{win.description}</p>
                      <div className="flex items-center gap-4 text-xs text-slate-600">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {win.estimated_time}
                        </span>
                      </div>
                    </div>

                    {isCompleted ? (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="w-5 h-5" />
                        <span className="font-medium">Done!</span>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700"
                        onClick={() => onComplete(index)}
                      >
                        Do This
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Progress */}
          <div className="text-center pt-4">
            <p className="text-sm text-slate-600 mb-3">
              Completed: {completedWins.length} of {recommendations.quick_wins.length}
            </p>
            <Button
              onClick={onNext}
              size="lg"
              className="bg-purple-600 hover:bg-purple-700"
            >
              {allWinsCompleted ? 'All Done! Continue' : 'Skip to Automation Setup'}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AutomationStep({ recommendations, onNext }) {
  const [selectedAutomation, setSelectedAutomation] = useState(0);
  const [isSettingUp, setIsSettingUp] = useState(false);

  const handleSetup = async () => {
    setIsSettingUp(true);
    // Simulate automation setup
    setTimeout(() => {
      toast.success('Automation activated!');
      setIsSettingUp(false);
      onNext();
    }, 1500);
  };

  if (!recommendations?.recommended_automations || recommendations.recommended_automations.length === 0) {
    // Skip to next step if no automations
    useEffect(() => {
      onNext();
    }, []);
    return null;
  }

  const automation = recommendations.recommended_automations[selectedAutomation];

  return (
    <Card className="border-2 border-purple-200 shadow-xl">
      <CardContent className="p-8 md:p-12">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-purple-100 flex items-center justify-center mb-4">
              <Zap className="w-8 h-8 text-purple-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Let's Set Up Your First Automation
            </h2>
            <p className="text-slate-700">
              Automations run in the background and save you hours of manual work. Let me set one up for you!
            </p>
          </div>

          {/* Automation Details */}
          <div className="bg-purple-50 rounded-lg p-6 border-2 border-purple-200">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-purple-900 mb-2">{automation.name}</h3>
                <p className="text-slate-700 mb-3">{automation.description}</p>
                <div className="bg-white rounded-lg p-3 mb-3">
                  <p className="text-sm font-medium text-slate-900 mb-1">Why This Helps You:</p>
                  <p className="text-sm text-slate-700">{automation.benefit}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-500 text-white">
                    {automation.setup_difficulty === 'easy' ? 'Easy Setup' : 'Medium Setup'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Other Automation Options */}
          {recommendations.recommended_automations.length > 1 && (
            <div>
              <p className="text-sm text-slate-600 mb-3">Other recommended automations:</p>
              <div className="flex gap-2">
                {recommendations.recommended_automations.map((auto, index) => (
                  index !== selectedAutomation && (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedAutomation(index)}
                    >
                      {auto.name}
                    </Button>
                  )
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Button
              onClick={handleSetup}
              size="lg"
              className="bg-purple-600 hover:bg-purple-700"
              disabled={isSettingUp}
            >
              {isSettingUp ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Setting Up...
                </>
              ) : (
                <>
                  Activate This Automation
                  <Zap className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
            <Button onClick={onNext} variant="outline" size="lg">
              Skip for Now
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CompleteStep({ onFinish }) {
  return (
    <Card className="border-2 border-green-300 shadow-xl">
      <CardContent className="p-8 md:p-12">
        <div className="text-center space-y-6">
          {/* Success Icon */}
          <div className="w-24 h-24 mx-auto rounded-full bg-green-100 flex items-center justify-center animate-bounce">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>

          {/* Congrats */}
          <div>
            <h2 className="text-3xl font-bold text-slate-900 mb-3">
              🎉 You're All Set!
            </h2>
            <p className="text-lg text-slate-700 max-w-xl mx-auto">
              Your store is connected and I'm already working to help you succeed. Here's what happens next:
            </p>
          </div>

          {/* What's Next */}
          <div className="bg-purple-50 rounded-lg p-6 text-left max-w-xl mx-auto">
            <h3 className="font-semibold text-purple-900 mb-4">What I'll do for you:</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-purple-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-purple-700">1</span>
                </div>
                <span className="text-slate-700">
                  <strong>Daily Briefings</strong> - Every morning I'll send you insights about your store
                </span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-purple-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-purple-700">2</span>
                </div>
                <span className="text-slate-700">
                  <strong>Growth Opportunities</strong> - I'll find ways to increase your revenue
                </span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-purple-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-purple-700">3</span>
                </div>
                <span className="text-slate-700">
                  <strong>Risk Alerts</strong> - I'll warn you about problems before they get serious
                </span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-purple-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-purple-700">4</span>
                </div>
                <span className="text-slate-700">
                  <strong>Smart Automations</strong> - Running in the background to save you time
                </span>
              </li>
            </ul>
          </div>

          {/* Pro Tip */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-left">
                <p className="font-medium text-blue-900 mb-1">Pro Tip:</p>
                <p className="text-sm text-blue-800">
                  You can chat with me anytime by clicking the Orion button. Just tell me what you need in plain English - no technical knowledge required!
                </p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="pt-4">
            <Button
              onClick={onFinish}
              size="lg"
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              Go to Dashboard
              <Sparkles className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
