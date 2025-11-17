import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Lock, Sparkles } from 'lucide-react';

/**
 * Wrapper component that shows/hides features based on beta access
 * @param {boolean} requiresBeta - If true, only shows to beta users
 * @param {object} user - Current user object
 * @param {ReactNode} children - Content to conditionally render
 * @param {ReactNode} fallback - What to show non-beta users (optional)
 */
export default function BetaGate({ requiresBeta = false, user, children, fallback = null, featureName = "This feature" }) {
    const hasBetaAccess = user?.shopify_beta_access === true;

    // If feature doesn't require beta, always show
    if (!requiresBeta) {
        return <>{children}</>;
    }

    // If user has beta access, show the feature
    if (hasBetaAccess) {
        return <>{children}</>;
    }

    // User doesn't have access - show fallback or nothing
    if (fallback) {
        return <>{fallback}</>;
    }

    // Default locked message
    return (
        <Alert className="border-amber-200 bg-amber-50">
            <Lock className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-900">Coming Soon</AlertTitle>
            <AlertDescription className="text-amber-700">
                {featureName} will be available in the next release. You're currently using our Shopify-focused beta.
            </AlertDescription>
        </Alert>
    );
}

/**
 * Inline conditional rendering helper
 */
export function useBetaAccess(user) {
    return {
        hasBetaAccess: user?.shopify_beta_access === true,
        isFullAccess: !user?.shopify_beta_access || user?.shopify_beta_access === false
    };
}