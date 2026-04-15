import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Platform } from '@/lib/entities';
import { User } from '@/lib/entities';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Settings, Trash2, AlertCircle, RefreshCw, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { handleAuthError } from '@/utils/authHelpers';
import { useConfirmDialog, ConfirmDialog } from '@/hooks/useConfirmDialog';

export default function PlatformSettings() {
    const location = useLocation();
    const navigate = useNavigate();
    const [platform, setPlatform] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
    const [syncFrequency, setSyncFrequency] = useState('daily');
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [isTestingConnection, setIsTestingConnection] = useState(false);
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

    // Seed sync frequency from saved metadata
    useEffect(() => {
        if (platform?.metadata?.sync_frequency) {
            setSyncFrequency(platform.metadata.sync_frequency);
        }
    }, [platform]);

    // Save advanced settings
    const handleSaveSettings = useCallback(async () => {
        if (!platform) return;
        setIsSavingSettings(true);
        try {
            await Platform.update(platform.id, {
                metadata: { ...(platform.metadata || {}), sync_frequency: syncFrequency }
            });
            toast.success('Settings saved');
            loadData();
        } catch {
            toast.error('Failed to save settings');
        } finally {
            setIsSavingSettings(false);
        }
    }, [platform, syncFrequency, loadData]);

    // Test connection
    const handleTestConnection = useCallback(async () => {
        if (!platform) return;
        setIsTestingConnection(true);
        try {
            await Platform.get(platform.id);
            toast.success('Connection is active');
        } catch {
            toast.error('Connection test failed — check your credentials');
        } finally {
            setIsTestingConnection(false);
        }
    }, [platform]);

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
                            <Button
                                variant="outline"
                                onClick={() => setShowAdvancedSettings(prev => !prev)}
                            >
                                <Settings className="w-4 h-4 mr-2" />
                                Advanced Settings
                                {showAdvancedSettings
                                    ? <ChevronUp className="w-4 h-4 ml-2" />
                                    : <ChevronDown className="w-4 h-4 ml-2" />}
                            </Button>
                            <Button
                                variant="outline"
                                onClick={handleTestConnection}
                                disabled={isTestingConnection}
                            >
                                {isTestingConnection
                                    ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    : <RefreshCw className="w-4 h-4 mr-2" />}
                                Test Connection
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

                        {showAdvancedSettings && (
                            <div className="mt-4 p-4 border rounded-lg bg-slate-50 space-y-4">
                                <div>
                                    <Label>Sync Frequency</Label>
                                    <p className="text-xs text-slate-500 mb-2">How often Tandril pulls fresh data from this platform</p>
                                    <Select value={syncFrequency} onValueChange={setSyncFrequency}>
                                        <SelectTrigger className="w-48">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="manual">Manual only</SelectItem>
                                            <SelectItem value="hourly">Every hour</SelectItem>
                                            <SelectItem value="daily">Daily</SelectItem>
                                            <SelectItem value="weekly">Weekly</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button
                                    size="sm"
                                    onClick={handleSaveSettings}
                                    disabled={isSavingSettings}
                                >
                                    {isSavingSettings
                                        ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        : <CheckCircle2 className="w-4 h-4 mr-2" />}
                                    Save Settings
                                </Button>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <ConfirmDialog isOpen={isOpen} config={config} onCancel={cancel} />
        </div>
    );
}