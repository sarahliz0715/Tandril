import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { api } from '@/lib/apiClient';
import { toast } from 'sonner';

export default function MagentoConnectButton({ onConnectionSuccess, disabled = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [storeUrl, setStoreUrl] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [error, setError] = useState(null);

  const handleConnect = async () => {
    if (!storeUrl.trim() || !accessToken.trim()) {
      setError('Store URL and Access Token are required');
      return;
    }
    setIsConnecting(true);
    setError(null);
    try {
      const response = await api.functions.invoke('magento-connect', {
        store_url: storeUrl.trim(),
        access_token: accessToken.trim(),
      });
      if (!response?.success) throw new Error(response?.error || 'Connection failed');

      toast.success('Magento connected!', { description: response.name });
      setIsOpen(false);
      setStoreUrl('');
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
      <Button onClick={() => setIsOpen(true)} disabled={disabled} className="w-full bg-orange-600 hover:bg-orange-700 text-white">
        Connect Magento
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Connect Magento / Adobe Commerce</DialogTitle>
            <DialogDescription>Enter your store URL and an Integration Access Token from Magento Admin.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="magento-url">Store URL</Label>
              <Input id="magento-url" value={storeUrl} onChange={(e) => setStoreUrl(e.target.value)} placeholder="https://yourstore.com" disabled={isConnecting} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="magento-token">Integration Access Token</Label>
              <Input id="magento-token" type="password" value={accessToken} onChange={(e) => setAccessToken(e.target.value)} placeholder="xxxxxxxxxxxxxxxxxxxx" disabled={isConnecting} />
            </div>
            <p className="text-xs text-slate-500">Create a token in Magento Admin → System → Integrations → Add New Integration.</p>
            <Button variant="link" className="h-auto p-0 text-xs" onClick={() => window.open('https://developer.adobe.com/commerce/webapi/', '_blank')}>
              <ExternalLink className="w-3 h-3 mr-1" />Adobe Commerce API Docs
            </Button>
            {error && (
              <div className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /><span>{error}</span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isConnecting}>Cancel</Button>
            <Button onClick={handleConnect} disabled={isConnecting || !storeUrl || !accessToken}>
              {isConnecting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Connecting...</> : 'Connect'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
