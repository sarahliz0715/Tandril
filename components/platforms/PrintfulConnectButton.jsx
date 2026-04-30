import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Loader2, CheckCircle, ExternalLink, Shirt, AlertCircle } from 'lucide-react';
import { api } from '@/lib/apiClient';
import { toast } from 'sonner';

export default function PrintfulConnectButton({ isConnected, onConnectionSuccess }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const [error, setError] = useState(null);

    const handleConnect = async () => {
        if (!apiKey.trim()) {
            setError('API key is required');
            return;
        }
        setIsConnecting(true);
        setError(null);
        try {
            const response = await api.functions.invoke('printful-connect', { api_key: apiKey.trim() });
            if (!response?.success) throw new Error(response?.error || 'Connection failed');

            toast.success('Printful Connected!', { description: response.message });
            setIsOpen(false);
            setApiKey('');
            onConnectionSuccess?.();
        } catch (err) {
            setError(err.message);
        } finally {
            setIsConnecting(false);
        }
    };

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            const response = await api.functions.invoke('printful-sync', {});
            if (!response?.success) throw new Error(response?.error || 'Sync failed');
            toast.success('Products Synced!', { description: response.message });
        } catch (err) {
            toast.error('Sync Failed', { description: err.message });
        } finally {
            setIsSyncing(false);
        }
    };

    if (isConnected) {
        return (
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <Badge className="bg-green-100 text-green-800">Connected</Badge>
                </div>
                <Button onClick={handleSync} disabled={isSyncing} variant="outline" size="sm" className="w-full">
                    {isSyncing ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Syncing Products...</>
                    ) : (
                        <><Shirt className="w-4 h-4 mr-2" />Sync Products</>
                    )}
                </Button>
            </div>
        );
    }

    return (
        <>
            <Button onClick={() => setIsOpen(true)} className="w-full bg-orange-600 hover:bg-orange-700" size="sm">
                <Shirt className="w-4 h-4 mr-2" />
                Connect Printful
            </Button>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Shirt className="w-5 h-5 text-orange-600" />
                            Connect Printful
                        </DialogTitle>
                        <DialogDescription>
                            Enter your Printful API key to sync your print-on-demand products.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-1">
                            <Label htmlFor="printful-key">Printful API Key</Label>
                            <Input
                                id="printful-key"
                                type="password"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="••••••••••••••••••••"
                                disabled={isConnecting}
                                onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                            />
                        </div>
                        <p className="text-xs text-slate-500">
                            Find your API key in Printful Dashboard → Settings → Stores → API.
                        </p>
                        <Button
                            variant="link"
                            className="h-auto p-0 text-xs"
                            onClick={() => window.open('https://www.printful.com/dashboard/store?tab=api', '_blank')}
                        >
                            <ExternalLink className="w-3 h-3 mr-1" />Open Printful API Settings
                        </Button>
                        {error && (
                            <div className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /><span>{error}</span>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isConnecting}>Cancel</Button>
                        <Button onClick={handleConnect} disabled={isConnecting || !apiKey}>
                            {isConnecting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Connecting...</> : 'Connect'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
