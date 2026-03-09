import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { api } from '@/lib/apiClient';
import { toast } from 'sonner';

export default function PrestaShopConnectButton({ onConnectionSuccess, disabled = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [storeUrl, setStoreUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState(null);

  const handleConnect = async () => {
    if (!storeUrl.trim() || !apiKey.trim()) {
      setError('Store URL and API Key are required');
      return;
    }
    setIsConnecting(true);
    setError(null);
    try {
      const response = await api.functions.invoke('prestashop-connect', {
        store_url: storeUrl.trim(),
        api_key: apiKey.trim(),
      });
      if (!response?.success) throw new Error(response?.error || 'Connection failed');

      toast.success('PrestaShop connected!', { description: response.name });
      setIsOpen(false);
      setStoreUrl('');
      setApiKey('');
      onConnectionSuccess?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)} disabled={disabled} className="w-full bg-[#DF0067] hover:bg-[#c0005a] text-white">
        Connect PrestaShop
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Connect PrestaShop</DialogTitle>
            <DialogDescription>Enter your store URL and API key to connect.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="presta-url">Store URL</Label>
              <Input id="presta-url" value={storeUrl} onChange={(e) => setStoreUrl(e.target.value)} placeholder="https://yourstore.com" disabled={isConnecting} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="presta-key">API Key</Label>
              <Input id="presta-key" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" disabled={isConnecting} />
            </div>
            <p className="text-xs text-slate-500">Generate an API key in Back Office → Advanced Parameters → Webservice → Add new webservice key.</p>
            <Button variant="link" className="h-auto p-0 text-xs" onClick={() => window.open('https://devdocs.prestashop-project.org/8/webservice/', '_blank')}>
              <ExternalLink className="w-3 h-3 mr-1" />PrestaShop Webservice Docs
            </Button>
            {error && (
              <div className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /><span>{error}</span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isConnecting}>Cancel</Button>
            <Button onClick={handleConnect} disabled={isConnecting || !storeUrl || !apiKey}>
              {isConnecting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Connecting...</> : 'Connect'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
