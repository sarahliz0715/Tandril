import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { User } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Sparkles, Zap, Package, Bot, ArrowRight, Loader2 } from 'lucide-react';
import TandrilLogo from '../components/logos/TandrilLogo';
import { handleAuthError } from '@/utils/authHelpers';

export default function Welcome() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadUser();
    }, []);

    const loadUser = async () => {
        try {
            const currentUser = await User.me();
            setUser(currentUser);
        } catch (error) {
            console.error('Error loading user:', error);
            if (handleAuthError(error, navigate)) {
                return;
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleGetStarted = () => {
        // If onboarding not completed, go to onboarding
        if (!user?.onboarding_completed) {
            navigate(createPageUrl('Onboarding'));
        } else {
            // Otherwise go to dashboard
            navigate(createPageUrl('Dashboard'));
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-blue-50">
                <Loader2 className="w-8 h-8 animate-spin text-green-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
            <div className="max-w-4xl mx-auto px-6 py-12">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="flex justify-center mb-6">
                        <TandrilLogo className="h-20 w-20" />
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
                        Welcome to Tandril! 🎉
                    </h1>
                    <p className="text-xl text-slate-600">
                        Your AI-powered e-commerce automation platform is ready
                    </p>
                </div>

                {/* Success Card */}
                <Card className="mb-8 border-green-200 bg-green-50/50">
                    <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0">
                                <CheckCircle className="w-8 h-8 text-green-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-green-900 mb-2">
                                    Account Created Successfully!
                                </h3>
                                <p className="text-green-700">
                                    {user?.email && `Welcome, ${user.email}! `}
                                    Your Tandril account is all set up and ready to transform your e-commerce operations.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* What's Next */}
                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Sparkles className="w-6 h-6 text-purple-600" />
                            What's Next?
                        </CardTitle>
                        <CardDescription>
                            Here's what you can do with Tandril
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg border">
                            <Zap className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-1" />
                            <div>
                                <h4 className="font-semibold text-slate-900 mb-1">
                                    Connect Your Shopify Store
                                </h4>
                                <p className="text-sm text-slate-600">
                                    Link your Shopify store to start automating product management, inventory tracking, and order processing.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg border">
                            <Bot className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
                            <div>
                                <h4 className="font-semibold text-slate-900 mb-1">
                                    Meet Orion - Your AI Business Partner
                                </h4>
                                <p className="text-sm text-slate-600">
                                    Use natural language commands to manage your store. Just tell Orion what you need, and it handles the rest.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg border">
                            <Package className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
                            <div>
                                <h4 className="font-semibold text-slate-900 mb-1">
                                    Automate Inventory & Purchase Orders
                                </h4>
                                <p className="text-sm text-slate-600">
                                    Set up automatic reorder points, create purchase orders, and sync inventory levels with your Shopify store.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Your Plan */}
                {user && (
                    <Card className="mb-8">
                        <CardHeader>
                            <CardTitle>Your Current Plan</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
                                <div>
                                    <p className="text-sm text-slate-600">You're on the</p>
                                    <p className="text-2xl font-bold text-slate-900 capitalize">
                                        {user.subscription || 'Free'} Plan
                                    </p>
                                    {user.trial_end && (
                                        <p className="text-sm text-slate-600 mt-1">
                                            Trial active until {new Date(user.trial_end).toLocaleDateString()}
                                        </p>
                                    )}
                                </div>
                                <Button
                                    variant="outline"
                                    onClick={() => navigate(createPageUrl('Pricing'))}
                                >
                                    View Plans
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* CTA */}
                <div className="text-center">
                    <Button
                        size="lg"
                        onClick={handleGetStarted}
                        className="bg-green-600 hover:bg-green-700 text-lg px-8 py-6"
                    >
                        {user?.onboarding_completed ? 'Go to Dashboard' : 'Get Started'}
                        <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                    <p className="text-sm text-slate-500 mt-4">
                        Need help? Check out our{' '}
                        <a href="mailto:evensonsarah704@gmail.com" className="text-indigo-600 hover:underline">
                            support
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}
