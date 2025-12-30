import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { api } from '@/api/apiClient';
import BetaOnboardingFlow from '../components/onboarding/BetaOnboardingFlow';
import { Loader2 } from 'lucide-react';

export default function Onboarding() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkUser = async () => {
            try {
                const currentUser = await api.auth.me();
                setUser(currentUser);
                
                // If onboarding is already completed, redirect to dashboard
                if (currentUser.onboarding_completed) {
                    navigate(createPageUrl('Dashboard'));
                    return;
                }
                
                setLoading(false);
            } catch (error) {
                console.error('Error checking user:', error);
                // If not authenticated, redirect to home
                navigate(createPageUrl('Home'));
            }
        };
        
        checkUser();
    }, [navigate]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
            </div>
        );
    }

    // For beta users, show the new beta onboarding flow
    if (user?.shopify_beta_access) {
        return <BetaOnboardingFlow />;
    }

    // For non-beta users, show the original onboarding (we could redirect or show a different flow)
    return <BetaOnboardingFlow />;
}