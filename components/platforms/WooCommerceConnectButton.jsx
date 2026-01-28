import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

/**
 * WooCommerce Connect Button
 * Handles connection to WooCommerce stores via REST API
 */
export default function WooCommerceConnectButton({ onConnectionSuccess, disabled = false }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [storeUrl, setStoreUrl] = useState('');
    const [consumerKey, setConsumerKey] = useState('');
    const [consumerSecret, setConsumerSecret] = useState('');

    const handleConnect = async () => {
        if (!storeUrl || !consumerKey || !consumerSecret) {
            toast.error("Please fill in all fields");
            return;
        }

        // Validate URL format
        let normalizedUrl = storeUrl.trim();
        if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
            normalizedUrl = 'https://' + normalizedUrl;
        }

        setIsLoading(true);
        try {
            // TODO: Implement actual WooCommerce connection
            // This would call your backend to:
            // 1. Test the connection
            // 2. Store credentials securely
            // 3. Initiate initial sync

            toast.info("WooCommerce connection coming soon", {
                description: "We're finalizing the WooCommerce integration. Your connection will be available soon!"
            });

            // const response = await connectWooCommerce({
            //     store_url: normalizedUrl,
            //     consumer_key: consumerKey,
            //     consumer_secret: consumerSecret
            // });
            //
            // if (response.data.success) {
            //     toast.success("Successfully connected to WooCommerce!");
            //     if (onConnectionSuccess) {
            //         onConnectionSuccess(response.data.platform);
            //     }
            //     setIsModalOpen(false);
            // }

            setIsModalOpen(false);
            resetForm();
        } catch (error) {
            console.error("WooCommerce connection error:", error);
            toast.error("Connection Failed", {
                description: error.message || "Failed to connect to WooCommerce"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setStoreUrl('');
        setConsumerKey('');
        setConsumerSecret('');
    };

    return (
        <>
            <Button
                onClick={() => setIsModalOpen(true)}
                disabled={disabled || isLoading}
                className="w-full"
            >
                {isLoading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Connecting...
                    </>
                ) : (
                    'Connect WooCommerce'
                )}
            </Button>

            <Dialog open={isModalOpen} onOpenChange={(open) => {
                setIsModalOpen(open);
                if (!open) resetForm();
            }}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Connect WooCommerce Store</DialogTitle>
                        <DialogDescription>
                            Enter your WooCommerce store URL and REST API credentials.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="store-url">Store URL</Label>
                            <Input
                                id="store-url"
                                value={storeUrl}
                                onChange={(e) => setStoreUrl(e.target.value)}
                                placeholder="https://your-store.com"
                                disabled={isLoading}
                            />
                            <p className="text-xs text-slate-500">
                                Your WordPress site URL where WooCommerce is installed
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="consumer-key">Consumer Key</Label>
                            <Input
                                id="consumer-key"
                                value={consumerKey}
                                onChange={(e) => setConsumerKey(e.target.value)}
                                placeholder="ck_..."
                                disabled={isLoading}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="consumer-secret">Consumer Secret</Label>
                            <Input
                                id="consumer-secret"
                                type="password"
                                value={consumerSecret}
                                onChange={(e) => setConsumerSecret(e.target.value)}
                                placeholder="cs_..."
                                disabled={isLoading}
                            />
                        </div>

                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
                            <p className="text-xs text-amber-900 font-medium">
                                How to get API credentials:
                            </p>
                            <ol className="text-xs text-amber-800 space-y-1 list-decimal list-inside">
                                <li>Go to WooCommerce {'>'} Settings {'>'} Advanced {'>'} REST API</li>
                                <li>Click "Add key"</li>
                                <li>Set permissions to "Read/Write"</li>
                                <li>Copy the Consumer Key and Consumer Secret</li>
                            </ol>
                        </div>

                        <Button
                            variant="link"
                            className="w-full text-xs"
                            onClick={() => window.open('https://woocommerce.com/document/woocommerce-rest-api/', '_blank')}
                        >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            WooCommerce REST API Documentation
                        </Button>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsModalOpen(false)}
                            disabled={isLoading}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleConnect}
                            disabled={isLoading || !storeUrl || !consumerKey || !consumerSecret}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Testing Connection...
                                </>
                            ) : (
                                'Connect Store'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
