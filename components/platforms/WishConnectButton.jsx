import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { api } from '@/lib/apiClient';
import { toast } from 'sonner';

export default function WishConnectButton({ onConnectionSuccess, disabled = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [accessToken, setAccessToken] = useState('');
  const [error, setError] = useState(null);

  const handleConnect = async () => {
    if (!accessToken.trim()) {
      setError('Access token is required');
      return;
    }
    setIsConnecting(true);
    setError(null);
    try {
      const response = await api.functions.invoke('wish-connect', { access_token: accessToken.trim() });
      if (!response?.success) throw new Error(response?.error || 'Connection failed');

      toast.success('Wish Marketplace connected!', { description: response.name });
      setIsOpen(false);
      setAccessToken('');
      onConnectionSuccess?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)} disabled={disabled} className="w-full bg-blue-500 hover:bg-blue-600 text-white">
        Connect Wish
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Connect Wish Marketplace</DialogTitle>
            <DialogDescription>Enter your Wish Merchant API access token.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="wish-token">Access Token</Label>
              <Input id="wish-token" type="password" value={accessToken} onChange={(e) => setAccessToken(e.target.value)} placeholder="Your Wish access token" disabled={isConnecting} />
            </div>
            <p className="text-xs text-slate-500">Find your access token in Wish Merchant Dashboard → Settings → API.</p>
            <Button variant="link" className="h-auto p-0 text-xs" onClick={() => window.open('https://merchant.wish.com/documentation/v3', '_blank')}>
              <ExternalLink className="w-3 h-3 mr-1" />Wish Merchant API Docs
            </Button>
            {error && (
              <div className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /><span>{error}</span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isConnecting}>Cancel</Button>
            <Button onClick={handleConnect} disabled={isConnecting || !accessToken}>
              {isConnecting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Connecting...</> : 'Connect'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
