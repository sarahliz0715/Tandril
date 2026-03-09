import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { api } from '@/lib/apiClient';
import { toast } from 'sonner';

export default function EcwidConnectButton({ onConnectionSuccess, disabled = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [storeId, setStoreId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [error, setError] = useState(null);

  const handleConnect = async () => {
    if (!storeId.trim() || !accessToken.trim()) {
      setError('Store ID and Access Token are required');
      return;
    }
    setIsConnecting(true);
    setError(null);
    try {
      const response = await api.functions.invoke('ecwid-connect', {
        store_id: storeId.trim(),
        access_token: accessToken.trim(),
      });
      if (!response?.success) throw new Error(response?.error || 'Connection failed');

      toast.success('Ecwid connected!', { description: response.name });
      setIsOpen(false);
      setStoreId('');
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
      <Button onClick={() => setIsOpen(true)} disabled={disabled} className="w-full">
        Connect Ecwid
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Connect Ecwid by Lightspeed</DialogTitle>
            <DialogDescription>Enter your Ecwid Store ID and a secret access token.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="ecwid-store-id">Store ID</Label>
              <Input id="ecwid-store-id" value={storeId} onChange={(e) => setStoreId(e.target.value)} placeholder="12345678" disabled={isConnecting} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ecwid-token">Secret Access Token</Label>
              <Input id="ecwid-token" type="password" value={accessToken} onChange={(e) => setAccessToken(e.target.value)} placeholder="secret_xxxx" disabled={isConnecting} />
            </div>
            <p className="text-xs text-slate-500">Find these in your Ecwid Control Panel → Apps → My Apps.</p>
            <Button variant="link" className="h-auto p-0 text-xs" onClick={() => window.open('https://developers.ecwid.com/', '_blank')}>
              <ExternalLink className="w-3 h-3 mr-1" />Ecwid Developer Docs
            </Button>
            {error && (
              <div className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /><span>{error}</span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isConnecting}>Cancel</Button>
            <Button onClick={handleConnect} disabled={isConnecting || !storeId || !accessToken}>
              {isConnecting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Connecting...</> : 'Connect'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
