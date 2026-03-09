import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle } from 'lucide-react';
import { api } from '@/lib/apiClient';
import { toast } from 'sonner';

/**
 * Generic OAuth connect button used for platforms that go through the
 * unified oauth-init / oauth-callback edge function pair.
 *
 * Props:
 *   platformType  - e.g. 'etsy', 'tiktok_shop', 'meta_ads', 'amazon', 'square', 'wix', 'squarespace'
 *   label         - button label, e.g. "Connect Etsy"
 *   className     - optional extra Tailwind classes for the button color
 *   disabled      - passed through from parent (e.g. limit reached)
 */
export default function GenericOAuthConnectButton({ platformType, label, className = '', disabled = false }) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const response = await api.functions.invoke('oauth-init', { platform: platformType });

      if (!response?.success) {
        throw new Error(response?.error || `Failed to initiate ${platformType} authorization`);
      }
      if (!response.auth_url) {
        throw new Error('No authorization URL received');
      }

      // Full-page redirect to the platform's OAuth consent screen
      window.location.href = response.auth_url;
    } catch (err) {
      console.error(`[GenericOAuthConnectButton:${platformType}]`, err);
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
        className={`w-full ${className}`}
      >
        {isConnecting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Connecting...
          </>
        ) : (
          label
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
