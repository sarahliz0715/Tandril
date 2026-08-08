import { useState } from 'react';
import PropTypes from 'prop-types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { connectBigCommerce } from '@/lib/functions';

/**
 * BigCommerce Connect Button
 * Connects via a self-service Store-level API account (store hash + access token).
 * OAuth isn't offered here — it requires a BigCommerce Partner Portal app registration
 * and platform approval that doesn't exist yet, so showing it would just be a dead end.
 */
export default function BigCommerceConnectButton({ onConnectionSuccess, disabled = false }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [storeHash, setStoreHash] = useState('');
    const [accessToken, setAccessToken] = useState('');

    const handleManualConnect = async () => {
        if (!storeHash || !accessToken) {
            toast.error("Please fill in all fields");
            return;
        }

        setIsLoading(true);
        try {
            // Call backend to connect BigCommerce
            const response = await connectBigCommerce({
                store_hash: storeHash,
                access_token: accessToken
            });

            if (response.data.success) {
                toast.success("Successfully connected to BigCommerce!", {
                    description: `Connected to ${response.data.data.store_info.name}`
                });

                if (onConnectionSuccess) {
                    onConnectionSuccess(response.data.data.platform);
                }

                setIsModalOpen(false);
                resetForm();
            } else {
                throw new Error(response.data.error || "Connection failed");
            }
        } catch (error) {
            console.error("BigCommerce connection error:", error);
            toast.error("Connection Failed", {
                description: error.message || "Failed to connect to BigCommerce"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setStoreHash('');
        setAccessToken('');
    };

    return (
        <>
            <Button
                onClick={() => setIsModalOpen(true)}
                disabled={disabled || isLoading}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                style={{ backgroundColor: '#16a34a' }}
            >
                {isLoading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Connecting...
                    </>
                ) : (
                    'Connect BigCommerce'
                )}
            </Button>

            <Dialog open={isModalOpen} onOpenChange={(open) => {
                setIsModalOpen(open);
                if (!open) resetForm();
            }}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Connect BigCommerce Store</DialogTitle>
                        <DialogDescription>
                            Enter your BigCommerce store hash and a Store-level API access token.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="store-hash">Store Hash</Label>
                            <Input
                                id="store-hash"
                                value={storeHash}
                                onChange={(e) => setStoreHash(e.target.value)}
                                placeholder="abc123def"
                                disabled={isLoading}
                            />
                            <p className="text-xs text-slate-500">
                                Find in your store&apos;s URL: https://store-<strong>abc123def</strong>.mybigcommerce.com
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="access-token">API Access Token</Label>
                            <Input
                                id="access-token"
                                type="password"
                                value={accessToken}
                                onChange={(e) => setAccessToken(e.target.value)}
                                placeholder="Your API token"
                                disabled={isLoading}
                            />
                        </div>

                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
                            <p className="text-xs text-amber-900 font-medium">
                                How to get API credentials:
                            </p>
                            <ol className="text-xs text-amber-800 space-y-1 list-decimal list-inside">
                                <li>Go to Settings &gt; API &gt; Store-level API accounts</li>
                                <li>Click Create API Account (choose the "V2/V3 API Token" type, not Legacy)</li>
                                <li>Set <strong>Products</strong> scope to Modify, and <strong>Information &amp; Settings</strong> scope to Read (required or the connection will fail with a 403)</li>
                                <li>Save, then copy the Access Token</li>
                            </ol>
                        </div>

                        <Button
                            onClick={handleManualConnect}
                            disabled={isLoading || !storeHash || !accessToken}
                            className="w-full"
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

                        <Button
                            variant="link"
                            className="w-full text-xs"
                            onClick={() => window.open('https://developer.bigcommerce.com/api-docs/getting-started/authentication', '_blank')}
                        >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            BigCommerce API Documentation
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
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

BigCommerceConnectButton.propTypes = {
    onConnectionSuccess: PropTypes.func,
    disabled: PropTypes.bool
};
