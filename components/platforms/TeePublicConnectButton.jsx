import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Palette, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '@/lib/apiClient';
import { toast } from 'sonner';

export default function TeePublicConnectButton({ onConnectionSuccess }) {
    const [isConnecting, setIsConnecting] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [storeUsername, setStoreUsername] = useState('');
    const [error, setError] = useState(null);

    const handleConnect = async () => {
        if (!storeUsername.trim()) {
            setError('Please enter your TeePublic store username.');
            return;
        }
        setIsConnecting(true);
        setError(null);
        try {
            const response = await api.functions.invoke('teepublic-connect', { store_username: storeUsername.trim() });
            if (!response?.success) throw new Error(response?.error || 'Connection failed');

            toast.success('TeePublic connected successfully!');
            setIsOpen(false);
            setStoreUsername('');
            onConnectionSuccess?.();
        } catch (err) {
            setError(err.message);
        } finally {
            setIsConnecting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button className="w-full bg-gradient-to-r from-green-600 to-pink-600 hover:from-green-700 hover:to-pink-700 text-white">
                    <Palette className="w-4 h-4 mr-2" />
                    Connect TeePublic
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Palette className="w-5 h-5 text-green-600" />
                        Connect TeePublic Account
                    </DialogTitle>
                    <DialogDescription>
                        Enter your TeePublic store username to link your account.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                        <div>
                            <strong>No Official API:</strong> TeePublic doesn't provide a public API. Tandril links your store for reference tracking — automatic product sync is not available.
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="tp-store-username">TeePublic Store Username</Label>
                        <Input
                            id="tp-store-username"
                            placeholder="e.g., your-artist-shop"
                            value={storeUsername}
                            onChange={(e) => setStoreUsername(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                            disabled={isConnecting}
                        />
                        <p className="text-xs text-slate-500">
                            Found in your TeePublic URL: teepublic.com/user/<strong>username</strong>
                        </p>
                    </div>
                    {error && (
                        <div className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /><span>{error}</span>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsOpen(false)} disabled={isConnecting}>Cancel</Button>
                    <Button onClick={handleConnect} disabled={isConnecting || !storeUsername}>
                        {isConnecting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        {isConnecting ? 'Connecting...' : 'Connect'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
