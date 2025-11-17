
import React, { useState, useEffect, useCallback } from 'react';
import { Platform } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Package, Loader2, RefreshCw } from 'lucide-react';
import { getShopifyProducts } from '@/api/functions';
import { toast } from 'sonner';

export default function ProductPreviewPanel() {
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [connectedPlatform, setConnectedPlatform] = useState(null);
    const [expandedProducts, setExpandedProducts] = useState(new Set());

    const loadProducts = useCallback(async (platform) => {
        if (!platform?.api_credentials) return;

        setIsLoading(true);
        try {
            const response = await getShopifyProducts({
                shopifyCredentials: platform.api_credentials,
                limit: 20
            });

            if (response.data.success) {
                setProducts(response.data.products);
            } else {
                toast.error('Failed to load products: ' + response.data.error);
            }
        } catch (error) {
            console.error('Error loading products:', error);
            toast.error('Failed to load products');
        } finally {
            setIsLoading(false);
        }
    }, []); // No dependencies as it only uses props/state passed as arguments or global functions/constants

    const loadConnectedPlatform = useCallback(async () => {
        try {
            const platforms = await Platform.filter({ status: 'connected', platform_type: 'shopify' });
            if (platforms.length > 0) {
                setConnectedPlatform(platforms[0]);
                loadProducts(platforms[0]);
            }
        } catch (error) {
            console.error('Error loading connected platform:', error);
        }
    }, [loadProducts]); // Depends on loadProducts

    useEffect(() => {
        loadConnectedPlatform();
    }, [loadConnectedPlatform]); // Depends on loadConnectedPlatform

    const toggleExpanded = (productId) => {
        // Using functional update for `setExpandedProducts` to avoid `expandedProducts` in dependency array
        // and prevent stale closure issues if toggleExpanded were memoized.
        setExpandedProducts(prevExpanded => {
            const newExpanded = new Set(prevExpanded);
            if (newExpanded.has(productId)) {
                newExpanded.delete(productId);
            } else {
                newExpanded.add(productId);
            }
            return newExpanded;
        });
    };

    if (!connectedPlatform) {
        return (
            <Card className="bg-white/80">
                <CardContent className="p-6 text-center">
                    <Package className="w-12 h-12 mx-auto text-slate-400 mb-3" />
                    <p className="text-slate-600">Connect a Shopify store to see your products</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-white/80">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <Package className="w-5 h-5 text-blue-600" />
                        Your Products
                    </CardTitle>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => loadProducts(connectedPlatform)}
                        disabled={isLoading}
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
                {connectedPlatform && (
                    <p className="text-sm text-slate-500">
                        From {connectedPlatform.store_info?.store_name} • {products.length} products shown
                    </p>
                )}
            </CardHeader>
            <CardContent className="max-h-96 overflow-y-auto">
                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                        <span className="ml-2 text-slate-600">Loading products...</span>
                    </div>
                ) : products.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-slate-600">No products found</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {products.map((product) => (
                            <Collapsible key={product.id} open={expandedProducts.has(product.id)} onOpenChange={() => toggleExpanded(product.id)}>
                                <CollapsibleTrigger asChild>
                                    <div 
                                        className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer"
                                        // onClick is handled by CollapsibleTrigger's onOpenChange, removed explicit onClick
                                    >
                                        <div className="flex items-center gap-3">
                                            {expandedProducts.has(product.id) ? 
                                                <ChevronDown className="w-4 h-4 text-slate-400" /> : 
                                                <ChevronRight className="w-4 h-4 text-slate-400" />
                                            }
                                            {product.images?.[0] && ( // Added optional chaining for images
                                                <img 
                                                    src={product.images[0].src} // Assuming image object has a 'src' property
                                                    alt={product.title}
                                                    className="w-8 h-8 object-cover rounded"
                                                />
                                            )}
                                            <div>
                                                <p className="font-medium text-sm">{product.title}</p>
                                                <p className="text-xs text-slate-500">${product.variants?.[0]?.price || 'N/A'}</p> {/* Added optional chaining and N/A */}
                                            </div>
                                        </div>
                                        <Badge 
                                            variant={product.status === 'active' ? 'default' : 'secondary'}
                                            className="text-xs"
                                        >
                                            {product.status}
                                        </Badge>
                                    </div>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <div className="ml-6 p-3 bg-slate-50 rounded-lg mt-2">
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div><strong>Type:</strong> {product.product_type || 'N/A'}</div>
                                            <div><strong>Vendor:</strong> {product.vendor || 'N/A'}</div>
                                            <div><strong>Stock:</strong> {product.variants?.[0]?.inventory_quantity || 0}</div> {/* Added optional chaining */}
                                            <div><strong>SKU:</strong> {product.variants?.[0]?.sku || 'N/A'}</div> {/* Added optional chaining */}
                                        </div>
                                        {product.tags && product.tags.length > 0 && ( {/* Check if tags array exists and has elements */}
                                            <div className="mt-2">
                                                <strong className="text-xs">Tags:</strong>
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {product.tags.slice(0, 5).map((tag, idx) => (
                                                        <Badge key={idx} variant="outline" className="text-xs px-1 py-0">
                                                            {tag}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </CollapsibleContent>
                            </Collapsible>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
