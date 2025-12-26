import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User } from '@/api/entities';
import { CheckCircle, ArrowRight, Star, Sparkles, Loader2, Heart, Shield, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import TandrilLogo from '../components/logos/TandrilLogo';
import { toast } from 'sonner';
import { createPageUrl } from '@/utils';

const plans = [
    {
        name: 'Just Free',
        priceId: null,
        checkoutUrl: null,
        price: 0,
        description: 'Perfect for getting started with AI automation.',
        features: [
            '50 AI commands per month',
            'Connect up to 2 platforms',
            'Basic automation workflows',
            'Standard AI model access',
            'Community support',
        ],
        isPopular: false,
        isFree: true,
    },
    {
        name: 'Starter',
        priceId: 'starter',
        checkoutUrl: 'https://buy.stripe.com/aFacN5aeQ7nggFL6lI4wM00',
        price: 39.99,
        description: 'For growing businesses who need to automate and scale.',
        features: [
            'Unlimited AI commands',
            'Connect unlimited platforms',
            'Advanced AI model access',
            'All automation features',
            'Priority support',
            'Custom workflows',
            'Advanced analytics',
        ],
        isPopular: true,
        isFree: false,
    },
    {
        name: 'Professional',
        priceId: 'professional',
        checkoutUrl: 'https://buy.stripe.com/3cI9ATev6ePIahn5hE4wM04',
        price: 129.99,
        description: 'For established businesses requiring advanced features.',
        features: [
            'Everything in Starter',
            'Custom AI model fine-tuning',
            'Dedicated account manager',
            'Custom integrations',
            'Advanced analytics & reporting',
            'Priority AI processing',
            'Advanced security features',
            'API access',
        ],
        isPopular: false,
        isFree: false,
    },
    {
        name: 'Enterprise',
        priceId: 'enterprise',
        checkoutUrl: 'https://buy.stripe.com/aFa14n0EgePI4X36lI4wM05',
        price: 299.99,
        description: 'For large-scale operations requiring unlimited power.',
        features: [
            'Everything in Professional',
            'Unlimited automation workflows',
            'White-label options',
            'Custom SLA guarantees',
            'Dedicated infrastructure',
            'On-premise deployment options',
            '24/7 priority support',
            'Custom training & onboarding',
        ],
        isPopular: false,
        isFree: false,
    },
];

const PlanCard = ({ plan, onSelect, isLoading, currentTier }) => {
    const isCurrentPlan = (plan.isFree && currentTier === 'free') || (!plan.isFree && currentTier === plan.name.toLowerCase());
    const isThisPlanLoading = isLoading;
    
    return (
        <Card className={`flex flex-col ${plan.isPopular ? 'border-indigo-500 border-2 shadow-lg scale-105' : 'shadow-md'} ${plan.isFree ? 'border-green-500 border-2' : ''}`}>
            {plan.isPopular && (
                <div className="bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider text-center py-1.5 rounded-t-lg">
                    Most Popular
                </div>
            )}
            {plan.isFree && (
                <div className="bg-green-500 text-white text-xs font-bold uppercase tracking-wider text-center py-1.5 rounded-t-lg">
                    <Heart className="w-3 h-3 inline mr-1" />
                    Just Free
                </div>
            )}
            <CardHeader className="text-center">
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-6">
                <div className="text-center">
                    {plan.isFree ? (
                        <div>
                            <span className="text-4xl font-bold text-green-600">Free</span>
                            <span className="text-slate-500 block text-sm">No credit card required</span>
                        </div>
                    ) : (
                        <div>
                            <span className="text-4xl font-bold">${plan.price}</span>
                            <span className="text-slate-500">/ month</span>
                        </div>
                    )}
                </div>
                <ul className="space-y-3">
                    {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-3">
                            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                            <span className="text-slate-700">{feature}</span>
                        </li>
                    ))}
                </ul>
            </CardContent>
            <div className="p-6">
                {isCurrentPlan ? (
                    <Button className="w-full" disabled>
                        Current Plan
                    </Button>
                ) : (
                    <Button
                        className="w-full"
                        size="lg"
                        onClick={() => onSelect(plan)}
                        disabled={isThisPlanLoading}
                        variant={plan.isFree ? "outline" : "default"}
                    >
                        {isThisPlanLoading ? (
                            <Loader2 className="animate-spin w-4 h-4 mr-2" />
                        ) : null}
                        {isThisPlanLoading ? 'Setting up...' : plan.isFree ? 'Get Started Free' : 'Upgrade Now'}
                    </Button>
                )}
            </div>
        </Card>
    );
};

