import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { api } from '@/lib/apiClient';
import OrionOnboarding from '../components/onboarding/OrionOnboarding';
import { Loader2 } from 'lucide-react';

export default function Onboarding() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkUser = async () => {
            try {
                const currentUser = await api.auth.me();

                // If onboarding is already completed, redirect to dashboard
                if (currentUser.onboarding_completed) {
                    navigate(createPageUrl('Dashboard'));
                    return;
                }

                setLoading(false);
            } catch (error) {
                console.error('Error checking user:', error);
                navigate(createPageUrl('Home'));
            }
        };

        checkUser();
    }, [navigate]);

    const handleOnboardingComplete = async () => {
        try {
            await api.auth.updateMe({ onboarding_completed: true });
        } catch (error) {
            console.error('Error marking onboarding complete:', error);
        }
        navigate(createPageUrl('Dashboard'));
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
            </div>
        );
    }

    return <OrionOnboarding onComplete={handleOnboardingComplete} />;
}
