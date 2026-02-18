import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User } from '@/lib/entities';
import { toast } from 'sonner';
import { Sparkles, Check, AlertTriangle } from 'lucide-react';

export default function TestAccountSetup({ currentUser, onUpdate }) {
    const [isEnabling, setIsEnabling] = useState(false);

    const isBetaEnabled = currentUser?.user_mode === 'beta' &&
                          currentUser?.betaAccess === true &&
                          currentUser?.subscription === 'professional';

    const enableBetaMode = async () => {
        setIsEnabling(true);
        try {
            const updates = {
                user_mode: 'beta',
                betaAccess: true,
                shopify_beta_access: true,
                onboarding_completed: true,
                subscription_status: 'active',
                subscription_tier: 'professional',
                subscription: 'professional',
                trial_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                layout_reminder_dismissed: true
            };

            await User.updateMyUserData(updates);

            toast.success('✅ Beta mode enabled successfully!', {
                description: 'Please refresh the page to see all features.'
            });

            // Call the onUpdate callback to refresh user data
            if (onUpdate) {
                setTimeout(onUpdate, 1000);
            }
        } catch (error) {
            console.error('Failed to enable beta mode:', error);
            toast.error('Failed to enable beta mode', {
                description: error.message || 'Please try again or contact support.'
            });
        } finally {
            setIsEnabling(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    Test Account Setup
                </CardTitle>
                <CardDescription>
                    Enable beta mode and professional features for Shopify app testing
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {isBetaEnabled ? (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-start gap-3">
                            <Check className="w-5 h-5 text-green-600 mt-0.5" />
                            <div>
                                <p className="font-semibold text-green-900 mb-1">
                                    Beta Mode Active
                                </p>
                                <p className="text-sm text-green-700 mb-3">
                                    This account is configured for Shopify testing with full access to all features.
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    <Badge className="bg-green-100 text-green-800 border-green-300">
                                        Beta Access
                                    </Badge>
                                    <Badge className="bg-purple-100 text-purple-800 border-purple-300">
                                        Professional Tier
                                    </Badge>
                                    <Badge className="bg-blue-100 text-blue-800 border-blue-300">
                                        All Features Enabled
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-start gap-3 mb-4">
                            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                            <div>
                                <p className="font-semibold text-amber-900 mb-1">
                                    Beta Mode Not Enabled
                                </p>
                                <p className="text-sm text-amber-700">
                                    Click the button below to enable beta mode and configure this account for Shopify app testing.
                                </p>
                            </div>
                        </div>
                        <Button
                            onClick={enableBetaMode}
                            disabled={isEnabling}
                            className="w-full bg-purple-600 hover:bg-purple-700"
                        >
                            {isEnabling ? (
                                <>
                                    <span className="animate-spin mr-2">⏳</span>
                                    Enabling Beta Mode...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    Enable Beta Mode & Professional Features
                                </>
                            )}
                        </Button>
                    </div>
                )}

                <div className="pt-4 border-t space-y-2">
                    <p className="text-sm font-semibold text-slate-900">What this enables:</p>
                    <ul className="text-sm text-slate-600 space-y-1">
                        <li>✅ Beta dashboard with all features</li>
                        <li>✅ Professional tier subscription (no payment required)</li>
                        <li>✅ Access to Suppliers, Purchase Orders, and Inventory</li>
                        <li>✅ All AI commands and automation workflows</li>
                        <li>✅ 1 year trial period for testing</li>
                        <li>✅ No limitations or payment prompts</li>
                    </ul>
                </div>

                {isBetaEnabled && (
                    <div className="pt-4 border-t">
                        <p className="text-xs text-slate-500">
                            <strong>Note:</strong> If you don't see the changes immediately, please refresh your browser.
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
