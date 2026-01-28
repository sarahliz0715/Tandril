import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/apiClient';

export default function EbayConnectButton({ onConnectionSuccess, disabled }) {
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState(null);

    const handleConnect = async () => {
        setIsConnecting(true);
        setError(null);
        
        try {
            console.log('[EbayConnectButton] Starting eBay connection...');
            
            const response = await api.functions.invoke('initiateEbayAuth');
            console.log('[EbayConnectButton] Response:', response.data);
            
            if (!response.data) {
                throw new Error('No response data from eBay auth initiation');
            }

            if (!response.data.success) {
                throw new Error(response.data.error || 'Failed to initiate eBay authentication');
            }

            if (!response.data.auth_url) {
                throw new Error('No authorization URL received from eBay');
            }

            console.log('[EbayConnectButton] Redirecting to:', response.data.auth_url);
            
            // IMPORTANT: Use full page redirect, not popup
            // eBay's CSP doesn't allow iframe/popup from non-ebay.com domains
            window.location.href = response.data.auth_url;

        } catch (error) {
            console.error('[EbayConnectButton] Error:', error);
            setError(error.message);
            setIsConnecting(false);
            toast.error('Connection Failed', {
                description: error.message || 'Failed to connect to eBay'
            });
        }
    };

    return (
        <div className="w-full space-y-2">
            <Button 
                onClick={handleConnect} 
                disabled={isConnecting || disabled}
                className="w-full bg-blue-600 hover:bg-blue-700"
            >
                {isConnecting ? (
                    <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Connecting to eBay...
                    </>
                ) : (
                    <>
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Connect eBay
                    </>
                )}
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