export default function Pricing() {
    const [user, setUser] = useState(null);
    const [loadingPlan, setLoadingPlan] = useState(null);
    const [authChecked, setAuthChecked] = useState(false);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const currentUser = await User.me();
                console.log('Current user on pricing page:', currentUser);
                setUser(currentUser);
            } catch (e) {
                console.log('User not authenticated on pricing page:', e);
            } finally {
                setAuthChecked(true);
            }
        };
        fetchUser();
    }, []);

    const handlePlanSelect = async (plan) => {
        console.log('Plan selected:', plan);
        setLoadingPlan(plan.isFree ? 'free' : plan.priceId);

        try {
            if (plan.isFree) {
                if (!user) {
                    console.log('No user found, redirecting to login');
                    toast.info("Redirecting to sign in...");
                    User.redirectToLogin(window.location.pathname);
                    return;
                }

                console.log('User found, updating to free tier:', user.id);

                // Update user to free tier
                await User.updateMyUserData({
                    subscription_tier: 'free',
                    api_usage_limit: 50,
                    platforms_limit: 2
                });

                console.log('Free tier setup complete');
                toast.success("🎉 Welcome to Tandril! Your free account is ready.");

                // Redirect to onboarding if not completed, otherwise dashboard
                if (!user.onboarding_completed) {
                    window.location.href = createPageUrl('Onboarding');
                } else {
                    window.location.href = createPageUrl('Dashboard');
                }
                return;
            }

            // For paid plans - redirect directly to Stripe checkout
            if (!user) {
                toast.info("Please sign in to upgrade to a paid plan.");
                User.redirectToLogin(window.location.pathname);
                return;
            }

            console.log('Redirecting to Stripe checkout for:', plan.name);

            // Redirect directly to Stripe checkout URL
            if (plan.checkoutUrl) {
                toast.success(`Redirecting to checkout for ${plan.name}...`);
                window.location.href = plan.checkoutUrl;
            } else {
                throw new Error("Checkout URL not configured for this plan.");
            }
        } catch (error) {
            console.error("Plan selection error:", error);

            let errorMessage = "Something went wrong. Please try again.";
            let errorDescription = error.message;

            if (error.response?.status === 401) {
                errorMessage = "Authentication required";
                errorDescription = "Please sign in to continue";
            } else if (error.response?.status >= 500) {
                errorMessage = "Server error";
                errorDescription = "Our servers are having issues. Please try again in a moment.";
            }

            toast.error(errorMessage, {
                description: errorDescription
            });
        } finally {
            setLoadingPlan(null);
        }
    };

    // Don't render until we've checked authentication status
    if (!authChecked) {
        return (
            <div className="bg-gradient-to-br from-slate-50 via-white to-blue-50 min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <TandrilLogo className="h-12 w-12 mx-auto mb-4" />
                    <p className="text-slate-600">Loading pricing...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-3">
                            <TandrilLogo className="h-8 w-auto" />
                            <span className="text-xl font-bold text-slate-800 hidden sm:block">Tandril</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <Link to={createPageUrl('Pricing')} className="text-sm font-medium text-slate-600 hover:text-slate-900">
                                Pricing
                            </Link>
                            <Link to={createPageUrl('Login')} className="text-sm font-medium text-slate-600 hover:text-slate-900">
                                Log In
                            </Link>
                            <Button onClick={() => window.location.href = createPageUrl('Signup')}>Get Started Free</Button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="py-12 sm:py-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900">
                            Honest, Transparent Pricing
                        </h1>
                        <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
                            Start free, upgrade when you're ready. No hidden fees, no sneaky charges.
                        </p>
                    </div>

                    {/* Trust indicators */}
                    <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-4 mb-12">
                        <div className="flex items-center gap-2 text-slate-600">
                            <Shield className="w-5 h-5 text-green-500" />
                            <span className="text-sm">No Credit Card For Free Tier</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600">
                            <Heart className="w-5 h-5 text-red-500" />
                            <span className="text-sm">Cancel Anytime</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600">
                            <Zap className="w-5 h-5 text-blue-500" />
                            <span className="text-sm">Instant Activation</span>
                        </div>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
                        {plans.map(plan => (
                            <PlanCard
                                key={plan.name}
                                plan={plan}
                                onSelect={handlePlanSelect}
                                isLoading={loadingPlan === (plan.isFree ? 'free' : plan.priceId)}
                                currentTier={user?.subscription_tier}
                            />
                        ))}
                    </div>

                    <div className="text-center mt-12 space-y-4">
                        <div className="bg-green-50 border border-green-200 rounded-xl p-6 max-w-2xl mx-auto">
                            <h3 className="font-bold text-green-900 mb-2">Our Promise to You</h3>
                            <p className="text-green-800 text-sm">
                                We believe in ethical business practices. That's why our free tier is genuinely free.
                                No tricks, no gotchas, no forgotten subscriptions. You'll only pay when you choose to upgrade.
                            </p>
                        </div>
                        <p className="text-slate-500 text-sm">
                            Need help choosing? <a href="mailto:support@tandril.com" className="text-indigo-600 hover:underline">Contact our team</a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}