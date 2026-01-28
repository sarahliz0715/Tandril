import { useState } from 'react';
import PropTypes from 'prop-types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ExternalLink, Package } from 'lucide-react';
import { toast } from 'sonner';
import { connectFaire } from '@/lib/functions';

/**
 * Faire Wholesale Connect Button
 * Handles connection to Faire via OAuth or API Token
 */
export default function FaireConnectButton({ onConnectionSuccess, disabled = false }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [apiToken, setApiToken] = useState('');
    const [brandToken, setBrandToken] = useState('');
    const [useOAuth, setUseOAuth] = useState(true);

    const handleOAuthConnect = async () => {
        setIsLoading(true);
        try {
            // TODO: Implement actual Faire OAuth flow
            toast.info("Faire OAuth coming soon", {
                description: "We're finalizing the Faire wholesale integration. Your connection will be available soon!"
            });

            // const response = await initiateFaireAuth();
            // if (response.data.authUrl) {
            //     window.location.href = response.data.authUrl;
            // }

            setIsModalOpen(false);
        } catch (error) {
            console.error("Faire OAuth error:", error);
            toast.error("Connection Failed", {
                description: error.message || "Failed to connect to Faire"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleManualConnect = async () => {
        if (!apiToken || !brandToken) {
            toast.error("Please fill in all fields");
            return;
        }

        setIsLoading(true);
        try {
            // Call backend to connect Faire
            const response = await connectFaire({
                api_token: apiToken,
                brand_token: brandToken
            });

            if (response.data.success) {
                toast.success("Successfully connected to Faire!", {
                    description: `Connected to ${response.data.store_info.name}`
                });

                if (onConnectionSuccess) {
                    onConnectionSuccess(response.data.platform);
                }

                setIsModalOpen(false);
                resetForm();
            } else {
                throw new Error(response.data.error || "Connection failed");
            }
        } catch (error) {
            console.error("Faire connection error:", error);
            toast.error("Connection Failed", {
                description: error.message || "Failed to connect to Faire"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setApiToken('');
        setBrandToken('');
        setUseOAuth(true);
    };

    return (
        <>
            <Button
                onClick={() => setIsModalOpen(true)}
                disabled={disabled || isLoading}
                className="w-full bg-green-600 hover:bg-green-700"
            >
                {isLoading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Connecting...
                    </>
                ) : (
                    'Connect Faire'
                )}
            </Button>

            <Dialog open={isModalOpen} onOpenChange={(open) => {
                setIsModalOpen(open);
                if (!open) resetForm();
            }}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Package className="w-5 h-5 text-indigo-600" />
                            Connect Faire Wholesale
                        </DialogTitle>
                        <DialogDescription>
                            {useOAuth
                                ? "Authorize Tandril to manage your Faire products and orders"
                                : "Enter your Faire API credentials"
                            }
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {useOAuth ? (
                            <>
                                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 space-y-3">
                                    <p className="text-sm text-indigo-900">
                                        <strong>Wholesale Platform:</strong> Faire connects brands with independent retailers.
                                    </p>
                                    <p className="text-xs text-indigo-800">
                                        You&apos;ll be redirected to Faire to authorize Tandril.
                                        We&apos;ll manage your products, orders, and inventory automatically.
                                    </p>
                                </div>

                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                    <p className="text-xs text-amber-900">
                                        <strong>Note:</strong> You must have an approved Faire brand account to connect.
                                    </p>
                                </div>

                                <Button
                                    onClick={handleOAuthConnect}
                                    disabled={isLoading}
                                    className="w-full"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Redirecting...
                                        </>
                                    ) : (
                                        'Connect with Faire'
                                    )}
                                </Button>

                                <button
                                    onClick={() => setUseOAuth(false)}
                                    className="text-xs text-slate-500 hover:text-slate-700 underline w-full text-center"
                                >
                                    Or enter API token manually
                                </button>
                            </>
                        ) : (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="brand-token">Brand Token</Label>
                                    <Input
                                        id="brand-token"
                                        value={brandToken}
                                        onChange={(e) => setBrandToken(e.target.value)}
                                        placeholder="Your brand token"
                                        disabled={isLoading}
                                    />
                                    <p className="text-xs text-slate-500">
                                        Find in Faire &gt; Settings &gt; API Access
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="api-token">API Access Token</Label>
                                    <Input
                                        id="api-token"
                                        type="password"
                                        value={apiToken}
                                        onChange={(e) => setApiToken(e.target.value)}
                                        placeholder="Your API token"
                                        disabled={isLoading}
                                    />
                                </div>

                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
                                    <p className="text-xs text-amber-900 font-medium">
                                        How to get API credentials:
                                    </p>
                                    <ol className="text-xs text-amber-800 space-y-1 list-decimal list-inside">
                                        <li>Log into your Faire brand account</li>
                                        <li>Go to Settings &gt; Integrations &gt; API</li>
                                        <li>Generate a new API token</li>
                                        <li>Copy both Brand Token and API Token</li>
                                    </ol>
                                </div>

                                <Button
                                    onClick={handleManualConnect}
                                    disabled={isLoading || !apiToken || !brandToken}
                                    className="w-full"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Testing Connection...
                                        </>
                                    ) : (
                                        'Connect Brand'
                                    )}
                                </Button>

                                <button
                                    onClick={() => setUseOAuth(true)}
                                    className="text-xs text-slate-500 hover:text-slate-700 underline w-full text-center"
                                >
                                    Back to OAuth
                                </button>
                            </>
                        )}

                        <Button
                            variant="link"
                            className="w-full text-xs"
                            onClick={() => window.open('https://faire.github.io/external-api-docs/', '_blank')}
                        >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            Faire API Documentation
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

FaireConnectButton.propTypes = {
    onConnectionSuccess: PropTypes.func,
    disabled: PropTypes.bool
};
