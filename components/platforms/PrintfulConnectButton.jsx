import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, ExternalLink, Shirt } from 'lucide-react';
import { connectPrintful } from '@/lib/functions';
import { syncPrintfulProducts } from '@/lib/functions';
import { toast } from 'sonner';

export default function PrintfulConnectButton({ 
    platformType, 
    isConnected, 
    onConnectionSuccess 
}) {
    const [isConnecting, setIsConnecting] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    const handleConnect = async () => {
        setIsConnecting(true);
        try {
            const response = await connectPrintful();
            
            if (response.error || response.data?.error) {
                throw new Error(response.data?.error || response.error);
            }

            toast.success('Printful Connected!', {
                description: response.data.message
            });

            // Auto-sync products after connection
            handleSync();
            
            if (onConnectionSuccess) {
                onConnectionSuccess();
            }

        } catch (error) {
            console.error('Printful connection error:', error);
            toast.error('Connection Failed', {
                description: error.message || 'Failed to connect to Printful'
            });
        } finally {
            setIsConnecting(false);
        }
    };

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            const response = await syncPrintfulProducts();
            
            if (response.error || response.data?.error) {
                throw new Error(response.data?.error || response.error);
            }

            toast.success('Products Synced!', {
                description: response.data.message
            });

        } catch (error) {
            console.error('Printful sync error:', error);
            toast.error('Sync Failed', {
                description: error.message || 'Failed to sync products'
            });
        } finally {
            setIsSyncing(false);
        }
    };

    if (isConnected) {
        return (
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <Badge className="bg-green-100 text-green-800">Connected</Badge>
                </div>
                <Button 
                    onClick={handleSync}
                    disabled={isSyncing}
                    variant="outline"
                    size="sm"
                    className="w-full"
                >
                    {isSyncing ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Syncing Products...
                        </>
                    ) : (
                        <>
                            <Shirt className="w-4 h-4 mr-2" />
                            Sync Products
                        </>
                    )}
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <Button 
                onClick={handleConnect}
                disabled={isConnecting}
                className="w-full bg-orange-600 hover:bg-orange-700"
                size="sm"
            >
                {isConnecting ? (
                    <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Connecting...
                    </>
                ) : (
                    <>
                        <Shirt className="w-4 h-4 mr-2" />
                        Connect Printful
                    </>
                )}
            </Button>
            
            <p className="text-xs text-slate-500 text-center">
                Uses the API key you configured
            </p>
        </div>
    );
}