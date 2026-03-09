import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { api } from '@/lib/apiClient';
import { toast } from 'sonner';

export default function AmazonConnectButton({ onConnectionSuccess, disabled = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [region, setRegion] = useState('NA');
  const [error, setError] = useState(null);

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const response = await api.functions.invoke('oauth-init', { platform: 'amazon', region });
      if (!response?.success) throw new Error(response?.error || 'Failed to initiate Amazon authorization');
      if (!response.auth_url) throw new Error('No authorization URL received');
      setIsOpen(false);
      window.location.href = response.auth_url;
    } catch (err) {
      console.error('[AmazonConnectButton]', err);
      setError(err.message);
      setIsConnecting(false);
      toast.error('Connection Failed', { description: err.message });
    }
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        disabled={disabled}
        className="w-full bg-amber-500 hover:bg-amber-600 text-white"
      >
        Connect Amazon
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Connect Amazon Seller Central</DialogTitle>
            <DialogDescription>
              Select your marketplace region and authorize Tandril to access your Amazon Seller account via SP-API.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="amazon-region">Marketplace Region</Label>
              <Select value={region} onValueChange={setRegion}>
                <SelectTrigger id="amazon-region">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NA">North America (US, CA, MX, BR)</SelectItem>
                  <SelectItem value="EU">Europe (UK, FR, DE, IT, ES)</SelectItem>
                  <SelectItem value="FE">Far East (JP, AU, SG)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900">
              You'll be redirected to Amazon Seller Central to authorize access. Make sure you're logged in to your Seller account.
            </div>

            <Button variant="link" className="h-auto p-0 text-xs" onClick={() => window.open('https://developer.amazonservices.com/', '_blank')}>
              <ExternalLink className="w-3 h-3 mr-1" />Amazon SP-API Developer Portal
            </Button>

            {error && (
              <div className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /><span>{error}</span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isConnecting}>Cancel</Button>
            <Button onClick={handleConnect} disabled={isConnecting} className="bg-amber-500 hover:bg-amber-600">
              {isConnecting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Redirecting...</> : 'Continue to Amazon'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
