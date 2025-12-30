import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { api } from '@/api/apiClient';
import { toast } from 'sonner';
import { Loader2, ShoppingCart, AlertCircle, ExternalLink } from 'lucide-react';

export default function ShopifyConnectButton({ onConnectionSuccess }) {
    const [isOpen, setIsOpen] = useState(false);
    const [storeName, setStoreName] = useState('');
    const [isConnecting, setIsConnecting] = useState(false);
    const [errorDetails, setErrorDetails] = useState(null);

    const handleConnect = async () => {
        if (!storeName.trim()) {
            toast.error("Please enter your Shopify store name");
            return;
        }

        setIsConnecting(true);
        setErrorDetails(null);
        
        try {
            console.log('🔵 [Shopify] Starting connection for store:', storeName.trim());

            const response = await api.functions.invoke('shopify-auth-init', {
                store_name: storeName.trim().replace('.myshopify.com', '')
            });

            console.log('🔵 [Shopify] Response received:', response);

            // Check if this is a standalone mode error
            if (response.error && response.error.includes('standalone mode')) {
                const error = "Demo Mode Active";
                console.warn('⚠️ [Shopify] Standalone mode - platform connections not available');

                setErrorDetails({
                    message: "Shopify connection is not available in demo mode",
                    details: "This is a demo/preview environment. Platform connections require authentication.\n\nTo enable platform connections:\n1. Deploy with Base44 authentication enabled\n2. Set VITE_STANDALONE_MODE=false in your environment variables\n3. Configure your Shopify API credentials"
                });
                toast.error("Demo Mode Active", {
                    description: "Platform connections are not available in demo mode"
                });
                return;
            }

            if (response.data?.authorization_url) {
                console.log('🔵 [Shopify] Redirecting to:', response.data.authorization_url);

                toast.success("Redirecting to Shopify...", {
                    description: "Please authorize Tandril in the next window"
                });

                // Add a small delay to show the toast
                setTimeout(() => {
                    window.location.href = response.data.authorization_url;
                }, 500);
            } else {
                const error = "No authorization URL received from server";
                console.error('🔴 [Shopify] Error:', error);
                console.error('🔴 [Shopify] Full response:', response);

                setErrorDetails({
                    message: error,
                    details: JSON.stringify(response.data || response, null, 2)
                });
                toast.error("Connection Failed", { description: error });
            }
        } catch (error) {
            console.error('🔴 [Shopify] Connection error:', error);

            const errorMessage = error.response?.data?.details || error.response?.data?.error || error.message;
            const fullError = error.response?.data || error;

            setErrorDetails({
                message: errorMessage,
                details: JSON.stringify(fullError, null, 2),
                status: error.response?.status
            });

            toast.error("Connection Failed", {
                description: errorMessage || "Failed to connect to Shopify. Check the error details below."
            });
        } finally {
            setIsConnecting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) {
                setErrorDetails(null);
                setStoreName('');
            }
        }}>
            <DialogTrigger asChild>
                <Button className="w-full bg-green-600 hover:bg-green-700">
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Connect Shopify
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Connect Your Shopify Store</DialogTitle>
                    <DialogDescription>
                        Enter your Shopify store name to connect. You'll be redirected to Shopify to authorize the connection.
                    </DialogDescription>
                </DialogHeader>
                
                {errorDetails && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Connection Error {errorDetails.status && `(${errorDetails.status})`}</AlertTitle>
                        <AlertDescription>
                            <div className="space-y-2">
                                <p className="font-semibold">{errorDetails.message}</p>
                                <details className="text-xs">
                                    <summary className="cursor-pointer hover:underline">Technical Details</summary>
                                    <pre className="mt-2 p-2 bg-black/10 rounded overflow-auto max-h-40">
                                        {errorDetails.details}
                                    </pre>
                                </details>
                                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded">
                                    <p className="text-sm text-amber-900 font-semibold mb-2">Common Issues:</p>
                                    <ul className="text-xs text-amber-800 space-y-1">
                                        <li>• Make sure your store name is correct (without .myshopify.com)</li>
                                        <li>• Check that SHOPIFY_API_KEY is set in environment variables</li>
                                        <li>• Verify your Shopify app is set up correctly in Partners dashboard</li>
                                        <li>• Ensure redirect URI matches in Shopify app settings</li>
                                    </ul>
                                </div>
                            </div>
                        </AlertDescription>
                    </Alert>
                )}
                
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="store-name">Store Name</Label>
                        <div className="flex items-center gap-2">
                            <Input
                                id="store-name"
                                placeholder="your-store"
                                value={storeName}
                                onChange={(e) => setStoreName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !isConnecting) {
                                        handleConnect();
                                    }
                                }}
                                disabled={isConnecting}
                            />
                            <span className="text-sm text-slate-500 whitespace-nowrap">.myshopify.com</span>
                        </div>
                        <p className="text-xs text-slate-500">
                            Example: If your store is https://my-awesome-store.myshopify.com, enter "my-awesome-store"
                        </p>
                    </div>
                    
                    <Alert className="bg-blue-50 border-blue-200">
                        <ExternalLink className="h-4 w-4 text-blue-600" />
                        <AlertTitle className="text-blue-900">What happens next?</AlertTitle>
                        <AlertDescription className="text-blue-700 text-sm">
                            <ol className="list-decimal list-inside space-y-1 mt-2">
                                <li>You'll be redirected to Shopify</li>
                                <li>Review and approve the permissions</li>
                                <li>You'll be redirected back to Tandril</li>
                                <li>Your store will be connected and ready to use!</li>
                            </ol>
                        </AlertDescription>
                    </Alert>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isConnecting}>
                        Cancel
                    </Button>
                    <Button onClick={handleConnect} disabled={isConnecting}>
                        {isConnecting ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Connecting...
                            </>
                        ) : (
                            'Continue to Shopify'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}