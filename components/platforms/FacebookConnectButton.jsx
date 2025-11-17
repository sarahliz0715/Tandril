
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Facebook, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { initiateFacebookAuth } from '@/api/functions';
import { handleFacebookCallback } from '@/api/functions';

export default function FacebookConnectButton({ onConnectionSuccess, isConnected, platformType }) {
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState(null);

    const handleConnect = async () => {
        setIsConnecting(true);
        setError(null);
        
        try {
            console.log('Starting Facebook connection process...');
            
            const response = await initiateFacebookAuth();
            console.log('Facebook auth response:', response);
            
            if (!response.data) {
                throw new Error('No response data from Facebook auth initiation');
            }

            if (!response.data.success) {
                throw new Error(response.data.error || 'Failed to initiate Facebook authentication');
            }

            if (!response.data.url) {
                throw new Error('No authorization URL received from Facebook');
            }

            console.log('Redirecting to Facebook:', response.data.url);
            
            // Open Facebook auth in a popup window
            const popup = window.open(
                response.data.url,
                'facebook-auth',
                'width=600,height=700,scrollbars=yes,resizable=yes'
            );

            if (!popup) {
                throw new Error('Popup blocked. Please allow popups for this site and try again.');
            }

            // Listen for the popup to close or send a message
            const pollTimer = setInterval(() => {
                try {
                    if (popup.closed) {
                        clearInterval(pollTimer);
                        console.log('Facebook popup was closed');
                        setIsConnecting(false);
                        
                        // Check if connection was successful by looking at URL
                        const urlParams = new URLSearchParams(window.location.search);
                        const code = urlParams.get('code');
                        const state = urlParams.get('state');
                        
                        if (code && state) {
                            handleFacebookReturn(code, state);
                        } else {
                            toast.info('Facebook connection cancelled');
                        }
                    }
                } catch (e) {
                    // This can happen due to cross-origin restrictions, which is normal
                    console.log('Cross-origin popup access blocked (this is normal)');
                }
            }, 1000);

            // Also listen for a message from the popup
            const messageListener = (event) => {
                if (event.origin !== window.location.origin) return;
                
                if (event.data.type === 'FACEBOOK_AUTH_SUCCESS') {
                    clearInterval(pollTimer);
                    popup.close();
                    window.removeEventListener('message', messageListener);
                    handleFacebookReturn(event.data.code, event.data.state);
                } else if (event.data.type === 'FACEBOOK_AUTH_ERROR') {
                    clearInterval(pollTimer);
                    popup.close();
                    window.removeEventListener('message', messageListener);
                    setIsConnecting(false);
                    setError(event.data.error);
                    toast.error('Facebook connection failed: ' + event.data.error);
                }
            };
            
            window.addEventListener('message', messageListener);

            // Cleanup after 5 minutes
            setTimeout(() => {
                clearInterval(pollTimer);
                window.removeEventListener('message', messageListener);
                if (!popup.closed) {
                    popup.close();
                    setIsConnecting(false);
                    toast.error('Facebook connection timed out');
                }
            }, 300000);

        } catch (error) {
            console.error('Facebook connect error:', error);
            setError(error.message);
            setIsConnecting(false);
            toast.error('Connection failed: ' + error.message);
        }
    };

    const handleFacebookReturn = async (code, state) => {
        console.log('Processing Facebook callback with code:', code?.substring(0, 10) + '...');
        
        try {
            const response = await handleFacebookCallback({ code, state });
            console.log('Facebook callback response:', response);
            
            if (!response.data) {
                throw new Error('No response from Facebook callback handler');
            }

            if (response.data.success) {
                toast.success('Facebook connected successfully!');
                if (onConnectionSuccess) {
                    onConnectionSuccess(response.data.platform);
                }
            } else {
                throw new Error(response.data.error || 'Facebook connection failed');
            }
        } catch (error) {
            console.error('Facebook callback error:', error);
            setError(error.message);
            toast.error('Connection failed: ' + error.message);
        } finally {
            setIsConnecting(false);
        }
    };

    const handleTestConnect = async () => {
        setIsConnecting(true);
        setError(null);
        
        try {
            // Create a test Facebook platform connection
            const testPlatform = {
                name: 'Facebook Ads (Test Mode)',
                platform_type: 'facebook',
                status: 'connected',
                api_credentials: { 
                    access_token: 'test_token_demo',
                    facebook_user_id: 'demo_user_123'
                },
                store_info: { 
                    profile_name: 'Demo Facebook Account'
                },
                is_demo_data: true
            };
            
            // Simulate the connection
            setTimeout(() => {
                toast.success('Facebook connected successfully (Test Mode)!');
                if (onConnectionSuccess) {
                    onConnectionSuccess(testPlatform);
                }
                setIsConnecting(false);
            }, 2000);
            
        } catch (error) {
            console.error('Test connection error:', error);
            setError(error.message);
            setIsConnecting(false);
            toast.error('Test connection failed: ' + error.message);
        }
    };

    if (isConnected) {
        return (
            <Button disabled variant="outline" className="w-full">
                <Facebook className="w-4 h-4 mr-2" />
                Connected
            </Button>
        );
    }

    return (
        <div className="w-full space-y-2">
            <Button 
                onClick={handleConnect} 
                disabled={isConnecting}
                className="w-full bg-blue-600 hover:bg-blue-700"
            >
                {isConnecting ? (
                    <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Connecting...
                    </>
                ) : (
                    <>
                        <Facebook className="w-4 h-4 mr-2" />
                        Connect Facebook (Live)
                    </>
                )}
            </Button>
            
            <Button 
                onClick={handleTestConnect} 
                disabled={isConnecting}
                variant="outline"
                className="w-full"
            >
                Connect Facebook (Test Mode)
            </Button>
            
            {error && (
                <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}
        </div>
    );
}
