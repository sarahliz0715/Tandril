
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { connectShopifyCustomApp } from '@/api/functions';
import { initiateEtsyAuth } from '@/api/functions';
import { initiateFacebookAuth } from '@/api/functions';

// Shopify Connection Modal
const ShopifyConnectModal = ({ open, onOpenChange, onConnectionSuccess }) => {
    const [storeName, setStoreName] = useState('');
    const [accessToken, setAccessToken] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async () => {
        if (!storeName || !accessToken) {
            toast.error("Please fill in both fields.");
            return;
        }
        setIsLoading(true);
        try {
            const { data } = await connectShopifyCustomApp({ store_name: storeName, access_token: accessToken });
            
            if (data.success) {
                toast.success(data.message || "Successfully connected to Shopify!");
                if (onConnectionSuccess) {
                    onConnectionSuccess(data.platform);
                }
                onOpenChange(false);
                setStoreName('');
                setAccessToken('');
            } else {
                throw new Error(data.error || "An unknown error occurred.");
            }
        } catch (error) {
            console.error("Shopify connection error:", error);
            toast.error("Connection Failed", { description: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Connect Shopify Custom App</DialogTitle>
                    <DialogDescription>
                        Enter your Shopify store name (e.g., your-store) and your Custom App Access Token.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="store-name">Store Name</Label>
                        <Input 
                            id="store-name" 
                            value={storeName} 
                            onChange={(e) => setStoreName(e.target.value)} 
                            placeholder="your-store" 
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="access-token">Admin API Access Token</Label>
                        <Input 
                            id="access-token" 
                            type="password"
                            value={accessToken} 
                            onChange={(e) => setAccessToken(e.target.value)} 
                            placeholder="shpat_..."
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Connect
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

// Main Component
export default function PlatformConnectionManager({ platformType, onConnectionSuccess, children }) {
    const [isShopifyModalOpen, setIsShopifyModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleClick = async () => {
        switch (platformType.type_id) {
            case 'shopify':
                setIsShopifyModalOpen(true);
                break;
            case 'etsy':
                await handleEtsyConnect();
                break;
            case 'facebook':
                await handleFacebookConnect();
                break;
            default:
                toast.warning(`Connection for ${platformType.name} is not yet available.`);
        }
    };

    const handleEtsyConnect = async () => {
        setIsLoading(true);
        try {
            toast.info("Redirecting to Etsy for authorization...");
            const { data } = await initiateEtsyAuth();
            
            if (data.success && data.authUrl) {
                // Open Etsy OAuth in the same window
                window.location.href = data.authUrl;
            } else {
                throw new Error(data.error || "Failed to initiate Etsy connection");
            }
        } catch (error) {
            console.error("Etsy connection error:", error);
            toast.error("Failed to connect to Etsy", { 
                description: error.message 
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleFacebookConnect = async () => {
        setIsLoading(true);
        try {
            toast.info("Redirecting to Facebook for authorization...");
            const { data } = await initiateFacebookAuth();
            
            if (data.success && data.url) {
                // Redirect to Facebook OAuth
                window.location.href = data.url;
            } else {
                throw new Error(data.error || "Failed to initiate Facebook connection");
            }
        } catch (error) {
            console.error("Facebook connection error:", error);
            toast.error("Failed to connect to Facebook", { 
                description: error.message 
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <Button onClick={handleClick} disabled={isLoading}>
                {isLoading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Connecting...
                    </>
                ) : (
                    children || "Connect"
                )}
            </Button>
            
            {platformType.type_id === 'shopify' && (
                <ShopifyConnectModal
                    open={isShopifyModalOpen}
                    onOpenChange={setIsShopifyModalOpen}
                    onConnectionSuccess={onConnectionSuccess}
                />
            )}
        </>
    );
}
