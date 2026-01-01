
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Platform } from '@/api/entities';
import { PlatformType } from '@/api/entities';
import { User } from '@/api/entities';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
    Briefcase, 
    Plus, 
    Loader2, 
    CheckCircle, 
    AlertTriangle,
    Zap,
    Info,
    Sparkles,
    Store // Added Store icon
} from 'lucide-react';
import { toast } from 'sonner';
import PlatformCard from '../components/platforms/PlatformCard';
// These connect buttons are now expected to be imported and used within PlatformCard
// import ShopifyConnectButton from '../components/platforms/ShopifyConnectButton';
// import EtsyConnectButton from '../components/platforms/EtsyConnectButton';
// import PrintfulConnectButton from '../components/platforms/PrintfulConnectButton';
// import TeePublicConnectButton from '../components/platforms/TeePublicConnectButton';
// import RedbubbleConnectButton from '../components/platforms/RedbubbleConnectButton';
// import FacebookConnectButton from '../components/platforms/FacebookConnectButton';
import RequestPlatformModal from '../components/platforms/RequestPlatformModal';
import EtsyConnectionWarning from '../components/platforms/EtsyConnectionWarning';
import DemoModeToggle from '../components/platforms/DemoModeToggle';
import BetaGate from '../components/common/BetaGate';
import { handleAuthError } from '@/utils/authHelpers';
import { useConfirmDialog, ConfirmDialog } from '@/hooks/useConfirmDialog';
import { NoDataEmptyState } from '../components/common/EmptyState';
import EbayConfigChecker from '../components/platforms/EbayConfigChecker';

