import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { api } from '@/lib/apiClient';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

// Friendly display names for platform types
const PLATFORM_NAMES = {
  etsy: 'Etsy',
  tiktok_shop: 'TikTok Shop',
  meta_ads: 'Facebook / Meta',
  amazon: 'Amazon',
  square: 'Square',
  wix: 'Wix',
  squarespace: 'Squarespace',
  bigcommerce: 'BigCommerce',
  faire: 'Faire',
};

export default function OAuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing');
  const [message, setMessage] = useState('Connecting your account...');
  const [errorDetails, setErrorDetails] = useState(null);
  const [platformName, setPlatformName] = useState('Platform');

  useEffect(() => {
    let mounted = true;

    const handleCallback = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const state = params.get('state');
        const error = params.get('error');
        const errorDesc = params.get('error_description');
        // BigCommerce returns a 'context' param (e.g. "stores/abc123") needed for token exchange
        const context = params.get('context');

        // Look up platform name from the stored state (best-effort via API response)
        // We'll get the real name after the callback succeeds.

        if (error) {
          if (!mounted) return;
          setStatus('error');
          setMessage('Authorization Denied');
          setErrorDetails(errorDesc || error);
          return;
        }

        if (!code || !state) {
          if (!mounted) return;
          setStatus('error');
          setMessage('Missing Required Information');
          setErrorDetails('The authorization code or state is missing. Please try connecting again.');
          return;
        }

        if (mounted) setMessage('Processing authorization...');

        const response = await api.functions.invoke('oauth-callback', {
          code,
          state,
          ...(context ? { context } : {}),
        });

        if (!mounted) return;

        if (response?.success) {
          const name = PLATFORM_NAMES[response.platform] || response.platform || 'Platform';
          setPlatformName(name);
          setStatus('success');
          setMessage(`${name} connected successfully!`);
          setTimeout(() => {
            if (mounted) navigate(createPageUrl('Platforms'));
          }, 2000);
        } else {
          setStatus('error');
          setMessage('Connection Failed');
          setErrorDetails(response?.error || 'An unexpected error occurred. Please try again.');
        }
      } catch (err) {
        if (!mounted) return;
        setStatus('error');
        setMessage('Connection Error');
        setErrorDetails(err.message || 'An unexpected error occurred.');
      }
    };

    // Small delay to allow React to render before the async work starts
    const timer = setTimeout(handleCallback, 100);
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full shadow-lg">
        <CardContent className="p-6 sm:p-8">
          {status === 'processing' && (
            <div className="text-center">
              <Loader2 className="w-14 h-14 text-emerald-600 animate-spin mx-auto mb-4" />
              <h2 className="text-xl font-bold text-slate-900 mb-2">Connecting {platformName}</h2>
              <p className="text-slate-600">{message}</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center">
              <CheckCircle className="w-14 h-14 text-green-600 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-slate-900 mb-2">Connected!</h2>
              <p className="text-slate-600 mb-2">{message}</p>
              <p className="text-sm text-slate-500">Redirecting to Platforms...</p>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center">
              <AlertCircle className="w-14 h-14 text-red-600 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-slate-900 mb-2">{message}</h2>
              {errorDetails && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-left">
                  <p className="text-sm text-red-800">{errorDetails}</p>
                </div>
              )}
              <Button onClick={() => navigate(createPageUrl('Platforms'))} className="bg-emerald-600 hover:bg-emerald-700">
                Go to Platforms
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
