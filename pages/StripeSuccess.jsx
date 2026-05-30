import React, { useEffect, useState } from 'react';
import { CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';
import TandrilVineLogo from '../components/logos/TandrilVineLogo';
import { User } from '@/lib/entities';

export default function StripeSuccess() {
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [planName, setPlanName] = useState('');

  useEffect(() => {
    const activate = async () => {
      try {
        // Give the webhook a moment to fire before we refresh user data
        await new Promise(r => setTimeout(r, 2000));
        const user = await User.me();
        const tier = user?.subscription_tier;
        const tierNames = { starter: 'Starter', professional: 'Professional', enterprise: 'Enterprise' };
        setPlanName(tierNames[tier] || tier || 'your plan');
        setStatus('success');
      } catch {
        setStatus('success'); // Still show success even if refresh fails; webhook will have fired
      }
    };
    activate();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <TandrilVineLogo className="h-12 w-auto mx-auto" />

        {status === 'loading' ? (
          <>
            <Loader2 className="w-12 h-12 animate-spin text-emerald-500 mx-auto" />
            <p className="text-slate-600">Activating your subscription…</p>
          </>
        ) : (
          <>
            <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto" />
            <div>
              <h1 className="text-2xl font-bold text-slate-900">You're all set!</h1>
              {planName && (
                <p className="text-slate-600 mt-2">
                  Welcome to <span className="font-semibold text-emerald-600">{planName}</span>. Your account has been upgraded.
                </p>
              )}
            </div>
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              onClick={() => { window.location.href = createPageUrl('Dashboard'); }}
            >
              Go to Dashboard
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
