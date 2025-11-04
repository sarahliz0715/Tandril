import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Platform } from '@/api/entities';
import { User } from '@/api/entities';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Settings, Trash2, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { handleAuthError } from '../components/utils/authHelpers';
import { useConfirmDialog, ConfirmDialog } from '../components/hooks/useConfirmDialog';

export default function PlatformSettings() {
    const location = useLocation();
    const navigate = useNavigate();
    const [platform, setPlatform] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const { isOpen, config, confirm, cancel } = useConfirmDialog();

    // Memoize beta access check
    const hasBetaAccess = useMemo(() => {
        return currentUser && currentUser.user_mode === 'beta';
    }, [currentUser]);

    // Load platform and user data
    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const user = await User.me();
            setCurrentUser(user);

            const params = new URLSearchParams(location.search);
            const id = params.get('id');

            if (id) {
                const platformData = await Platform.get(id);
                if (platformData && typeof platformData === 'object' && platformData.id) {
                    setPlatform(platformData);
                } else {
                    setPlatform(null);
                    toast.error("Platform not found");
                }
            } else {
                setPlatform(null);
            }
        } catch (error) {
            console.error("Failed to load platform settings:", error);
            
            if (handleAuthError(error, navigate, { 
                showToast: true,
                redirectTo: 'Platforms' 
            })) {
                return;
            }

            toast.error("Failed to load platform settings", {
                description: "Please try again."
            });
            setPlatform(null);
        } finally {
            setIsLoading(false);
        }
    }, [location.search, navigate]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Handle platform disconnection with confirmation
    const handleDisconnect = useCallback(async () => {
        if (!platform) return;

        await confirm({
            title: 'Disconnect Platform?',
            description: `Are you sure you want to disconnect "${platform.name}"? This will stop all automations and data syncing for this platform. This action cannot be undone.`,
            confirmText: 'Disconnect',
            variant: 'destructive',
            onConfirm: async () => {
                setIsDeleting(true);
                try {
                    await Platform.delete(platform.id);
                    toast.success(`Successfully disconnected "${platform.name}"`);
                    navigate(createPageUrl('Platforms'));
                } catch (error) {
                    console.error("Failed to disconnect platform:", error);
                    
                    if (handleAuthError(error, navigate)) {
                        return;
                    }

                    toast.error("Failed to disconnect platform", {
                        description: "Please try again."
                    });
                } finally {
                    setIsDeleting(false);
                }
            }
        });
    }, [platform, confirm, navigate]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    <p className="text-slate-600">Loading platform settings...</p>
                </div>
            </div>
        );
    }

    if (!platform) {
        return (
            <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                <p className="text-lg text-slate-600 mb-4">Platform not found</p>
                <Link to={createPageUrl('Platforms')}>
                    <Button variant="outline">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Platforms
                    </Button>
                </Link>
            </div>
        );
    }

    const platformIcon = platform.platform_type === 'shopify' ? '🛍️' : '📦';

    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-6">
            <div className="mb-6">
                <Link to={createPageUrl('Platforms')}>
                    <Button variant="outline" size="sm">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to All Platforms
                    </Button>
                </Link>
            </div>
            
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <span className="text-4xl">{platformIcon}</span>
                        <div>
                            <CardTitle className="text-3xl">{platform.name}</CardTitle>
                            <CardDescription className="text-base">
                                Manage settings and view details for your {platform.name} connection.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="border-t pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h3 className="font-semibold text-slate-800 mb-2">Connection Details</h3>
                            <div className="space-y-2 text-sm p-4 bg-slate-50 rounded-lg border">
                                <div className="flex justify-between">
                                    <span className="text-slate-600">Status:</span>
                                    <Badge variant={platform.status === 'connected' ? 'default' : 'destructive'}>
                                        {platform.status}
                                    </Badge>
                                </div>
                                {platform.api_credentials?.store_url && (
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">Store URL:</span>
                                        <span className="font-mono text-slate-800">{platform.api_credentials.store_url}</span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span className="text-slate-600">Last Sync:</span>
                                    <span className="font-medium">
                                        {platform.last_sync ? format(new Date(platform.last_sync), 'MMM d, yyyy h:mm a') : 'N/A'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-800 mb-2">Store Info</h3>
                            <div className="space-y-2 text-sm p-4 bg-slate-50 rounded-lg border">
                                {platform.store_info?.store_name && (
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">Store Name:</span>
                                        <span className="font-medium text-slate-800">{platform.store_info.store_name}</span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span className="text-slate-600">Products:</span>
                                    <span className="font-medium">{platform.store_info?.total_products || 0}</span>
                                </div>
                                {platform.store_info?.currency && (
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">Currency:</span>
                                        <span className="font-medium">{platform.store_info.currency}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Policy Restriction Warning */}
                    {platform.policy_restriction?.is_restricted && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                                <div>
                                    <h4 className="font-semibold text-red-900 mb-1">Platform Policy Restriction</h4>
                                    <p className="text-sm text-red-700">{platform.policy_restriction.reason}</p>
                                    {platform.policy_restriction.policy_url && (
                                        <a 
                                            href={platform.policy_restriction.policy_url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-sm text-red-800 underline mt-2 inline-block"
                                        >
                                            View Platform Policy
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="border-t pt-6">
                        <h3 className="font-semibold text-slate-800 mb-4">Actions</h3>
                        <div className="flex gap-4">
                            <Button variant="outline" disabled>
                                <Settings className="w-4 h-4 mr-2" />
                                Advanced Settings (Coming Soon)
                            </Button>
                            <Button 
                                variant="destructive"
                                onClick={handleDisconnect}
                                disabled={isDeleting}
                            >
                                {isDeleting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Disconnecting...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Disconnect Store
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <ConfirmDialog isOpen={isOpen} config={config} onCancel={cancel} />
        </div>
    );
}