import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Palette, ExternalLink, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { connectTeePublic } from '@/lib/functions';

export default function TeePublicConnectButton({ onSuccess }) {
    const [isConnecting, setIsConnecting] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [storeUsername, setStoreUsername] = useState('');

    const handleConnect = async () => {
        if (!storeUsername.trim()) {
            toast.error('Please enter your TeePublic store username.');
            return;
        }

        setIsConnecting(true);
        try {
            const { data } = await connectTeePublic({ store_username: storeUsername });

            if (!data.success) {
                throw new Error(data.error || 'Failed to connect. Please check your credentials in settings.');
            }
            
            toast.success('TeePublic connected successfully!');
            setIsOpen(false);
            setStoreUsername('');
            if (onSuccess) onSuccess();

        } catch (error) {
            console.error('TeePublic connection error:', error);
            toast.error('Connection Failed', { description: error.message });
        } finally {
            setIsConnecting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white">
                    <Palette className="w-4 h-4 mr-2" />
                    Connect TeePublic
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Palette className="w-5 h-5 text-purple-600" />
                        Connect TeePublic Account
                    </DialogTitle>
                    <DialogDescription>
                        Provide your store username to connect via secure automation. Your email and password are used from the secure secrets you provided.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                        <div>
                            <strong>No Official API:</strong> TeePublic doesn't provide a public API. Tandril connects using secure web automation, acting on your behalf.
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="store-username">TeePublic Store Username</Label>
                        <Input 
                            id="store-username" 
                            placeholder="e.g., your-artist-shop"
                            value={storeUsername}
                            onChange={(e) => setStoreUsername(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsOpen(false)} disabled={isConnecting}>
                        Cancel
                    </Button>
                    <Button onClick={handleConnect} disabled={isConnecting}>
                        {isConnecting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        {isConnecting ? 'Connecting...' : 'Connect'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}