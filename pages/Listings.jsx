import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { InventoryItem } from '@/api/entities';
import { Platform } from '@/api/entities';
import { User } from '@/api/entities';
import { api } from '@/api/apiClient';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
    Package, 
    Plus, 
    Search, 
    Loader2, 
    Sparkles,
    Upload,
    CheckCircle,
    AlertTriangle,
    Filter
} from 'lucide-react';
import { toast } from 'sonner';
import AIListingGenerator from '../components/listings/AIListingGenerator';
import ListingStatusTable from '../components/listings/ListingStatusTable';
import BulkListingActions from '../components/listings/BulkListingActions';
import BetaGate from '../components/common/BetaGate';
import { handleAuthError } from '@/utils/authHelpers';
import { useConfirmDialog, ConfirmDialog } from '@/hooks/useConfirmDialog';
import { NoDataEmptyState, NoResultsEmptyState } from '../components/common/EmptyState';

export default function Listings() {
    const [inventoryItems, setInventoryItems] = useState([]);
    const [platforms, setPlatforms] = useState([]);
    const [filteredItems, setFilteredItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [platformFilter, setPlatformFilter] = useState('all');
    const [selectedItems, setSelectedItems] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [activeTab, setActiveTab] = useState('all-listings');
    const navigate = useNavigate();
    const { isOpen, config, confirm, cancel } = useConfirmDialog();

    // Memoize beta access check
    const hasBetaAccess = useMemo(() => {
        return currentUser && currentUser.user_mode === 'beta';
    }, [currentUser]);

    // Extract unique platforms from inventory
    const availablePlatforms = useMemo(() => {
        const platformSet = new Set();
        inventoryItems.forEach(item => {
            item.platform_listings?.forEach(listing => {
                if (listing.platform) {
                    platformSet.add(listing.platform);
                }
            });
        });
        return ['all', ...Array.from(platformSet)];
    }, [inventoryItems]);

    // Calculate listing stats
    const stats = useMemo(() => {
        let totalListings = 0;
        let activeListings = 0;
        let draftListings = 0;
        let needsOptimization = 0;

        inventoryItems.forEach(item => {
            const listings = item.platform_listings || [];
            totalListings += listings.length;
            activeListings += listings.filter(l => l.is_active).length;
            draftListings += listings.filter(l => !l.is_active).length;
            
            // Check if listing needs optimization (basic check)
            if (!item.description || item.description.length < 100) {
                needsOptimization++;
            }
        });

        return {
            totalItems: inventoryItems.length,
            totalListings,
            activeListings,
            draftListings,
            needsOptimization,
            multiPlatform: inventoryItems.filter(item => 
                (item.platform_listings?.length || 0) > 1
            ).length
        };
    }, [inventoryItems]);

    // Load inventory and platforms
    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const user = await User.me();
            setCurrentUser(user);

            const [itemsData, platformsData] = await Promise.all([
                InventoryItem.list('-created_at').catch(err => {
                    console.error('Error fetching inventory:', err);
                    return [];
                }),
                Platform.list().catch(err => {
                    console.error('Error fetching platforms:', err);
                    return [];
                })
            ]);

            // Filter out invalid data
            const validItems = itemsData.filter(i => 
                i && typeof i === 'object' && i.id
            );
            const validPlatforms = platformsData.filter(p => 
                p && typeof p === 'object' && p.id && p.status === 'connected'
            );

            setInventoryItems(validItems);
            setPlatforms(validPlatforms);
            setFilteredItems(validItems);
        } catch (error) {
            console.error('Error loading listings:', error);
            
            if (handleAuthError(error, navigate, { showToast: true })) {
                return;
            }

            toast.error("Failed to load listings", {
                description: "Please try refreshing the page."
            });
            
            setInventoryItems([]);
            setPlatforms([]);
            setFilteredItems([]);
        } finally {
            setIsLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Apply filters
    useEffect(() => {
        let filtered = [...inventoryItems];

        // Search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(item =>
                item.product_name?.toLowerCase().includes(term) ||
                item.sku?.toLowerCase().includes(term) ||
                item.category?.toLowerCase().includes(term)
            );
        }

        // Status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(item => {
                if (statusFilter === 'active') {
                    return item.platform_listings?.some(l => l.is_active);
                } else if (statusFilter === 'draft') {
                    return !item.platform_listings?.some(l => l.is_active);
                } else if (statusFilter === 'needs_optimization') {
                    return !item.description || item.description.length < 100;
                }
                return true;
            });
        }

        // Platform filter
        if (platformFilter !== 'all') {
            filtered = filtered.filter(item =>
                item.platform_listings?.some(l => l.platform === platformFilter)
            );
        }

        setFilteredItems(filtered);
    }, [inventoryItems, searchTerm, statusFilter, platformFilter]);

    // Handle AI listing generation
    const handleGenerateListing = useCallback(async (itemId, targetPlatforms) => {
        setIsGenerating(true);
        try {
            const item = inventoryItems.find(i => i.id === itemId);
            if (!item) {
                toast.error("Item not found");
                return;
            }

            // Generate optimized listing using AI
            const prompt = `Generate an optimized product listing for ${item.product_name} to be published on ${targetPlatforms.join(', ')}. 
                Include compelling title, detailed description, relevant tags, and pricing recommendations.`;

            const response = await api.functions.invoke('interpretCommand', {
                command_text: prompt,
                context: { item, platforms: targetPlatforms }
            });

            if (response.data?.success) {
                toast.success("Listing generated successfully!");
                await loadData();
            } else {
                throw new Error(response.data?.error || 'Generation failed');
            }
        } catch (error) {
            console.error('Error generating listing:', error);
            
            if (handleAuthError(error, navigate)) {
                return;
            }

            toast.error("Failed to generate listing", {
                description: error.message || "Please try again."
            });
        } finally {
            setIsGenerating(false);
        }
    }, [inventoryItems, navigate, loadData]);

    // Handle bulk listing creation with confirmation
    const handleBulkCreate = useCallback(async (selectedIds, targetPlatforms) => {
        await confirm({
            title: 'Create Bulk Listings?',
            description: `This will create listings for ${selectedIds.length} products on ${targetPlatforms.length} platform(s). This may take a few moments.`,
            confirmText: 'Create Listings',
            onConfirm: async () => {
                setIsGenerating(true);
                try {
                    const promises = selectedIds.map(itemId =>
                        handleGenerateListing(itemId, targetPlatforms)
                    );

                    await Promise.all(promises);
                    
                    toast.success(`Created listings for ${selectedIds.length} products!`);
                    setSelectedItems([]);
                } catch (error) {
                    console.error('Error creating bulk listings:', error);
                    
                    if (handleAuthError(error, navigate)) {
                        return;
                    }

                    toast.error("Some listings failed to create");
                } finally {
                    setIsGenerating(false);
                }
            }
        });
    }, [confirm, navigate, handleGenerateListing]);

    // Handle bulk optimization with confirmation
    const handleBulkOptimize = useCallback(async (selectedIds) => {
        await confirm({
            title: 'Optimize Listings?',
            description: `This will use AI to optimize ${selectedIds.length} product listing(s) for better performance.`,
            confirmText: 'Optimize',
            onConfirm: async () => {
                setIsGenerating(true);
                try {
                    const prompt = `Optimize the following product listings for better SEO, conversion, and visibility: ${
                        selectedIds.map(id => {
                            const item = inventoryItems.find(i => i.id === id);
                            return item?.product_name;
                        }).join(', ')
                    }`;

                    const response = await api.functions.invoke('interpretCommand', {
                        command_text: prompt
                    });

                    if (response.data?.success) {
                        toast.success("Listings optimized successfully!");
                        await loadData();
                        setSelectedItems([]);
                    } else {
                        throw new Error('Optimization failed');
                    }
                } catch (error) {
                    console.error('Error optimizing listings:', error);
                    
                    if (handleAuthError(error, navigate)) {
                        return;
                    }

                    toast.error("Failed to optimize listings");
                } finally {
                    setIsGenerating(false);
                }
            }
        });
    }, [confirm, navigate, inventoryItems, loadData]);

    // Handle item selection
    const handleSelectItem = useCallback((itemId) => {
        setSelectedItems(prev =>
            prev.includes(itemId)
                ? prev.filter(id => id !== itemId)
                : [...prev, itemId]
        );
    }, []);

    const handleSelectAll = useCallback(() => {
        if (selectedItems.length === filteredItems.length) {
            setSelectedItems([]);
        } else {
            setSelectedItems(filteredItems.map(item => item.id));
        }
    }, [selectedItems, filteredItems]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                    <p className="text-slate-600">Loading listings...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50 p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 flex items-center gap-3">
                        <Package className="w-8 h-8 sm:w-10 sm:h-10 text-purple-600" />
                        Product Listings
                    </h1>
                    <p className="mt-2 text-lg text-slate-600">
                        AI-powered listing creation and optimization across all platforms
                    </p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                    <Card className="bg-white/80 backdrop-blur-sm">
                        <CardContent className="p-4">
                            <p className="text-xs text-slate-600">Total Products</p>
                            <p className="text-2xl font-bold text-slate-900">{stats.totalItems}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/80 backdrop-blur-sm">
                        <CardContent className="p-4">
                            <p className="text-xs text-slate-600">All Listings</p>
                            <p className="text-2xl font-bold text-indigo-600">{stats.totalListings}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/80 backdrop-blur-sm">
                        <CardContent className="p-4">
                            <p className="text-xs text-slate-600">Active</p>
                            <p className="text-2xl font-bold text-green-600">{stats.activeListings}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/80 backdrop-blur-sm">
                        <CardContent className="p-4">
                            <p className="text-xs text-slate-600">Drafts</p>
                            <p className="text-2xl font-bold text-yellow-600">{stats.draftListings}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/80 backdrop-blur-sm">
                        <CardContent className="p-4">
                            <p className="text-xs text-slate-600">Need Optimization</p>
                            <p className="text-2xl font-bold text-orange-600">{stats.needsOptimization}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/80 backdrop-blur-sm">
                        <CardContent className="p-4">
                            <p className="text-xs text-slate-600">Multi-Platform</p>
                            <p className="text-2xl font-bold text-purple-600">{stats.multiPlatform}</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Alert for no platforms */}
                {platforms.length === 0 && (
                    <Card className="mb-6 border-amber-200 bg-amber-50">
                        <CardContent className="p-4 flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <h3 className="font-semibold text-amber-900">No Platforms Connected</h3>
                                <p className="text-sm text-amber-700 mt-1">
                                    Connect your selling platforms to create and manage listings.
                                </p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-3 border-amber-300 text-amber-800 hover:bg-amber-100"
                                    onClick={() => navigate(createPageUrl('Platforms'))}
                                >
                                    Connect Platforms
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-3 mb-6">
                        <TabsTrigger value="all-listings">All Listings</TabsTrigger>
                        <TabsTrigger value="ai-generator">AI Generator</TabsTrigger>
                        <TabsTrigger value="bulk-actions">Bulk Actions</TabsTrigger>
                    </TabsList>

                    {/* All Listings Tab */}
                    <TabsContent value="all-listings">
                        <Card className="bg-white/80 backdrop-blur-sm">
                            <CardHeader>
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    <CardTitle className="flex items-center gap-2">
                                        <Package className="w-5 h-5" />
                                        Your Listings
                                    </CardTitle>
                                    <Button
                                        onClick={() => setActiveTab('ai-generator')}
                                        className="bg-purple-600 hover:bg-purple-700"
                                    >
                                        <Sparkles className="w-4 h-4 mr-2" />
                                        Generate with AI
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {/* Filters */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                                        <Input
                                            placeholder="Search products..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-10"
                                        />
                                    </div>
                                    <div>
                                        <select
                                            value={statusFilter}
                                            onChange={(e) => setStatusFilter(e.target.value)}
                                            className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm"
                                        >
                                            <option value="all">All Status</option>
                                            <option value="active">Active</option>
                                            <option value="draft">Drafts</option>
                                            <option value="needs_optimization">Needs Optimization</option>
                                        </select>
                                    </div>
                                    <div>
                                        <select
                                            value={platformFilter}
                                            onChange={(e) => setPlatformFilter(e.target.value)}
                                            className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm"
                                        >
                                            {availablePlatforms.map(platform => (
                                                <option key={platform} value={platform}>
                                                    {platform === 'all' ? 'All Platforms' : platform}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Listings Table */}
                                {filteredItems.length === 0 ? (
                                    searchTerm || statusFilter !== 'all' || platformFilter !== 'all' ? (
                                        <NoResultsEmptyState onClear={() => {
                                            setSearchTerm('');
                                            setStatusFilter('all');
                                            setPlatformFilter('all');
                                        }} />
                                    ) : (
                                        <NoDataEmptyState
                                            entityName="Products"
                                            onCreate={() => navigate(createPageUrl('Inventory'))}
                                        />
                                    )
                                ) : (
                                    <ListingStatusTable
                                        items={filteredItems}
                                        platforms={platforms}
                                        onGenerateListing={handleGenerateListing}
                                        onSelectItem={handleSelectItem}
                                        selectedItems={selectedItems}
                                        onSelectAll={handleSelectAll}
                                        isGenerating={isGenerating}
                                    />
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* AI Generator Tab */}
                    <TabsContent value="ai-generator">
                        <Card className="bg-white/80 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-purple-600" />
                                    AI Listing Generator
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <AIListingGenerator
                                    inventoryItems={inventoryItems}
                                    platforms={platforms}
                                    onGenerate={handleGenerateListing}
                                    isGenerating={isGenerating}
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Bulk Actions Tab */}
                    <TabsContent value="bulk-actions">
                        <Card className="bg-white/80 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Upload className="w-5 h-5 text-indigo-600" />
                                    Bulk Actions
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <BulkListingActions
                                    inventoryItems={inventoryItems}
                                    platforms={platforms}
                                    selectedItems={selectedItems}
                                    onBulkCreate={handleBulkCreate}
                                    onBulkOptimize={handleBulkOptimize}
                                    onSelectItem={handleSelectItem}
                                    onSelectAll={handleSelectAll}
                                    isGenerating={isGenerating}
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            <ConfirmDialog isOpen={isOpen} config={config} onCancel={cancel} />
        </div>
    );
}