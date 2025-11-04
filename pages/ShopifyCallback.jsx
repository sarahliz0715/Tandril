import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';

export default function ShopifyCallback() {
    const [status, setStatus] = useState('processing'); // processing, success, error
    const [message, setMessage] = useState('Processing Shopify connection...');
    const [errorDetails, setErrorDetails] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const handleCallback = async () => {
            console.log('🔵 [ShopifyCallback] Page loaded');
            
            try {
                // Get URL parameters
                const urlParams = new URLSearchParams(window.location.search);
                const code = urlParams.get('code');
                const state = urlParams.get('state');
                const shop = urlParams.get('shop');
                const error = urlParams.get('error');
                const errorDescription = urlParams.get('error_description');

                console.log('🔵 [ShopifyCallback] URL params:', { 
                    hasCode: !!code, 
                    hasState: !!state, 
                    shop,
                    error,
                    errorDescription
                });

                // Check for OAuth errors from Shopify
                if (error) {
                    console.error('🔴 [ShopifyCallback] OAuth error from Shopify:', error);
                    setStatus('error');
                    setMessage(`Shopify Error: ${errorDescription || error}`);
                    setErrorDetails({
                        type: 'shopify_oauth_error',
                        error,
                        description: errorDescription
                    });
                    toast.error('Connection Failed', {
                        description: errorDescription || error
                    });
                    return;
                }

                // Validate required parameters
                if (!code || !state) {
                    console.error('🔴 [ShopifyCallback] Missing required parameters');
                    setStatus('error');
                    setMessage('Invalid callback - missing code or state parameter');
                    setErrorDetails({
                        type: 'missing_parameters',
                        hasCode: !!code,
                        hasState: !!state,
                        allParams: Object.fromEntries(urlParams.entries())
                    });
                    return;
                }

                setMessage('Exchanging authorization code...');
                console.log('🔵 [ShopifyCallback] Calling handleShopifyCallback function...');

                // Call the backend to exchange the code for access token
                const response = await base44.functions.invoke('handleShopifyCallback', {
                    code,
                    state,
                    shop
                });

                console.log('🔵 [ShopifyCallback] Backend response:', response);

                if (response.data?.success) {
                    console.log('✅ [ShopifyCallback] Connection successful!');
                    setStatus('success');
                    setMessage('Successfully connected to Shopify!');
                    
                    toast.success('Shopify Connected!', {
                        description: `Your store ${shop || 'store'} is now connected`
                    });

                    // Redirect to platforms page after 2 seconds
                    setTimeout(() => {
                        navigate(createPageUrl('Platforms'));
                    }, 2000);
                } else {
                    console.error('🔴 [ShopifyCallback] Backend returned error:', response.data);
                    setStatus('error');
                    setMessage(response.data?.error || 'Failed to complete connection');
                    setErrorDetails({
                        type: 'backend_error',
                        response: response.data
                    });
                    
                    toast.error('Connection Failed', {
                        description: response.data?.error || 'Unknown error'
                    });
                }

            } catch (error) {
                console.error('🔴 [ShopifyCallback] Fatal error:', error);
                setStatus('error');
                setMessage('Failed to connect to Shopify');
                setErrorDetails({
                    type: 'exception',
                    message: error.message,
                    stack: error.stack
                });
                
                toast.error('Connection Failed', {
                    description: error.message
                });
            }
        };

        handleCallback();
    }, [navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 via-white to-slate-100">
            <Card className="max-w-md w-full">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                        <ShoppingCart className="w-6 h-6 text-green-600" />
                        Shopify Connection
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {status === 'processing' && (
                        <div className="flex flex-col items-center gap-4 py-6">
                            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
                            <p className="text-slate-700 text-center">{message}</p>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="flex flex-col items-center gap-4 py-6">
                            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                                <CheckCircle className="w-10 h-10 text-green-600" />
                            </div>
                            <div className="text-center space-y-2">
                                <p className="text-lg font-semibold text-slate-900">{message}</p>
                                <p className="text-sm text-slate-600">Redirecting to platforms page...</p>
                            </div>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="space-y-4">
                            <div className="flex flex-col items-center gap-4 py-6">
                                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                                    <XCircle className="w-10 h-10 text-red-600" />
                                </div>
                                <div className="text-center space-y-2">
                                    <p className="text-lg font-semibold text-slate-900">Connection Failed</p>
                                    <p className="text-sm text-slate-600">{message}</p>
                                </div>
                            </div>

                            {errorDetails && (
                                <Alert variant="destructive">
                                    <AlertDescription>
                                        <details className="text-xs">
                                            <summary className="cursor-pointer hover:underline font-semibold mb-2">
                                                Technical Details
                                            </summary>
                                            <pre className="mt-2 p-2 bg-black/10 rounded overflow-auto max-h-40">
                                                {JSON.stringify(errorDetails, null, 2)}
                                            </pre>
                                        </details>
                                    </AlertDescription>
                                </Alert>
                            )}

                            <div className="flex justify-center gap-3 mt-6">
                                <button
                                    onClick={() => navigate(createPageUrl('Platforms'))}
                                    className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
                                >
                                    Back to Platforms
                                </button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}