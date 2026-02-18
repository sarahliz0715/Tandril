import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { initiateEtsyAuth } from '@/lib/functions';
import { toast } from 'sonner';

export default function EtsyConnectButton({ onConnectionStart }) {
    const [isConnecting, setIsConnecting] = useState(false);

    const handleConnect = async () => {
        setIsConnecting(true);
        onConnectionStart?.();

        try {
            console.log('Initiating Etsy OAuth...');
            const response = await initiateEtsyAuth();
            console.log('Auth initiation response:', response);

            const authUrl = response?.data?.authUrl;
            
            if (!authUrl) {
                throw new Error('Failed to get authorization URL from server');
            }

            console.log('Redirecting to:', authUrl);
            
            // Add a small delay to ensure state is saved
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Redirect to Etsy OAuth
            window.location.href = authUrl;
        } catch (error) {
            console.error('Etsy connection error:', error);
            toast.error('Failed to connect to Etsy', {
                description: error.message || 'Please try again or contact support'
            });
            setIsConnecting(false);
        }
    };

    return (
        <Button
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full"
        >
            {isConnecting ? (
                <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Redirecting to Etsy...
                </>
            ) : (
                'Connect Etsy'
            )}
        </Button>
    );
}