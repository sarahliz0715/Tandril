import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Facebook, Loader2, AlertCircle } from 'lucide-react';
import { api } from '@/lib/apiClient';
import { toast } from 'sonner';

export default function FacebookConnectButton({ onConnectionSuccess, disabled = false }) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const response = await api.functions.invoke('oauth-init', { platform: 'meta_ads' });
      if (!response?.success) throw new Error(response?.error || 'Failed to initiate Facebook authorization');
      if (!response.auth_url) throw new Error('No authorization URL received');
      window.location.href = response.auth_url;
    } catch (err) {
      console.error('[FacebookConnectButton]', err);
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
        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
      >
        {isConnecting ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Connecting...</>
        ) : (
          <><Facebook className="w-4 h-4 mr-2" />Connect Facebook / Meta</>
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
