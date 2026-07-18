import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from "@/components/ui/progress";
import { Badge } from '@/components/ui/badge';
import { createBillingPortalSession } from '@/lib/functions';
import { toast } from 'sonner';
import { Loader2, ExternalLink } from 'lucide-react';
import { User, Platform } from '@/lib/entities';
import { syncShopifyPlan } from '@/lib/supabaseAuth';

export default function SubscriptionSettings() {
    const [user, setUser] = useState(null);
    const [isRedirecting, setIsRedirecting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [shopifyDomain, setShopifyDomain] = useState(null);
    useEffect(() => {
        const loadUser = async () => {
            try {
                const currentUser = await User.me();
                setUser(currentUser);
                // Sync real-time plan from Shopify
                const shopifyTier = await syncShopifyPlan();
                if (shopifyTier && shopifyTier !== 'free') setUser(prev => ({ ...prev, subscription_tier: shopifyTier }));

                // Detect Shopify platform from database (reliable, not localStorage)
                try {
                    const platforms = await Platform.filter({ user_id: currentUser.id });
                    const sp = platforms.find(p => p.platform_type === 'shopify');
                    if (sp?.shop_domain) setShopifyDomain(sp.shop_domain);
                } catch (_) {}
            } catch (error) {
                console.error('Error loading user:', error);
                toast.error('Failed to load subscription data.');
            } finally {
                setIsLoading(false);
            }
        };
        loadUser();
    }, []);

    const shopifyPricingUrl = shopifyDomain
        ? `https://admin.shopify.com/store/${shopifyDomain.replace('.myshopify.com', '')}/charges/tandril-beta/pricing_plans`
        : null;

    const handleManageBilling = async () => {
        // Shopify users manage billing through Shopify's managed pricing page
        if (shopifyPricingUrl) {
            window.open(shopifyPricingUrl, '_blank');
            return;
        }

        if (!user?.stripe_customer_id) {
            toast.error("Billing portal not available.", {
                description: "Your account was created before billing was set up. Please contact support."
            });
            return;
        }

        setIsRedirecting(true);
        try {
            const { data } = await createBillingPortalSession({ returnUrl: window.location.href });
            if (data.url) {
                window.location.href = data.url;
            } else {
                throw new Error("Could not retrieve billing portal URL.");
            }
        } catch (error) {
            toast.error("Could not open billing portal.", {
                description: "Please try again or contact support if the issue persists."
            });
            setIsRedirecting(false);
        }
    };

    if (isLoading || !user) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center p-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                </CardContent>
            </Card>
        );
    }

    const commandUsage = user.api_usage_current || 0;
    const commandLimit = user.subscription_tier === 'free' ? 50 : Infinity;
    const commandProgress = commandLimit === Infinity ? 100 : (commandUsage / commandLimit) * 100;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Subscription & Billing</CardTitle>
                <CardDescription>Manage your plan, view usage, and access billing details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="p-4 border rounded-lg bg-slate-50 space-y-4">
                    <div className="flex justify-between items-center">
                        <span className="font-medium">Current Plan</span>
                        <Badge className="capitalize text-base px-3 py-1">{user.subscription_tier || 'Free'}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                        {shopifyPricingUrl ? (
                            <div className="flex flex-col items-end gap-1">
                                <p className="text-xs text-slate-500">Billing managed through Shopify</p>
                                <Button variant="outline" onClick={handleManageBilling}>
                                    <ExternalLink className="mr-2 h-4 w-4" />
                                    Manage in Shopify Admin
                                </Button>
                            </div>
                        ) : (
                            <Button onClick={handleManageBilling} disabled={isRedirecting}>
                                {isRedirecting ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Redirecting...</>
                                ) : (
                                    <><ExternalLink className="mr-2 h-4 w-4" />Manage Billing</>
                                )}
                            </Button>
                        )}
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-medium mb-4">Monthly Usage</h3>
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between mb-1 text-sm">
                                <span className="font-medium text-slate-700">AI Commands</span>
                                <span>
                                    {commandUsage} / {commandLimit === Infinity ? 'Unlimited' : commandLimit}
                                </span>
                            </div>
                            <Progress value={commandProgress} />
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