export default function Platforms() {
    const [platforms, setPlatforms] = useState([]); // This state holds all user's platform instances (connected, pending, disconnected)
    const [platformTypes, setPlatformTypes] = useState([]); // This state holds all available platform types
    const [isLoading, setIsLoading] = useState(true);
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const navigate = useNavigate();
    const { isOpen, config, confirm, cancel } = useConfirmDialog();

    // Memoize beta access check
    const hasBetaAccess = useMemo(() => {
        return currentUser && currentUser.user_mode === 'beta';
    }, [currentUser]);

    // Check if user is at connection limit
    const isAtLimit = useMemo(() => {
        if (!currentUser) return false;
        const limit = currentUser.platforms_limit || 2;
        const connectedCount = platforms.filter(p => p.status === 'connected').length;
        return connectedCount >= limit;
    }, [currentUser, platforms]);

    // Group platforms by connection status
    const connectedPlatforms = useMemo(() => 
        platforms.filter(p => p.status === 'connected'),
        [platforms]
    );

    const pendingPlatforms = useMemo(() => 
        platforms.filter(p => p.status === 'pending' || p.status === 'processing'),
        [platforms]
    );

    const disconnectedPlatforms = useMemo(() => 
        platforms.filter(p => p.status === 'disconnected' || p.status === 'error'),
        [platforms]
    );

    // Load platforms and platform types
    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            // 1. Fetch current user
            const user = await User.me();
            setCurrentUser(user);
            const isBeta = user && user.user_mode === 'beta';

            // 2. Load platform types first
            const platformTypesData = await PlatformType.list().catch(err => {
                console.error('Error fetching platform types:', err);
                return [];
            });

            // Filter out invalid platform types
            const validPlatformTypes = platformTypesData.filter(pt => 
                pt && typeof pt === 'object' && pt.type_id
            );

            // Sort platform types - Shopify first, then alphabetically
            const sortedPlatformTypes = validPlatformTypes.sort((a, b) => {
                if (a.type_id === 'shopify') return -1;
                if (b.type_id === 'shopify') return 1;
                return (a.name || '').localeCompare(b.name || '');
            });
            setPlatformTypes(sortedPlatformTypes);

            // 3. Wait a bit to avoid rate limits between API calls
            await new Promise(resolve => setTimeout(resolve, 200));

            // 4. Then load user's platforms (instances)
            let userPlatformInstancesData = await Platform.list('-created_at').catch(err => {
                console.error('Error fetching user platform instances:', err);
                return [];
            });
            
            // Filter out invalid user platform instances
            let validUserPlatformInstances = userPlatformInstancesData.filter(p => 
                p && typeof p === 'object' && p.id
            );

            // FOR BETA USERS: Only show Shopify connections, filter out everything else
            if (isBeta) {
                // Filter platform instances for display to only include Shopify
                validUserPlatformInstances = validUserPlatformInstances.filter(p => 
                    p.platform_type === 'shopify'
                );
                
                // Identify any non-Shopify platforms that might exist for beta users
                // and delete them in the background. This ensures a clean state.
                const nonShopifyPlatformsToClean = userPlatformInstancesData.filter(p => 
                    p && p.id && p.platform_type !== 'shopify'
                );
                
                if (nonShopifyPlatformsToClean.length > 0) {
                    console.log(`Cleaning up ${nonShopifyPlatformsToClean.length} non-Shopify platforms for beta user`);
                    // Delete them in the background, don't wait for these operations to complete
                    // as they are not critical for immediate UI rendering.
                    Promise.all(
                        nonShopifyPlatformsToClean.map(p => 
                            Platform.delete(p.id).catch(err => 
                                console.error(`Failed to delete platform ${p.id}:`, err)
                            )
                        )
                    );
                }
            }

            setPlatforms(validUserPlatformInstances); // Set the main platforms state

        } catch (error) {
            console.error('Failed to load data:', error);
            
            if (handleAuthError(error, navigate, { showToast: true })) {
                return;
            }

            // Handle rate limit errors specifically as requested in the outline
            if (error.response?.status === 429 || error.status === 429) {
                toast.error("Too Many Requests", {
                    description: "Our servers are busy. Please wait a moment and try again."
                });
                return; // Prevent the generic error toast from showing
            }

            toast.error("Failed to load platforms", {
                description: "Please try refreshing the page."
            });
            
            setPlatforms([]); // Clear user platform instances on error
            setPlatformTypes([]); // Clear platform types on error
        } finally {
            setIsLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Handle platform disconnection with confirmation
    const handleDisconnect = useCallback(async (platform) => {
        await confirm({
            title: 'Disconnect Platform?',
            description: `Are you sure you want to disconnect ${platform.name}? This will stop all automations and data syncing for this platform.`,
            confirmText: 'Disconnect',
            variant: 'destructive',
            onConfirm: async () => {
                try {
                    await Platform.delete(platform.id);
                    toast.success(`${platform.name} disconnected successfully`);
                    loadData(); // Re-fetch data after disconnection
                } catch (error) {
                    console.error('Error disconnecting platform:', error);
                    
                    if (handleAuthError(error, navigate)) {
                        return;
                    }

                    toast.error("Failed to disconnect platform", {
                        description: "Please try again."
                    });
                }
            }
        });
    }, [confirm, loadData, navigate]);

    // Handle force cleanup with confirmation
    const handleForceCleanup = useCallback(async (platformType) => {
        await confirm({
            title: 'Clean Up Failed Connection?',
            description: `This will remove all failed connection attempts for ${platformType.name}. You can then try connecting again.`,
            confirmText: 'Clean Up',
            variant: 'destructive',
            onConfirm: async () => {
                try {
                    const failedPlatforms = platforms.filter(
                        p => p.platform_type === platformType.type_id && 
                            (p.status === 'error' || p.status === 'disconnected')
                    );

                    for (const platform of failedPlatforms) {
                        await Platform.delete(platform.id);
                    }

                    toast.success('Failed connections cleaned up successfully');
                    loadData(); // Re-fetch data after cleanup
                } catch (error) {
                    console.error('Error cleaning up platforms:', error);
                    
                    if (handleAuthError(error, navigate)) {
                        return;
                    }

                    toast.error("Failed to clean up connections", {
                        description: "Please try again."
                    });
                }
            }
        });
    }, [confirm, platforms, loadData, navigate]);

    // Group platform types by category for display
    const groupedPlatforms = useMemo(() => {
        const groups = {};
        platformTypes.forEach(pt => {
            const category = pt.category || 'other'; // Default category
            if (!groups[category]) {
                groups[category] = [];
            }
            groups[category].push(pt);
        });
        return groups;
    }, [platformTypes]);


    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
                    <p className="text-lg font-medium text-slate-600">Loading platforms...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 flex items-center gap-3 mb-2">
                        <Briefcase className="w-8 h-8 sm:w-10 sm:h-10 text-indigo-600" />
                        {hasBetaAccess ? 'My Shopify Store' : 'Platforms'}
                    </h1>
                    <p className="text-lg text-slate-600">
                        {hasBetaAccess 
                            ? "Connect your Shopify store to get started. More platforms coming in the full version!"
                            : "Connect and manage your e-commerce platforms for AI-powered automation."
                        }
                    </p>
                </div>

                {/* Add this right after the header/description */}
                <div className="mb-6">
                    <EbayConfigChecker />
                </div>

                {/* Demo Mode Toggle */}
                {currentUser && !hasBetaAccess && (
                    <div className="mb-6">
                        <DemoModeToggle user={currentUser} onToggle={loadData} />
                    </div>
                )}

                {/* Beta Banner */}
                {hasBetaAccess && (
                    <Alert className="mb-6 border-indigo-200 bg-indigo-50">
                        <Sparkles className="h-4 w-4 text-indigo-600" />
                        <AlertTitle className="text-indigo-900">Beta Version - Shopify Focus</AlertTitle>
                        <AlertDescription className="text-indigo-700">
                            We're starting with Shopify to perfect the experience. All platforms shown below will be available in the full launch!
                        </AlertDescription>
                    </Alert>
                )}

                {/* Etsy Restriction Warning */}
                <div className="mb-6">
                    <EtsyConnectionWarning />
                </div>

                {/* Connection Limit Warning */}
                {isAtLimit && currentUser?.subscription_tier === 'free' && (
                    <Alert className="mb-6 border-amber-200 bg-amber-50">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <AlertTitle className="text-amber-900">Platform Limit Reached</AlertTitle>
                        <AlertDescription className="text-amber-700">
                            You've reached the {currentUser.platforms_limit} platform limit on the free tier. 
                            <Button 
                                variant="link" 
                                className="p-0 ml-1 h-auto text-amber-800 underline"
                                onClick={() => navigate(createPageUrl('Pricing'))}
                            >
                                Upgrade to connect more platforms
                            </Button>
                        </AlertDescription>
                    </Alert>
                )}
                
                {/* Platform Stats (Placeholder from outline) */}
                {connectedPlatforms.length > 0 && !hasBetaAccess && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        {/* Placeholder for future stats cards */}
                        {/* <Card>...</Card> */}
                    </div>
                )}

                {/* Connected Platforms */}
                {connectedPlatforms.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <CheckCircle className="w-6 h-6 text-green-600" />
                            Connected Platforms
                            <Badge className="ml-2 bg-green-100 text-green-800">
                                {connectedPlatforms.length}
                            </Badge>
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {connectedPlatforms.map(platform => {
                                const platformType = platformTypes.find(pt => pt.type_id === platform.platform_type);
                                if (!platformType) return null; // Should not happen with valid data
                                
                                return (
                                    <PlatformCard
                                        key={platform.id}
                                        platformType={platformType}
                                        connectedPlatform={platform}
                                        onDisconnect={() => handleDisconnect(platform)}
                                        onForceCleanup={() => handleForceCleanup(platformType)}
                                        onConnectionSuccess={loadData}
                                        isBeta={hasBetaAccess}
                                        isAtLimit={isAtLimit}
                                        currentUser={currentUser}
                                    />
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Pending Platforms */}
                {pendingPlatforms.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                            Connecting...
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {pendingPlatforms.map(platform => {
                                const platformType = platformTypes.find(pt => pt.type_id === platform.platform_type);
                                if (!platformType) return null; 

                                return (
                                    <PlatformCard
                                        key={platform.id}
                                        platformType={platformType}
                                        connectedPlatform={platform}
                                        onDisconnect={() => handleDisconnect(platform)}
                                        onForceCleanup={() => handleForceCleanup(platformType)}
                                        onConnectionSuccess={loadData}
                                        isBeta={hasBetaAccess}
                                        isAtLimit={isAtLimit}
                                        currentUser={currentUser}
                                    />
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Disconnected/Error Platforms */}
                {disconnectedPlatforms.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <AlertTriangle className="w-6 h-6 text-red-600" />
                            Needs Attention
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {disconnectedPlatforms.map(platform => {
                                const platformType = platformTypes.find(pt => pt.type_id === platform.platform_type);
                                if (!platformType) return null;

                                return (
                                    <PlatformCard
                                        key={platform.id}
                                        platformType={platformType}
                                        connectedPlatform={platform}
                                        onDisconnect={() => handleDisconnect(platform)}
                                        onForceCleanup={() => handleForceCleanup(platformType)}
                                        onConnectionSuccess={loadData}
                                        isBeta={hasBetaAccess}
                                        isAtLimit={isAtLimit}
                                        currentUser={currentUser}
                                    />
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Available Platforms (grouped by category) */}
                <BetaGate
                    requiresBeta={false} // This BetaGate prevents full access to platforms section unless beta
                    user={currentUser}
                    featureName="Additional platform connections"
                >
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <Plus className="w-6 h-6 text-indigo-600" />
                            {hasBetaAccess ? 'Available & Coming Soon' : 'Connect New Platform'}
                        </h2>
                        
                        {Object.entries(groupedPlatforms).map(([category, types]) => {
                            const categoryNames = {
                                e_commerce_platform: 'E-Commerce Platforms',
                                marketplace: 'Marketplaces',
                                print_on_demand: 'Print on Demand',
                                advertising: 'Advertising',
                                other: 'Other Platforms'
                            };

                            // Filter out platform types that are already connected, pending, or disconnected
                            const connectableTypes = types.filter(platformType => 
                                !platforms.some(p => p.platform_type === platformType.type_id)
                            );

                            if (connectableTypes.length === 0) return null; // Don't show category if all types are already active

                            return (
                                <div key={category} className="mb-8">
                                    <h3 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
                                        <Store className="w-5 h-5 text-slate-500" />
                                        {categoryNames[category] || category}
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {connectableTypes.map(platformType => {
                                            // In beta mode, only Shopify is fully functional for connection
                                            const isComingSoon = hasBetaAccess && platformType.type_id !== 'shopify';

                                            return (
                                                <PlatformCard
                                                    key={platformType.type_id}
                                                    platformType={platformType}
                                                    connectedPlatform={null} // Null indicates it's an available platform for connection
                                                    onConnectionSuccess={loadData}
                                                    isBeta={hasBetaAccess}
                                                    isComingSoon={isComingSoon}
                                                    isAtLimit={isAtLimit}
                                                    currentUser={currentUser}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </BetaGate>

                {/* Request Platform */}
                {!hasBetaAccess && (
                    <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
                        <CardContent className="p-6">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-indigo-100 rounded-lg">
                                    <Zap className="w-6 h-6 text-indigo-600" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-slate-900 mb-2">
                                        Don't see your platform?
                                    </h3>
                                    <p className="text-slate-600 mb-4">
                                        Request a new platform integration and we'll prioritize building it based on demand.
                                    </p>
                                    <Button onClick={() => setShowRequestModal(true)}>
                                        <Plus className="w-4 h-4 mr-2" />
                                        Request Platform
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Empty State: Only show if no platforms are connected and no types are available to show */}
                {platforms.length === 0 && platformTypes.length === 0 && (
                    <NoDataEmptyState
                        entityName="Platforms"
                        onCreate={() => setShowRequestModal(true)}
                    />
                )}
            </div>

            {/* Request Platform Modal */}
            {showRequestModal && (
                <RequestPlatformModal
                    open={showRequestModal}
                    onOpenChange={setShowRequestModal}
                />
            )}

            <ConfirmDialog isOpen={isOpen} config={config} onCancel={cancel} />
        </div>
    );
}
