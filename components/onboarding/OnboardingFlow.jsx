
import React, { useState, useEffect } from 'react';
import { User } from '@/api/entities';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { toast } from 'sonner';
import TandrilVineLogo from '../logos/TandrilVineLogo';
import AIAvatar from '../advisor/AIAvatar';
import { 
    Loader2, FlaskConical, Store, Bot, Zap, TrendingUp, 
    CheckCircle, ArrowRight, Sparkles, Shield, Target, MessageSquare
} from 'lucide-react';
import { generateDemoData } from '@/api/functions';

const steps = [
  { id: 'welcome', title: 'Meet Your AI Business Partner' },
  { id: 'experience', title: 'Choose Your Journey' },
  { id: 'business_info', title: 'Tell Orion About Your Business' },
  { id: 'features', title: 'Customize Your Workspace' }, // New step added
  { id: 'final', title: 'Ready to Get Started!' },
];

// Orion's personality-driven messages for each step
const orionMessages = {
  welcome: {
    greeting: `Hi there, ${''/* will be filled with user name */}! I'm Orion, your new AI business partner. 🤖`,
    main: `Think of me as your co-founder who never sleeps, never gets tired, and loves automating boring tasks. I can help you optimize products, create marketing campaigns, analyze your data, and grow your business - all through simple conversations like this one.`,
    excited: `I'm genuinely excited to work with you! Let's get started on this journey together.`
  },
  experience: {
    question: `Now, I need to know how you'd like to begin our partnership. Would you prefer to:`,
    demoExplain: `If you choose the demo store, I'll create a complete sample business for you - think of it as a realistic playground where you can safely explore everything I can do. No risk, just pure exploration!`,
    liveExplain: `If you have an existing store, we can connect it right away so I can start helping with your actual business. I'll be working with your real data and making real improvements.`,
    recommendation: `For first-time users, I usually recommend starting with the demo - it's the best way to see what we can accomplish together!`
  },
  business_info: {
    intro: `Great choice! Now I'd love to learn about your business so I can give you the most relevant advice and suggestions.`,
    platforms: `Which platforms are you currently selling on? This helps me understand your ecosystem.`,
    products: `How large is your product catalog? This helps me tailor my recommendations to your scale.`,
    learning: `Perfect! I'm learning about your business style so I can be the most helpful partner possible.`
  },
  features: { // New messages for the 'features' step
    intro: `One of my core beliefs is that you should be in control. I've designed your workspace to be completely flexible.`,
    main: `On every major page, you'll see information organized into tiles or 'widgets'. You can **drag and drop** these to arrange them in any order that makes sense for you. If there's a widget you don't use often, just click the 'eye' icon to hide it.`,
    reassurance: `You can always bring hidden widgets back later. This is *your* command center, so set it up exactly how you want it! 🚀`
  },
  final: {
    success: `Fantastic! I'm all set up and ready to be your AI business partner. 🎉`,
    nextSteps: `Here's what I recommend we do first:`,
    confidence: `I'm confident we're going to accomplish amazing things together. Ready to dive in?`
  }
};

