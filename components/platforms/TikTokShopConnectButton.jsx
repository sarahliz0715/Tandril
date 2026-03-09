import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ExternalLink, AlertTriangle, CheckCircle } from 'lucide-react';
import { api } from '@/lib/apiClient';
import { toast } from 'sonner';

export default function TikTokShopConnectButton({ onConnectionSuccess, disabled = false }) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [showInfoDialog, setShowInfoDialog] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const response = await api.functions.invoke('oauth-init', { platform: 'tiktok_shop' });
      if (!response?.success) throw new Error(response?.error || 'Failed to initiate TikTok authorization');
      if (!response.auth_url) throw new Error('No authorization URL received');
      window.location.href = response.auth_url;
    } catch (error) {
      console.error('[TikTokShopConnectButton]', error);
      toast.error('Failed to connect TikTok Shop', { description: error.message });
      setIsConnecting(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setShowInfoDialog(true)}
        className="w-full bg-black hover:bg-gray-900 text-white"
        disabled={isConnecting || disabled}
      >
        {isConnecting ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Connecting...</>
        ) : (
          <>
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
            </svg>
            Connect TikTok Shop
          </>
        )}
      </Button>

      <Dialog open={showInfoDialog} onOpenChange={setShowInfoDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
              </svg>
              Connect Your TikTok Shop
            </DialogTitle>
            <DialogDescription>Integrate your TikTok Shop for AI-powered product management and order automation.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <Alert className="bg-amber-50 border-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-900 text-sm">
                <strong>Requirement:</strong> You must have an approved TikTok Shop seller account.{' '}
                <a href="https://seller-us.tiktok.com" target="_blank" rel="noopener noreferrer" className="underline font-semibold">Apply here</a> if you don't have one.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-2">
              {['Product Management', 'Order Processing', 'Inventory Sync', 'AI Optimization'].map((f) => (
                <div key={f} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg text-sm">
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span className="font-medium text-slate-800">{f}</span>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInfoDialog(false)}>Cancel</Button>
            <Button
              onClick={() => { setShowInfoDialog(false); handleConnect(); }}
              className="bg-black hover:bg-gray-900"
            >
              Connect Now <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
