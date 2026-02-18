import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from "@/components/ui/progress";
import { Badge } from '@/components/ui/badge';
import { createBillingPortalSession } from '@/lib/functions';
import { toast } from 'sonner';
import { Loader2, ExternalLink } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';
import { User } from '@/lib/entities';

export default function SubscriptionSettings() {
    const [user, setUser] = useState(null);
    const [isRedirecting, setIsRedirecting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const loadUser = async () => {
            try {
                const currentUser = await User.me();
                setUser(currentUser);
            } catch (error) {
                console.error('Error loading user:', error);
                toast.error('Failed to load subscription data.');
            } finally {
                setIsLoading(false);
            }
        };
        loadUser();
    }, []);

    const handleManageBilling = async () => {
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
                         <Button variant="outline" onClick={() => navigate(createPageUrl('Pricing'))}>
                            Upgrade Plan
                        </Button>
                        <Button onClick={handleManageBilling} disabled={isRedirecting}>
                            {isRedirecting ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Redirecting...</>
                            ) : (
                                <><ExternalLink className="mr-2 h-4 w-4" />Manage Billing</>
                            )}
                        </Button>
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