export default function OnboardingFlow() {
  const [currentStep, setCurrentStep] = useState(0);
  const [user, setUser] = useState(null);
  const [businessInfo, setBusinessInfo] = useState({ platforms: [], product_count: '' });
  const [experience, setExperience] = useState('demo');
  const [isLoading, setIsLoading] = useState(true); // Represents initial loading and step-to-step loading
  const [isGeneratingDemo, setIsGeneratingDemo] = useState(false);
  const [showOrionMessage, setShowOrionMessage] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await User.me();
        setUser(currentUser);
        
        // If user has already completed onboarding, redirect to dashboard
        if (currentUser.onboarding_completed) {
            console.log('User already completed onboarding, redirecting to dashboard');
            navigate(createPageUrl('Dashboard'));
            return;
        }
      } catch (error) {
        console.error('Error fetching user for onboarding:', error);
        // If user is not authenticated, redirect to home
        navigate(createPageUrl('Home'));
        return;
      } finally {
        setIsLoading(false); // Initial loading is complete
      }
    };
    fetchUser();
  }, [navigate]);

  const handleComplete = async (onboardingData) => {
    try {
        const selectedPlatforms = onboardingData.platforms;
        const productCount = onboardingData.product_count;

        // Check if this should be a beta user based on their selections
        const shouldBeBetaUser = selectedPlatforms.includes('Shopify') && 
                                 selectedPlatforms.length === 1;

        await User.updateMyUserData({
            business_info: onboardingData, // This will be the collected businessInfo for live users
            onboarding_completed: true,
            onboarding_completed_at: new Date().toISOString(),
            shopify_beta_access: shouldBeBetaUser // Auto-assign beta access for Shopify-only users
        });

        toast.success(shouldBeBetaUser 
            ? "Welcome to Tandril's Shopify Beta! 🚀" 
            : "Welcome to Tandril! 🚀", {
            description: "Your account is now set up and ready to go."
        });

        // Redirect to dashboard as per the outline
        navigate(createPageUrl('Dashboard'));
    } catch (error) {
        console.error('Error completing onboarding:', error);
        toast.error("Failed to complete setup. Please try again.");
    }
  };

  const handleNext = async () => {
    setIsLoading(true); // Set loading for async operations within this handler

    try {
      if (steps[currentStep].id === 'experience') {
        await User.updateMyUserData({ user_mode: experience }); // Save chosen experience mode
        if (experience === 'demo') {
          setIsGeneratingDemo(true);
          toast.info("Orion is creating your demo store...", { 
            description: "Setting up products, orders, and insights for you to explore!" 
          });
          await generateDemoData();
          await User.updateMyUserData({ 
            onboarding_completed: true,
            onboarding_completed_at: new Date().toISOString()
          });
          toast.success("Your demo store is ready! Orion is waiting for you.", {
            description: "Time to explore what your AI business partner can do!"
          });
          navigate(createPageUrl('Dashboard'));
          setIsGeneratingDemo(false); // Reset demo generation loading
          setIsLoading(false); // Reset general loading before early return
          return; // Exit early for demo flow, as it completes here
        }
      }
      
      if (steps[currentStep].id === 'business_info') {
        await User.updateMyUserData({ business_info: businessInfo });
      }

      if (currentStep < steps.length - 1) {
        setCurrentStep(prev => prev + 1);
        setShowOrionMessage(true);
      } else {
        // This is the final step for "live" users, call the new handleComplete function
        await handleComplete(businessInfo); // Pass the collected business info
      }
    } catch (error) {
      toast.error("Oops! Orion encountered an issue. Please try again.");
      console.error("Onboarding error:", error);
      if (isGeneratingDemo) setIsGeneratingDemo(false); // Clear demo loading state on error
    } finally {
      setIsLoading(false); // Reset general loading, will be superseded if handleComplete navigates
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      setShowOrionMessage(true);
    }
  };
  
  const renderOrionMessage = () => {
    const step = steps[currentStep].id;
    const messages = orionMessages[step];
    const firstName = user?.full_name?.split(' ')[0] || 'friend';

    return (
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mb-6 border border-blue-200">
        <div className="flex items-start gap-4">
          <AIAvatar size="lg" className="flex-shrink-0" />
          <div className="space-y-3">
            {step === 'welcome' && (
              <>
                <p className="text-blue-900 font-medium">
                  {messages.greeting.replace('${firstName}', firstName)}
                </p>
                <p className="text-blue-800 leading-relaxed">
                  {messages.main}
                </p>
                <p className="text-blue-800 font-medium">
                  {messages.excited}
                </p>
              </>
            )}
            
            {step === 'experience' && (
              <>
                <p className="text-blue-900 font-medium">
                  {messages.question}
                </p>
                <div className="space-y-2 text-sm text-blue-800">
                  <p><strong>Demo Store:</strong> {messages.demoExplain}</p>
                  <p><strong>Live Store:</strong> {messages.liveExplain}</p>
                </div>
                <p className="text-blue-800 italic">
                  💡 {messages.recommendation}
                </p>
              </>
            )}

            {step === 'business_info' && (
              <>
                <p className="text-blue-900 font-medium">
                  {messages.intro}
                </p>
                <p className="text-blue-800">
                  {messages.platforms}
                </p>
                <p className="text-blue-800">
                  {messages.learning}
                </p>
              </>
            )}

            {step === 'features' && ( // New 'features' message rendering
              <>
                <p className="text-blue-900 font-medium">
                  {messages.intro}
                </p>
                <p className="text-blue-800 leading-relaxed">
                  {messages.main}
                </p>
                <p className="text-blue-800 font-medium">
                  {messages.reassurance}
                </p>
              </>
            )}

            {step === 'final' && (
              <>
                <p className="text-blue-900 font-medium">
                  {messages.success}
                </p>
                <p className="text-blue-800">
                  {messages.nextSteps}
                </p>
                <p className="text-blue-800 font-medium">
                  {messages.confidence}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderStepContent = () => {
    switch (steps[currentStep].id) {
      case 'welcome':
        return (
          <div className="text-center space-y-6">
            {renderOrionMessage()}
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-indigo-50 rounded-lg">
                <Zap className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
                <h3 className="font-semibold text-gray-900">Automate Tasks</h3>
                <p className="text-sm text-gray-600">"Optimize my top 20 products"</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <TrendingUp className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <h3 className="font-semibold text-gray-900">Grow Revenue</h3>
                <p className="text-sm text-gray-600">"Find my growth opportunities"</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <MessageSquare className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <h3 className="font-semibold text-gray-900">Strategic Advice</h3>
                <p className="text-sm text-gray-600">"What should I focus on today?"</p>
              </div>
            </div>

            <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
              <div className="flex items-center gap-2 text-amber-800">
                <Sparkles className="w-5 h-5" />
                <span className="font-medium">Ready to meet your AI co-founder?</span>
              </div>
            </div>
          </div>
        );
      case 'experience':
        return (
          <div className="space-y-6">
            {renderOrionMessage()}
            
            <RadioGroup value={experience} onValueChange={setExperience} className="space-y-4">
              <Label 
                htmlFor="demo-mode" 
                className="flex items-start space-x-4 p-6 border-2 rounded-xl cursor-pointer transition-all hover:border-indigo-300 has-[:checked]:bg-indigo-50 has-[:checked]:border-indigo-500"
              >
                <RadioGroupItem value="demo" id="demo-mode" className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <FlaskConical className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                      <span className="font-bold text-gray-900 text-lg">Demo Store Experience</span>
                      <div className="flex items-center gap-1 mt-1">
                        <Sparkles className="w-4 h-4 text-indigo-500" />
                        <span className="text-sm text-indigo-600 font-medium">Orion's recommendation</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-600 mb-3">
                    Let Orion create a complete demo business for you. Safe to explore, realistic data, 
                    full AI capabilities - the perfect way to see what we can accomplish together.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                      <CheckCircle className="w-3 h-3" />
                      Safe to explore
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                      <Shield className="w-3 h-3" />
                      Instant setup
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                      <Bot className="w-3 h-3" />
                      Full Orion experience
                    </span>
                  </div>
                </div>
              </Label>
              
              <Label 
                htmlFor="live-mode" 
                className="flex items-start space-x-4 p-6 border-2 rounded-xl cursor-pointer transition-all hover:border-green-300 has-[:checked]:bg-green-50 has-[:checked]:border-green-500"
              >
                <RadioGroupItem value="live" id="live-mode" className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Store className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <span className="font-bold text-gray-900 text-lg">Connect My Live Store</span>
                      <div className="flex items-center gap-1 mt-1">
                        <TrendingUp className="w-4 h-4 text-green-500" />
                        <span className="text-sm text-green-600 font-medium">For experienced users</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-600 mb-3">
                    Connect your existing store so Orion can immediately start helping with your 
                    real business data, insights, and growth opportunities.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                      <Target className="w-3 h-3" />
                      Real business value
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                      <Zap className="w-3 h-3" />
                      Immediate insights
                    </span>
                  </div>
                </div>
              </Label>
            </RadioGroup>
          </div>
        );
      case 'business_info':
        const platforms = ['Shopify', 'Etsy', 'Amazon Seller', 'WooCommerce', 'Facebook Shop', 'Other'];
        const productCounts = ['1-10 products', '11-50 products', '51-200 products', '201-1000 products', '1000+ products'];
        return (
          <div className="space-y-6">
            {renderOrionMessage()}
            
            <div className="space-y-6">
              <div>
                <Label className="text-lg font-semibold text-gray-900 mb-4 block">
                  Which platforms do you currently sell on?
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  {platforms.map(p => (
                    <Label key={p} className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <Checkbox 
                        id={p} 
                        checked={businessInfo.platforms.includes(p)}
                        onCheckedChange={(checked) => {
                          setBusinessInfo(prev => ({
                            ...prev,
                            platforms: checked ? [...prev.platforms, p] : prev.platforms.filter(item => item !== p)
                          }));
                        }}
                      />
                      <span className="font-medium">{p}</span>
                    </Label>
                  ))}
                </div>
              </div>
              
              <div>
                <Label className="text-lg font-semibold text-gray-900 mb-4 block">
                  What's your current product catalog size?
                </Label>
                <RadioGroup 
                  value={businessInfo.product_count}
                  onValueChange={(val) => setBusinessInfo(prev => ({...prev, product_count: val}))}
                  className="space-y-2"
                >
                  {productCounts.map(c => (
                    <Label key={c} className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <RadioGroupItem value={c} id={c} />
                      <span className="font-medium">{c}</span>
                    </Label>
                  ))}
                </RadioGroup>
              </div>
            </div>
          </div>
        );
      case 'features': // New 'features' step content
        return (
            <div className="space-y-6">
                {renderOrionMessage()}
                <div className="relative rounded-xl border-2 border-dashed border-indigo-200 p-4">
                    <img src="https://images.unsplash.com/photo-1695425624996-5492931a74d5?w=600&auto=format&fit=crop" alt="Drag and drop illustration" className="rounded-lg aspect-video object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent rounded-lg"></div>
                    <div className="absolute bottom-4 left-4 text-white">
                        <h3 className="font-bold text-lg">Your Workspace, Your Way</h3>
                        <p className="text-sm">Drag, drop, and hide any widget.</p>
                    </div>
                </div>
            </div>
        );
      case 'final':
        return (
          <div className="text-center space-y-6">
            {renderOrionMessage()}
            
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            
            <div className="bg-indigo-50 rounded-xl p-6 text-left">
              <h3 className="font-bold text-indigo-900 mb-3 flex items-center gap-2">
                <ArrowRight className="w-5 h-5" />
                Here's what Orion suggests we do first:
              </h3>
              <ul className="space-y-2 text-indigo-800">
                <li className="flex items-start gap-2">
                  <span className="font-bold">1.</span>
                  <span>Connect your first platform so I can see your business</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">2.</span>
                  <span>Try asking me: "What are my growth opportunities?"</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">3.</span>
                  <span>Let me show you the AI recommendations I've prepared</span>
                </li>
              </ul>
            </div>

            <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
              <div className="flex items-center justify-center gap-2 text-amber-800">
                <Sparkles className="w-5 h-5" />
                <span className="font-medium">Orion is excited to start working with you!</span>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  // If experience is 'demo', user completes 'welcome' and 'experience' step then navigates.
  // Otherwise, if 'live', user goes through all steps.
  // The totalSteps is used for the progress bar. For demo, it effectively completes after step 2.
  const totalSteps = experience === 'demo' ? 2 : steps.length;
  const progressPercentage = ((currentStep + 1) / totalSteps) * 100;

  // Render priority for loading states:
  // 1. Initial fetch / general step transition loading
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
          <div className="flex flex-col items-center gap-4">
              <TandrilVineLogo className="h-12 w-auto" />
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              <p className="text-slate-600">Preparing your setup...</p>
          </div>
      </div>
    );
  }

  // 2. User is not authenticated (after initial loading is complete)
  if (!user) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
            <div className="text-center">
                <TandrilVineLogo className="h-12 w-auto mx-auto mb-4" />
                <p className="text-slate-600 mb-4">Authentication required</p>
                <Button onClick={() => navigate(createPageUrl('Home'))}>
                    Return Home
                </Button>
            </div>
        </div>
    );
  }

  // 3. Demo data generation specific loading screen
  if (isGeneratingDemo) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-6 max-w-md">
          <TandrilVineLogo className="mx-auto h-12 w-auto" />
          <div className="space-y-4">
            <AIAvatar size="xl" className="mx-auto" />
            <h2 className="text-2xl font-bold text-gray-900">
              Orion is Creating Your Demo Store
            </h2>
            <p className="text-gray-600">
              I'm setting up a complete business environment with products, orders, 
              and insights. Think of it as your personal business playground!
            </p>
            <div className="bg-indigo-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-indigo-700">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Crafting your perfect demo experience...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-indigo-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl">
        <TandrilVineLogo className="mx-auto h-12 w-auto" />
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
        <Card className="shadow-xl border-0">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-lg text-gray-600">
              {steps[currentStep].title}
            </CardTitle>
            <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-indigo-600 h-2 rounded-full transition-all duration-500 ease-out" 
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Step {currentStep + 1} of {totalSteps}
            </p>
          </CardHeader>
          
          <CardContent className="px-8 pb-8">
            <div className="py-8">
              {renderStepContent()}
            </div>
            
            <div className="flex justify-between items-center mt-8">
              <Button 
                variant="outline" 
                onClick={handlePrev} 
                disabled={currentStep === 0 || isLoading}
                className="px-8"
              >
                Back
              </Button>
              
              <Button 
                onClick={handleNext} 
                disabled={isLoading}
                className="px-8 bg-indigo-600 hover:bg-indigo-700"
              >
                {isLoading ? (
                  <Loader2 className="animate-spin w-4 h-4 mr-2" />
                ) : null}
                {currentStep === steps.length - 1 ? 'Let\'s Go!' : 'Continue'}
                {!isLoading && <ArrowRight className="ml-2 w-4 h-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
