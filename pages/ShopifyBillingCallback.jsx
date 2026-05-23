import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '@/lib/apiClient';
import { User } from '@/lib/entities';
import { toast } from 'sonner';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function ShopifyBillingCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('activating'); // activating | success | error
    const [message, setMessage] = useState('Activating your subscription…');

    useEffect(() => {
        async function activate() {
            const chargeId = searchParams.get('charge_id');
            const planId   = searchParams.get('plan');

            if (!chargeId || !planId) {
                setStatus('error');
                setMessage('Invalid billing callback — missing charge ID or plan.');
                setTimeout(() => navigate(createPageUrl('Pricing')), 3000);
                return;
            }

            try {
                const result = await api.functions.invoke('shopify-billing', {
                    action: 'activate',
                    chargeId,
                    planId,
                });

                if (result?.error) throw new Error(result.error);

                setStatus('success');
                setMessage(`You're on the ${planId.charAt(0).toUpperCase() + planId.slice(1)} plan!`);
                toast.success(`🎉 Subscription activated — welcome to ${planId}!`);

                // Refresh user data then redirect to dashboard
                await User.me();
                setTimeout(() => navigate(createPageUrl('Dashboard')), 2000);

            } catch (err) {
                console.error('[ShopifyBillingCallback] activation error:', err);
                setStatus('error');
                setMessage(err.message || 'Failed to activate subscription.');
                toast.error('Subscription activation failed: ' + err.message);
                setTimeout(() => navigate(createPageUrl('Pricing')), 4000);
            }
        }

        activate();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50">
            <div className="text-center space-y-4 p-8">
                {status === 'activating' && (
                    <>
                        <Loader2 className="w-10 h-10 animate-spin mx-auto text-emerald-600" />
                        <p className="text-lg font-medium text-slate-700">Activating your subscription…</p>
                        <p className="text-sm text-slate-500">Just a moment while we confirm with Shopify.</p>
                    </>
                )}
                {status === 'success' && (
                    <>
                        <CheckCircle className="w-10 h-10 mx-auto text-emerald-600" />
                        <p className="text-lg font-medium text-slate-700">{message}</p>
                        <p className="text-sm text-slate-500">Redirecting to your dashboard…</p>
                    </>
                )}
                {status === 'error' && (
                    <>
                        <XCircle className="w-10 h-10 mx-auto text-red-500" />
                        <p className="text-lg font-medium text-slate-700">Something went wrong</p>
                        <p className="text-sm text-red-500">{message}</p>
                        <p className="text-sm text-slate-500">Redirecting back to pricing…</p>
                    </>
                )}
            </div>
        </div>
    );
}
