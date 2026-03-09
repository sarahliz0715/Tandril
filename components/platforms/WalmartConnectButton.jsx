import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { api } from '@/lib/apiClient';
import { toast } from 'sonner';

export default function WalmartConnectButton({ onConnectionSuccess, disabled = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [error, setError] = useState(null);

  const handleConnect = async () => {
    if (!clientId.trim() || !clientSecret.trim()) {
      setError('Client ID and Client Secret are required');
      return;
    }
    setIsConnecting(true);
    setError(null);
    try {
      const response = await api.functions.invoke('walmart-connect', {
        client_id: clientId.trim(),
        client_secret: clientSecret.trim(),
      });
      if (!response?.success) throw new Error(response?.error || 'Connection failed');

      toast.success('Walmart Marketplace connected!', { description: response.name });
      setIsOpen(false);
      setClientId('');
      setClientSecret('');
      onConnectionSuccess?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        disabled={disabled}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
      >
        Connect Walmart
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Connect Walmart Marketplace</DialogTitle>
            <DialogDescription>
              Enter your Walmart Seller Center API credentials to connect your marketplace account.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="walmart-client-id">Client ID</Label>
              <Input
                id="walmart-client-id"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="Your Walmart API Client ID"
                disabled={isConnecting}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="walmart-client-secret">Client Secret</Label>
              <Input
                id="walmart-client-secret"
                type="password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder="Your Walmart API Client Secret"
                disabled={isConnecting}
              />
            </div>
            <p className="text-xs text-slate-500">
              Find these in Seller Center → Settings → Consumer IDs & Private Keys.
            </p>
            <Button variant="link" className="h-auto p-0 text-xs" onClick={() => window.open('https://developer.walmart.com/', '_blank')}>
              <ExternalLink className="w-3 h-3 mr-1" />
              Walmart Developer Portal
            </Button>
            {error && (
              <div className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isConnecting}>Cancel</Button>
            <Button onClick={handleConnect} disabled={isConnecting || !clientId || !clientSecret}>
              {isConnecting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Connecting...</> : 'Connect'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
