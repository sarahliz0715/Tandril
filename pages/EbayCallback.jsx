import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Loader2, AlertCircle, CheckCircle, Home } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function EbayCallback() {
    const navigate = useNavigate();
    const [status, setStatus] = useState('processing');
    const [message, setMessage] = useState('Connecting your eBay account...');
    const [errorDetails, setErrorDetails] = useState(null);

    useEffect(() => {
        let mounted = true;

        const handleCallback = async () => {
            try {
                if (!mounted) return;

                const urlParams = new URLSearchParams(window.location.search);
                const code = urlParams.get('code');
                const state = urlParams.get('state');
                const error = urlParams.get('error');
                const error_description = urlParams.get('error_description');

                console.log('eBay callback - URL params:', { 
                    code: code ? 'present' : 'missing', 
                    state: state ? 'present' : 'missing',
                    error 
                });

                if (error) {
                    if (mounted) {
                        setStatus('error');
                        setMessage('eBay Authorization Failed');
                        setErrorDetails(error_description || error);
                    }
                    return;
                }

                if (!code || !state) {
                    if (mounted) {
                        setStatus('error');
                        setMessage('Missing Required Information');
                        setErrorDetails('The authorization code or state is missing. Please try connecting again.');
                    }
                    return;
                }

                if (mounted) {
                    setMessage('Processing authorization...');
                }

                const response = await base44.functions.invoke('handleEbayCallback', {
                    code,
                    state
                });

                console.log('eBay callback - Backend response:', response.data);

                if (!mounted) return;

                if (response.data?.success) {
                    setStatus('success');
                    setMessage('eBay account connected successfully!');
                    
                    setTimeout(() => {
                        if (mounted) {
                            navigate(createPageUrl('Platforms'));
                        }
                    }, 2000);
                } else {
                    setStatus('error');
                    setMessage('Connection Failed');
                    setErrorDetails(response.data?.error || 'An unexpected error occurred. Please try again.');
                }
            } catch (error) {
                console.error('eBay callback error:', error);
                
                if (!mounted) return;
                
                setStatus('error');
                setMessage('Connection Error');
                
                let details = 'An unexpected error occurred.';
                
                if (error.response?.data?.error) {
                    details = error.response.data.error;
                } else if (error.message) {
                    details = error.message;
                }
                
                setErrorDetails(details);
            }
        };

        setTimeout(() => {
            handleCallback();
        }, 100);

        return () => {
            mounted = false;
        };
    }, [navigate]);

    const handleRetry = () => {
        navigate(createPageUrl('Platforms'));
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center p-4">
            <Card className="max-w-md w-full shadow-lg">
                <CardContent className="p-6 sm:p-8">
                    {status === 'processing' && (
                        <div className="text-center">
                            <Loader2 className="w-12 h-12 sm:w-16 sm:h-16 text-blue-600 animate-spin mx-auto mb-4" />
                            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
                                Connecting eBay
                            </h2>
                            <p className="text-sm sm:text-base text-slate-600">{message}</p>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="text-center">
                            <CheckCircle className="w-12 h-12 sm:w-16 sm:h-16 text-green-600 mx-auto mb-4" />
                            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
                                Success!
                            </h2>
                            <p className="text-sm sm:text-base text-slate-600 mb-4">{message}</p>
                            <p className="text-xs sm:text-sm text-slate-500">
                                Redirecting you back to Platforms...
                            </p>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="text-center">
                            <AlertCircle className="w-12 h-12 sm:w-16 sm:h-16 text-red-600 mx-auto mb-4" />
                            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
                                {message}
                            </h2>
                            {errorDetails && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4 mb-4">
                                    <p className="text-xs sm:text-sm text-red-800">{errorDetails}</p>
                                </div>
                            )}
                            <Button 
                                onClick={handleRetry}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                <Home className="w-4 h-4 mr-2" />
                                Go to Platforms
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}