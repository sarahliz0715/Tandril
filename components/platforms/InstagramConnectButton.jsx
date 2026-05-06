import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, Instagram } from 'lucide-react';
import { api } from '@/lib/apiClient';
import { toast } from 'sonner';

export default function InstagramConnectButton({ onConnectionSuccess, disabled = false }) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const response = await api.functions.invoke('oauth-init', { platform: 'instagram' });
      if (!response?.success) throw new Error(response?.error || 'Failed to initiate Instagram authorization');
      if (!response.auth_url) throw new Error('No authorization URL received');
      window.location.href = response.auth_url;
    } catch (err) {
      console.error('[InstagramConnectButton]', err);
      setError(err.message);
      setIsConnecting(false);
      toast.error('Connection Failed', { description: err.message });
    }
  };

  return (
    <div className="w-full space-y-2">
      <Button
        onClick={handleConnect}
        disabled={isConnecting || disabled}
        className="w-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 hover:from-purple-600 hover:via-pink-600 hover:to-orange-500 text-white border-0"
      >
        {isConnecting ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Connecting...</>
        ) : (
          <><Instagram className="w-4 h-4 mr-2" />Connect Instagram Shop</>
        )}
      </Button>
      {error && (
        <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
