import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ExternalLink, AlertTriangle, CheckCircle } from 'lucide-react';
import { initiateTikTokAuth } from '@/api/functions/initiateTikTokAuth';
import { toast } from 'sonner';

export default function TikTokShopConnectButton({ onConnect }) {
    const [isConnecting, setIsConnecting] = useState(false);
    const [showInfoDialog, setShowInfoDialog] = useState(false);

    const handleConnect = async () => {
        setIsConnecting(true);
        try {
            const response = await initiateTikTokAuth();
            
            if (response.data && response.data.auth_url) {
                // Redirect to TikTok OAuth
                window.location.href = response.data.auth_url;
            } else {
                throw new Error('Failed to get TikTok authorization URL');
            }
        } catch (error) {
            console.error('Error connecting TikTok Shop:', error);
            toast.error('Failed to connect TikTok Shop', {
                description: error.message || 'Please try again or contact support.'
            });
            setIsConnecting(false);
        }
    };

    return (
        <>
            <Button
                onClick={() => setShowInfoDialog(true)}
                className="bg-black hover:bg-gray-900 text-white"
                disabled={isConnecting}
            >
                {isConnecting ? (
                    <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Connecting...
                    </>
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
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                            </svg>
                            Connect Your TikTok Shop
                        </DialogTitle>
                        <DialogDescription>
                            Integrate your TikTok Shop to manage products, orders, and leverage AI automation
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <Alert className="bg-gradient-to-r from-pink-50 to-purple-50 border-pink-200">
                            <AlertTriangle className="h-4 w-4 text-pink-600" />
                            <AlertDescription className="text-pink-900">
                                <strong>Important:</strong> You must have an approved TikTok Shop seller account to connect.
                                If you don't have one yet, <a href="https://seller-us.tiktok.com" target="_blank" rel="noopener noreferrer" className="underline font-semibold">apply here</a>.
                            </AlertDescription>
                        </Alert>

                        <div className="space-y-3">
                            <h4 className="font-semibold text-slate-900">What you can do with TikTok Shop:</h4>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg">
                                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm font-medium text-slate-900">Product Management</p>
                                        <p className="text-xs text-slate-600">Sync & optimize listings</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg">
                                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm font-medium text-slate-900">Order Processing</p>
                                        <p className="text-xs text-slate-600">Automated fulfillment</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg">
                                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm font-medium text-slate-900">Inventory Sync</p>
                                        <p className="text-xs text-slate-600">Real-time stock updates</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg">
                                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm font-medium text-slate-900">AI Optimization</p>
                                        <p className="text-xs text-slate-600">Smart pricing & SEO</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h4 className="font-semibold text-slate-900">How it works:</h4>
                            <ol className="space-y-2 text-sm text-slate-700">
                                <li className="flex items-start gap-2">
                                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">1</span>
                                    <span>Click "Connect Now" to authenticate with TikTok</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">2</span>
                                    <span>Grant Tandril access to manage your shop (read/write products, orders, inventory)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">3</span>
                                    <span>We'll sync your products and you're ready to use AI commands!</span>
                                </li>
                            </ol>
                        </div>

                        <Alert className="bg-blue-50 border-blue-200">
                            <AlertDescription className="text-sm text-blue-900">
                                <strong>New to TikTok Shop?</strong> TikTok Shop is one of the fastest-growing e-commerce platforms, 
                                with massive organic reach potential. Perfect for products that appeal to Gen Z and Millennial audiences.
                            </AlertDescription>
                        </Alert>
                    </div>

                    <DialogFooter className="flex gap-2">
                        <Button variant="outline" onClick={() => setShowInfoDialog(false)}>
                            Cancel
                        </Button>
                        <Button 
                            onClick={() => {
                                setShowInfoDialog(false);
                                handleConnect();
                            }}
                            className="bg-black hover:bg-gray-900"
                        >
                            Connect Now
                            <ExternalLink className="w-4 h-4 ml-2" />
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}