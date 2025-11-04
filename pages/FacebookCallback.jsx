import React, { useEffect } from 'react';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function FacebookCallback() {
    const navigate = useNavigate();

    useEffect(() => {
        const handleCallback = async () => {
            try {
                const urlParams = new URLSearchParams(window.location.search);
                const code = urlParams.get('code');
                const state = urlParams.get('state');
                const error = urlParams.get('error');
                const errorDescription = urlParams.get('error_description');

                if (error) {
                    console.error('Facebook OAuth error:', error, errorDescription);
                    
                    // Send error to parent window if opened in popup
                    if (window.opener) {
                        window.opener.postMessage({
                            type: 'FACEBOOK_AUTH_ERROR',
                            error: errorDescription || error
                        }, window.location.origin);
                        window.close();
                        return;
                    }
                    
                    // Redirect to platforms page with error
                    navigate(createPageUrl('Platforms?error=' + encodeURIComponent(errorDescription || error)));
                    return;
                }

                if (!code || !state) {
                    console.error('Missing code or state parameter');
                    
                    if (window.opener) {
                        window.opener.postMessage({
                            type: 'FACEBOOK_AUTH_ERROR',
                            error: 'Invalid callback parameters'
                        }, window.location.origin);
                        window.close();
                        return;
                    }
                    
                    navigate(createPageUrl('Platforms?error=invalid_callback'));
                    return;
                }

                console.log('Facebook callback received with code and state');

                // Send success to parent window if opened in popup
                if (window.opener) {
                    window.opener.postMessage({
                        type: 'FACEBOOK_AUTH_SUCCESS',
                        code,
                        state
                    }, window.location.origin);
                    window.close();
                    return;
                }

                // If not in popup, redirect to platforms page
                navigate(createPageUrl('Platforms?facebook_code=' + encodeURIComponent(code) + '&facebook_state=' + encodeURIComponent(state)));

            } catch (error) {
                console.error('Facebook callback error:', error);
                
                if (window.opener) {
                    window.opener.postMessage({
                        type: 'FACEBOOK_AUTH_ERROR',
                        error: error.message
                    }, window.location.origin);
                    window.close();
                    return;
                }
                
                navigate(createPageUrl('Platforms?error=' + encodeURIComponent(error.message)));
            }
        };

        handleCallback();
    }, [navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
                <h2 className="text-lg font-medium text-gray-900 mb-2">Processing Facebook Connection...</h2>
                <p className="text-gray-600">Please wait while we complete the setup.</p>
            </div>
        </div>
    );
}