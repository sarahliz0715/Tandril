import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { api } from '@/lib/apiClient';
import { toast } from 'sonner';
import { Loader2, ShoppingCart, AlertCircle, ExternalLink } from 'lucide-react';

export default function ShopifyConnectButton({ onConnectionSuccess, label }) {
  const [isOpen, setIsOpen] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorDetails, setErrorDetails] = useState(null);

  // Manual (non-OAuth) connect via a Shopify custom-app Admin API access token.
  // Kept entirely separate from the OAuth state/flow above so the default
  // experience for everyone else is unchanged.
  const [showManualConnect, setShowManualConnect] = useState(false);
  const [manualShopDomain, setManualShopDomain] = useState('');
  const [manualToken, setManualToken] = useState('');
  const [isManualConnecting, setIsManualConnecting] = useState(false);
  const [manualErrorDetails, setManualErrorDetails] = useState(null);

  const handleConnect = async () => {
    if (!storeName.trim()) {
      toast.error("Please enter your Shopify store name");
      return;
    }

    setIsConnecting(true);
    setErrorDetails(null);

    try {
      console.log('🔵 [Shopify] Starting connection for store:', storeName.trim());

      const redirectUri = `${window.location.origin}/api/shopify-callback`;
      const response = await api.functions.invoke('shopify-auth-init', {
        store_name: storeName.trim().replace('.myshopify.com', ''),
        redirect_uri: redirectUri
      });

      console.log('🔵 [Shopify] Response received:', response);

      // Check if this is a standalone mode error
      if (response.error && response.error.includes('standalone mode')) {
        const error = "Demo Mode Active";
        console.warn('⚠️ [Shopify] Standalone mode - platform connections not available');

        setErrorDetails({
          message: "Shopify connection is not available in demo mode",
          details: "This is a demo/preview environment. Platform connections require authentication.\n\nTo enable platform connections:\n1. Deploy with Supabase authentication enabled\n2. Set VITE_STANDALONE_MODE=false in your environment variables\n3. Configure your Shopify API credentials"
        });
        toast.error("Demo Mode Active", {
          description: "Platform connections are not available in demo mode"
        });
        return;
      }

      if (response.data?.authorization_url) {
        console.log('🔵 [Shopify] Redirecting to:', response.data.authorization_url);

        toast.success("Connecting to Shopify...", {
          description: "Taking you to Shopify — you'll be brought right back automatically"
        });

        // Add a small delay to show the toast
        setTimeout(() => {
          window.top.location.href = response.data.authorization_url;
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

  // Handler for the manual Admin API access token path. Mirrors handleConnect's
  // shape but talks to the separate shopify-manual-connect function and never
  // touches window.location, since there's no OAuth redirect involved.
  const handleManualConnect = async () => {
    if (!manualShopDomain.trim() || !manualToken.trim()) {
      toast.error("Please enter both your store name and access token");
      return;
    }

    setIsManualConnecting(true);
    setManualErrorDetails(null);

    try {
      const response = await api.functions.invoke('shopify-manual-connect', {
        shop_domain: manualShopDomain.trim(),
        access_token: manualToken.trim()
      });

      if (response?.success) {
        toast.success("Shopify connected!", {
          description: "Your store was connected using the Admin API access token."
        });
        setIsOpen(false);
        setManualShopDomain('');
        setManualToken('');
        setShowManualConnect(false);
        onConnectionSuccess?.();
      } else {
        const error = response?.error || "Failed to connect with this access token";
        setManualErrorDetails(error);
        toast.error("Connection Failed", { description: error });
      }
    } catch (error) {
      console.error('🔴 [Shopify Manual Connect] Error:', error);
      const errorMessage = error.message || "Failed to connect to Shopify";
      setManualErrorDetails(errorMessage);
      toast.error("Connection Failed", { description: errorMessage });
    } finally {
      setIsManualConnecting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) {
        setErrorDetails(null);
        setStoreName('');
        setShowManualConnect(false);
        setManualShopDomain('');
        setManualToken('');
        setManualErrorDetails(null);
      }
    }}>
      <DialogTrigger asChild>
        <Button className="w-full bg-green-600 hover:bg-green-700">
          <ShoppingCart className="w-4 h-4 mr-2" />
          {label || 'Connect Shopify'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Connect Your Shopify Store</DialogTitle>
          <DialogDescription>
            Enter your Shopify store name. We'll use your existing Shopify login to connect — no extra approval steps needed.
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
                <li>You'll be briefly taken to Shopify in this same tab</li>
                <li>Shopify confirms your existing login (no extra steps if you're already logged in)</li>
                <li>You'll be brought back here automatically</li>
                <li>Your store will be connected and ready to use!</li>
              </ol>
            </AlertDescription>
          </Alert>

          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              className="text-xs text-slate-500 underline hover:text-slate-700"
              onClick={() => setShowManualConnect((v) => !v)}
              disabled={isConnecting}
            >
              {showManualConnect ? 'Hide manual connection option' : 'App showing "under review"? Connect with an Admin API access token instead'}
            </button>

            {showManualConnect && (
              <div className="mt-3 space-y-3 p-3 bg-slate-50 border border-slate-200 rounded">
                {manualErrorDetails && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Connection Error</AlertTitle>
                    <AlertDescription>{manualErrorDetails}</AlertDescription>
                  </Alert>
                )}
                <p className="text-xs text-slate-600">
                  In your Shopify admin, go to <span className="font-medium">Settings → Apps and sales channels → Develop apps</span>, create a custom app, give it the scopes you need, install it on your store, and copy the Admin API access token it gives you.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="manual-shop-domain">Store Name</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="manual-shop-domain"
                      placeholder="your-store"
                      value={manualShopDomain}
                      onChange={(e) => setManualShopDomain(e.target.value)}
                      disabled={isManualConnecting}
                    />
                    <span className="text-sm text-slate-500 whitespace-nowrap">.myshopify.com</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="manual-access-token">Admin API Access Token</Label>
                  <Input
                    id="manual-access-token"
                    type="password"
                    placeholder="shpat_..."
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value)}
                    disabled={isManualConnecting}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleManualConnect}
                  disabled={isManualConnecting}
                >
                  {isManualConnecting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    'Connect with token'
                  )}
                </Button>
              </div>
            )}
          </div>
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
