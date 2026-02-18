import { useState } from 'react';
import PropTypes from 'prop-types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Amazon Seller Central Connect Button
 * Handles OAuth connection to Amazon SP-API
 */
export default function AmazonConnectButton({ disabled = false }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [sellerId, setSellerId] = useState('');
    const [region, setRegion] = useState('NA'); // NA, EU, FE (Far East)
    const [marketplaceId, setMarketplaceId] = useState('ATVPDKIKX0DER'); // US marketplace

    const marketplaces = {
        NA: [
            { id: 'ATVPDKIKX0DER', name: 'United States' },
            { id: 'A2EUQ1WTGCTBG2', name: 'Canada' },
            { id: 'A1AM78C64UM0Y8', name: 'Mexico' },
            { id: 'A2Q3Y263D00KWC', name: 'Brazil' }
        ],
        EU: [
            { id: 'A1F83G8C2ARO7P', name: 'United Kingdom' },
            { id: 'A13V1IB3VIYZZH', name: 'France' },
            { id: 'A1PA6795UKMFR9', name: 'Germany' },
            { id: 'APJ6JRA9NG5V4', name: 'Italy' },
            { id: 'A1RKKUPIHCS9HS', name: 'Spain' }
        ],
        FE: [
            { id: 'A1VC38T7YXB528', name: 'Japan' },
            { id: 'A39IBJ37TRP1C6', name: 'Australia' },
            { id: 'A19VAU5U5O7RUS', name: 'Singapore' }
        ]
    };

    const handleConnect = async () => {
        if (!sellerId) {
            toast.error("Please enter your Seller ID");
            return;
        }

        setIsLoading(true);
        try {
            // In a real implementation, this would call your backend to:
            // 1. Register the app with Amazon (if not done)
            // 2. Initiate OAuth flow
            // 3. Get authorization URL

            toast.info("Amazon connection coming soon", {
                description: "We're finalizing the Amazon SP-API integration. Your connection will be available soon!"
            });

            // TODO: Implement actual Amazon OAuth flow
            // const response = await initiateAmazonAuth({ seller_id: sellerId, region, marketplace_id: marketplaceId });
            // if (response.data.authUrl) {
            //     window.location.href = response.data.authUrl;
            // }

            setIsModalOpen(false);
        } catch (error) {
            console.error("Amazon connection error:", error);
            toast.error("Connection Failed", {
                description: error.message || "Failed to connect to Amazon"
            });
        } finally {
            setIsLoading(false);
        }
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
                    'Connect Amazon'
                )}
            </Button>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Connect Amazon Seller Central</DialogTitle>
                        <DialogDescription>
                            Connect your Amazon Seller account to sync products, orders, and inventory.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="seller-id">Seller ID</Label>
                            <Input
                                id="seller-id"
                                value={sellerId}
                                onChange={(e) => setSellerId(e.target.value)}
                                placeholder="A1B2C3D4E5F6G7"
                                disabled={isLoading}
                            />
                            <p className="text-xs text-slate-500">
                                Find your Seller ID in Seller Central &gt; Settings &gt; Account Info
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="region">Region</Label>
                            <Select value={region} onValueChange={(value) => {
                                setRegion(value);
                                setMarketplaceId(marketplaces[value][0].id);
                            }}>
                                <SelectTrigger id="region">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="NA">North America</SelectItem>
                                    <SelectItem value="EU">Europe</SelectItem>
                                    <SelectItem value="FE">Far East</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="marketplace">Primary Marketplace</Label>
                            <Select value={marketplaceId} onValueChange={setMarketplaceId}>
                                <SelectTrigger id="marketplace">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {marketplaces[region].map(mp => (
                                        <SelectItem key={mp.id} value={mp.id}>
                                            {mp.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <p className="text-xs text-blue-900">
                                <strong>Note:</strong> You&apos;ll be redirected to Amazon to authorize Tandril.
                                Make sure you have your Seller Central login ready.
                            </p>
                        </div>

                        <Button
                            variant="link"
                            className="w-full text-xs"
                            onClick={() => window.open('https://developer.amazonservices.com/', '_blank')}
                        >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            Learn about Amazon SP-API
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
                        <Button onClick={handleConnect} disabled={isLoading || !sellerId}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Connecting...
                                </>
                            ) : (
                                'Continue to Amazon'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

AmazonConnectButton.propTypes = {
    disabled: PropTypes.bool
};
