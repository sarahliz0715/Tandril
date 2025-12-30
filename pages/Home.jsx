
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import TandrilLogo from '../components/logos/TandrilLogo';
import AnimatedCommandPrompt from '../components/landing/AnimatedCommandPrompt';
import EmailCapture from '../components/landing/EmailCapture';
import { CheckCircle, Zap, TrendingUp, Bot, Package, Briefcase, BarChart, Shield, Users, Sparkles, MessageSquare, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { api } from '@/api/apiClient';
import { isSupabaseConfigured } from '@/api/supabaseClient';
import { toast } from 'sonner';

const FeatureCard = ({ icon: Icon, title, description }) => (
    <div className="p-6 bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-slate-100">
        <div className="flex items-center justify-center h-12 w-12 rounded-full bg-indigo-50 text-indigo-600 mb-4">
            <Icon className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
        <p className="text-slate-600 text-sm">{description}</p>
    </div>
);

const StepCard = ({ number, title, description }) => (
    <div className="relative p-6 bg-slate-50/50 rounded-xl border border-slate-200">
         <div className="absolute -top-4 -left-4 h-10 w-10 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-bold text-lg shadow-md">
            {number}
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mt-4 mb-2">{title}</h3>
        <p className="text-slate-600 text-sm">{description}</p>
    </div>
);

export default function Home() {
    const navigate = useNavigate();
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);

    // Check if user is already authenticated and handle properly
    useEffect(() => {
        const checkAuthAndRedirect = async () => {
            try {
                const isAuth = await api.auth.isAuthenticated();
                if (isAuth) {
                    const user = await api.auth.me(); // Fetch user data after confirming authentication
                    // User is authenticated
                    if (!user.onboarding_completed) {
                        // Redirect to onboarding if not completed
                        console.log('User authenticated but onboarding not completed, redirecting...');
                        navigate(createPageUrl('Onboarding'));
                    } else {
                        // Redirect to dashboard if fully set up
                        console.log('User fully authenticated, redirecting to dashboard...');
                        navigate(createPageUrl('Dashboard'));
                    }
                } else {
                    // No user found, stay on home page
                    setIsCheckingAuth(false);
                }
            } catch (error) {
                // User is not authenticated, stay on home page
                console.log('User not authenticated, staying on home page', error);
                setIsCheckingAuth(false);
            }
        };
        
        checkAuthAndRedirect();
    }, [navigate]);

    const handleGetStarted = async () => {
        // If Supabase is configured, redirect to signup page
        if (isSupabaseConfigured()) {
            navigate(createPageUrl('Signup'));
            return;
        }

        // Otherwise, use the existing authentication flow
        try {
            const isAuth = await api.auth.isAuthenticated();
            if (isAuth) {
                const user = await api.auth.me();

                // Check for invite token in URL
                const urlParams = new URLSearchParams(window.location.search);
                const inviteToken = urlParams.get('invite_token');

                if (inviteToken) {
                    // Validate and redeem the invite token
                    try {
                        const invites = await api.entities.BetaInvite.filter({ token: inviteToken });
                        const invite = invites[0]; // Assuming token is unique and filter returns an array

                        if (invite && !invite.is_redeemed) {
                            // Check if not expired
                            const expiresAt = new Date(invite.expires_at);
                            if (expiresAt > new Date()) {
                                // Grant beta access and mark as redeemed
                                await api.auth.updateMe({ shopify_beta_access: true });
                                await api.entities.BetaInvite.update(invite.id, {
                                    is_redeemed: true,
                                    redeemed_at: new Date().toISOString()
                                });

                                toast.success("Welcome to Tandril Beta!", {
                                    description: "You now have exclusive beta access!"
                                });
                                // Remove invite_token from URL
                                urlParams.delete('invite_token');
                                window.history.replaceState({}, document.title, `${window.location.pathname}?${urlParams.toString()}`);
                            } else {
                                toast.error("Invitation expired", {
                                    description: "Please request a new invitation."
                                });
                            }
                        } else if (invite && invite.is_redeemed) {
                            toast.info("Invitation already redeemed", {
                                description: "You already have beta access."
                            });
                        } else {
                             toast.error("Invalid invitation token", {
                                description: "The provided invitation token is not valid."
                            });
                        }
                    } catch (error) {
                        console.error('Error redeeming invite:', error);
                        toast.error("Error redeeming invitation", {
                            description: "There was a problem redeeming your invite. Please try again."
                        });
                    }
                }

                // Continue with redirection based on user onboarding status
                if (!user.onboarding_completed) {
                    navigate(createPageUrl('Onboarding'));
                } else {
                    navigate(createPageUrl('Dashboard'));
                }
            } else {
                api.auth.redirectToLogin(createPageUrl('Onboarding'));
            }
        } catch (error) {
            console.error('Error in handleGetStarted:', error);
            // Fallback to login redirect in case of any unhandled error during authentication check
            api.auth.redirectToLogin(createPageUrl('Onboarding'));
        }
    };

    // Show loading state while checking authentication
    if (isCheckingAuth) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-slate-50 to-blue-50">
                <div className="text-center">
                    <TandrilLogo className="h-12 w-auto mx-auto mb-4" />
                    <p className="text-slate-600">Checking your access...</p>
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
                            <Button onClick={handleGetStarted}>Get Started Free</Button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <main className="overflow-hidden">
                <div className="py-20 sm:py-28 text-center">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
                            Your E-commerce Operations, <span className="text-indigo-600">Automated.</span>
                        </h1>
                        <p className="mt-6 max-w-2xl mx-auto text-lg text-slate-600">
                            Meet <strong>Orion</strong> - your AI business partner that connects to your stores and automates everything from inventory management to marketing campaigns, all through natural conversation.
                        </p>
                        <div className="mt-8 flex justify-center gap-4">
                            <Button size="lg" onClick={handleGetStarted} className="bg-indigo-600 hover:bg-indigo-700">
                                Get Started - It's Free
                            </Button>
                            <Button size="lg" variant="outline" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>
                                Meet Orion
                            </Button>
                        </div>
                    </div>
                    <div className="mt-12 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                        <AnimatedCommandPrompt />
                    </div>
                </div>

                {/* Survey CTA Section - Improved visibility */}
                <section className="py-16 bg-gradient-to-r from-green-50 to-emerald-50 border-t border-b border-green-100">
                    <div className="max-w-4xl mx-auto px-6 text-center">
                        <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-green-200">
                            <div className="flex items-center justify-center gap-3 mb-4">
                                <MessageSquare className="w-8 h-8 text-green-600" />
                                <h2 className="text-3xl font-bold text-slate-900">Help Us Build Better Tools</h2>
                            </div>
                            <p className="text-lg text-slate-700 mb-6">
                                Are you a seller frustrated with managing online listings? We want to hear from you! 
                                Take our 2-minute survey to share your pain points and help shape Tandril.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                                <Button
                                    size="lg"
                                    className="bg-green-600 hover:bg-green-700 text-white px-8 py-6 text-lg"
                                    onClick={() => navigate(createPageUrl('Survey'))}
                                >
                                    <MessageSquare className="w-5 h-5 mr-2" />
                                    Take the Seller Survey
                                </Button>
                                <span className="text-sm text-slate-600">Only 2 minutes • Your feedback matters</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Orion Introduction Section */}
                <section className="py-20 sm:py-24 bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Meet Orion - Your AI Business Partner</h2>
                            <p className="text-lg text-slate-600 max-w-3xl mx-auto">Not just another chatbot. Orion is a strategic business advisor with the power to execute, backed by 15+ years of e-commerce expertise.</p>
                        </div>
                        
                        <div className="grid lg:grid-cols-2 gap-12 items-center">
                            <div className="text-center lg:text-left">
                                <div className="inline-flex items-center gap-4 mb-6">
                                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 to-indigo-600 flex items-center justify-center">
                                        <img
                                            src="https://avatar.iran.liara.run/public/boy?username=orion"
                                            alt="Orion AI"
                                            className="w-14 h-14 rounded-full border-2 border-white/50"
                                        />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-slate-900">Orion</h3>
                                        <p className="text-slate-600">Strategic Business Advisor</p>
                                        <div className="flex items-center gap-2 text-sm text-green-600 mt-1">
                                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                            <span>Active & Ready</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="space-y-4 mb-8">
                                    <div className="flex items-start gap-3">
                                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                                        <p className="text-slate-700"><strong>Speaks your language:</strong> No complex interfaces - just tell Orion what you need in plain English</p>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                                        <p className="text-slate-700"><strong>Actually executes:</strong> Doesn't just suggest - Orion takes action across your platforms</p>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                                        <p className="text-slate-700"><strong>Learns your business:</strong> Gets smarter about your specific needs and goals over time</p>
                                    </div>
                                </div>
                                
                                <Button size="lg" onClick={handleGetStarted} className="bg-purple-600 hover:bg-purple-700">
                                    <Bot className="w-5 h-5 mr-2" />
                                    Start Talking to Orion
                                </Button>
                            </div>
                            
                            <div className="bg-white rounded-2xl shadow-2xl p-6 border border-slate-200">
                                <div className="space-y-4">
                                    <div className="bg-slate-50 rounded-lg p-4">
                                        <p className="text-sm text-slate-600 mb-2">You:</p>
                                        <p className="text-slate-900">"Orion, my summer collection isn't selling well. What should I do?"</p>
                                    </div>
                                    <div className="bg-indigo-50 rounded-lg p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-400 to-indigo-600 flex items-center justify-center">
                                                <img src="https://avatar.iran.liara.run/public/boy?username=orion" alt="Orion" className="w-5 h-5 rounded-full" />
                                            </div>
                                            <p className="text-sm text-indigo-600 font-medium">Orion:</p>
                                        </div>
                                        <p className="text-slate-900">"I analyzed your summer products and found 3 key issues. Let me fix the SEO on your top 5 items, create a 20% flash sale, and draft social media posts to boost visibility. Give me 2 minutes."</p>
                                    </div>
                                    <div className="bg-green-50 rounded-lg p-3">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle className="w-4 h-4 text-green-600" />
                                            <p className="text-sm text-green-800 font-medium">✅ SEO optimized for 5 products</p>
                                        </div>
                                    </div>
                                    <div className="bg-green-50 rounded-lg p-3">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle className="w-4 h-4 text-green-600" />
                                            <p className="text-sm text-green-800 font-medium">✅ Flash sale created and activated</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* How It Works Section */}
                <section id="how-it-works" className="py-20 sm:py-24 bg-white">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">Your Business on Autopilot in 3 Steps</h2>
                            <p className="mt-4 text-lg text-slate-600">Go from manual tasks to automated growth, effortlessly.</p>
                        </div>
                        <div className="grid md:grid-cols-3 gap-8">
                            <StepCard 
                                number="1"
                                title="Connect Your Platforms"
                                description="Securely link your Shopify, Amazon, Etsy, and other e-commerce stores in just a few clicks. Tandril becomes your central hub."
                            />
                            <StepCard 
                                number="2"
                                title="Issue AI Commands"
                                description="Use the simple command bar to tell Tandril what you need. From 'update all SEO titles' to 'launch a flash sale', the AI understands your goals."
                            />
                            <StepCard 
                                number="3"
                                title="Watch Your Business Grow"
                                description="Tandril executes tasks, optimizes campaigns, and provides proactive insights, freeing you up to focus on strategy and product."
                            />
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section id="features" className="py-20 sm:py-24">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">An AI Assistant for Every Part of Your Business</h2>
                            <p className="mt-4 text-lg text-slate-600">Tandril is more than a tool; it's your tireless team member.</p>
                        </div>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                            <FeatureCard icon={Package} title="Unified Inventory Management" description="Sync stock across all channels. Get predictive alerts for reordering and avoid stock-outs forever." />
                            <FeatureCard icon={Briefcase} title="Multi-Platform Control" description="Manage products, orders, and listings across Shopify, Amazon, and more from one dashboard." />
                            <FeatureCard icon={Sparkles} title="AI-Powered Marketing" description="Generate ad copy, launch campaigns, and optimize SEO for all your products with simple language commands." />
                            <FeatureCard icon={BarChart} title="Actionable Analytics" description="Go beyond data. Get plain-English insights and recommendations on how to improve sales and profitability." />
                            <FeatureCard icon={MessageSquare} title="Automated Customer Comms" description="Let the AI handle routine customer inquiries, shipping updates, and follow-ups, saving you hours per day." />
                            <FeatureCard icon={Shield} title="Proactive Business Monitoring" description="Your AI co-pilot works 24/7, spotting opportunities and flagging issues before they become problems." />
                        </div>
                    </div>
                </section>
                
                {/* "Who is this for?" Section */}
                <section className="py-20 sm:py-24 bg-white">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">Built for Ambitious E-commerce Brands</h2>
                            <p className="mt-4 text-lg text-slate-600">If you're managing multiple channels and feeling overwhelmed, you're in the right place.</p>
                        </div>
                        <div className="grid md:grid-cols-3 gap-8 text-center">
                            <div className="p-6">
                                <Users className="h-12 w-12 mx-auto text-indigo-600" />
                                <h3 className="mt-4 text-lg font-semibold">DTC Brands</h3>
                                <p className="mt-2 text-slate-600">Scale your direct-to-consumer business without scaling your headcount.</p>
                            </div>
                            <div className="p-6">
                                <Zap className="h-12 w-12 mx-auto text-indigo-600" />
                                <h3 className="mt-4 text-lg font-semibold">Multi-Channel Sellers</h3>
                                <p className="mt-2 text-slate-600">Stop juggling tabs. Manage your entire operation across Amazon, Etsy, and your own site.</p>
                            </div>
                            <div className="p-6">
                                <TrendingUp className="h-12 w-12 mx-auto text-indigo-600" />
                                <h3 className="mt-4 text-lg font-semibold">Growth-Focused Agencies</h3>
                                <p className="mt-2 text-slate-600">Manage multiple client stores with unparalleled efficiency and deliver better results.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Final CTA Section */}
                <section className="py-20 sm:py-28 text-center">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">Ready to Automate Your E-commerce Empire?</h2>
                        <p className="mt-4 text-lg text-slate-600">
                            Stop managing tasks and start building your brand. Sign up now and get your first AI commands on the house.
                        </p>
                        <div className="mt-8">
                            <EmailCapture />
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-slate-200">
                <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center">
                        <p className="text-sm text-slate-500">&copy; {new Date().getFullYear()} Tandril, Inc. All rights reserved.</p>
                        <div className="flex gap-6">
                            <Link to={createPageUrl('TermsOfService')} className="text-sm text-slate-500 hover:text-slate-700">Terms</Link>
                            <Link to={createPageUrl('PrivacyPolicy')} className="text-sm text-slate-500 hover:text-slate-700">Privacy</Link>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
