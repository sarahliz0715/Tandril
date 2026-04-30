import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { api } from '@/lib/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Link2, Plus, Trash2, RefreshCw, CheckCircle, XCircle, Loader2, Clock } from 'lucide-react';

export default function SyncLinksPanel() {
    const [links, setLinks] = useState([]);
    const [platforms, setPlatforms] = useState([]);
    const [syncLog, setSyncLog] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [isSyncing, setIsSyncing] = useState(null);
    const [form, setForm] = useState({
        sku: '',
        platform_id: '',
        platform_product_id: '',
        platform_variant_id: '',
    });

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const [linksRes, platformsRes, logRes] = await Promise.all([
                supabase
                    .from('platform_product_links')
                    .select('*, platforms(shop_name, shop_domain, platform_type)')
                    .eq('user_id', user.id)
                    .order('sku'),
                supabase
                    .from('platforms')
                    .select('id, shop_name, shop_domain, platform_type')
                    .eq('user_id', user.id)
                    .eq('is_active', true),
                supabase
                    .from('inventory_sync_log')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(20),
            ]);

            setLinks(linksRes.data ?? []);
            setPlatforms(platformsRes.data ?? []);
            setSyncLog(logRes.data ?? []);
        } catch (err) {
            console.error('SyncLinksPanel load error:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const handleAdd = async () => {
        if (!form.sku || !form.platform_id || !form.platform_product_id) {
            toast.error('SKU, platform, and product ID are required');
            return;
        }

        const selectedPlatform = platforms.find(p => p.id === form.platform_id);
        if (!selectedPlatform) return;

        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from('platform_product_links').insert({
            user_id: user.id,
            sku: form.sku.trim(),
            platform_id: form.platform_id,
            platform_type: selectedPlatform.platform_type,
            platform_product_id: form.platform_product_id.trim(),
            platform_variant_id: form.platform_variant_id.trim() || null,
        });

        if (error) {
            toast.error(error.code === '23505' ? 'This SKU is already linked to that platform' : error.message);
            return;
        }

        toast.success('Product link added');
        setShowAddModal(false);
        setForm({ sku: '', platform_id: '', platform_product_id: '', platform_variant_id: '' });
        loadData();
    };

    const handleDelete = async (id) => {
        const { error } = await supabase.from('platform_product_links').delete().eq('id', id);
        if (error) { toast.error('Failed to delete link'); return; }
        toast.success('Link removed');
        loadData();
    };

    const handleManualSync = async (sku) => {
        setIsSyncing(sku);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            // Get current quantity from first linked Shopify platform for this SKU
            const shopifyLink = links.find(l => l.sku === sku && l.platform_type === 'shopify');
            if (!shopifyLink) {
                toast.error('No Shopify platform linked for this SKU — sync requires a Shopify source');
                return;
            }

            const result = await api.functions.invoke('sync-inventory-levels', {
                user_id: user.id,
                sku,
                new_quantity: null, // null = fetch current qty from source
                source_platform_id: shopifyLink.platform_id,
                source_platform_type: 'shopify',
                triggered_by: 'manual',
            });

            const data = result?.data ?? result;
            if (data?.success) {
                toast.success(`Synced ${data.synced ?? 0} platform(s) for SKU ${sku}`);
                loadData();
            } else {
                throw new Error(data?.error || 'Sync failed');
            }
        } catch (err) {
            toast.error(`Sync failed: ${err.message}`);
        } finally {
            setIsSyncing(null);
        }
    };

    // Group links by SKU for display
    const linksBySku = links.reduce((acc, link) => {
        if (!acc[link.sku]) acc[link.sku] = [];
        acc[link.sku].push(link);
        return acc;
    }, {});

    const platformLabel = (link) => {
        const p = link.platforms;
        if (!p) return link.platform_type;
        return p.shop_name || p.shop_domain;
    };

    const platformColor = (type) => {
        const colors = { shopify: 'bg-green-100 text-green-700', woocommerce: 'bg-blue-100 text-blue-700', etsy: 'bg-orange-100 text-orange-700', ebay: 'bg-yellow-100 text-yellow-700' };
        return colors[type] ?? 'bg-slate-100 text-slate-700';
    };

    if (isLoading) return (
        <Card>
            <CardContent className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
            </CardContent>
        </Card>
    );

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Link2 className="w-5 h-5 text-emerald-600" />
                            <CardTitle>Cross-Platform Sync Links</CardTitle>
                        </div>
                        <Button onClick={() => setShowAddModal(true)} className="bg-emerald-600 hover:bg-emerald-700">
                            <Plus className="w-4 h-4 mr-2" />
                            Link Product
                        </Button>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">
                        Link the same product across platforms by SKU. When it sells on one, inventory updates everywhere.
                    </p>
                </CardHeader>
                <CardContent>
                    {Object.keys(linksBySku).length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                            <Link2 className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                            <p className="font-medium">No product links yet</p>
                            <p className="text-sm mt-1">Add a link to start syncing inventory across platforms automatically.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {Object.entries(linksBySku).map(([sku, skuLinks]) => (
                                <div key={sku} className="border border-slate-200 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <span className="font-mono font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-sm">{sku}</span>
                                            <span className="text-sm text-slate-500">{skuLinks.length} platform{skuLinks.length !== 1 ? 's' : ''} linked</span>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleManualSync(sku)}
                                            disabled={isSyncing === sku}
                                        >
                                            {isSyncing === sku
                                                ? <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                                : <RefreshCw className="w-3 h-3 mr-1" />}
                                            Sync Now
                                        </Button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {skuLinks.map(link => (
                                            <div key={link.id} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5">
                                                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${platformColor(link.platform_type)}`}>
                                                    {link.platform_type}
                                                </span>
                                                <span className="text-sm text-slate-700">{platformLabel(link)}</span>
                                                <span className="text-xs text-slate-400 font-mono">#{link.platform_product_id}{link.platform_variant_id ? `/${link.platform_variant_id}` : ''}</span>
                                                {link.last_synced_at && (
                                                    <span className="text-xs text-slate-400 flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {new Date(link.last_synced_at).toLocaleDateString()}
                                                    </span>
                                                )}
                                                <button onClick={() => handleDelete(link.id)} className="text-slate-400 hover:text-red-500 ml-1">
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Sync Log */}
            {syncLog.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Recent Sync Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {syncLog.slice(0, 10).map(entry => {
                                const succeeded = (entry.synced_platforms ?? []).filter(p => p.success).length;
                                const total = (entry.synced_platforms ?? []).length;
                                const allGood = succeeded === total && total > 0;
                                return (
                                    <div key={entry.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                                        <div className="flex items-center gap-3">
                                            {allGood
                                                ? <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                                                : <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                                            <div>
                                                <span className="font-mono text-sm font-medium">{entry.sku}</span>
                                                <span className="text-slate-500 text-sm ml-2">→ qty {entry.new_quantity}</span>
                                                <span className="text-xs text-slate-400 ml-2">{entry.triggered_by === 'webhook' ? 'Auto' : 'Manual'}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm text-slate-500">
                                            <span>{succeeded}/{total} synced</span>
                                            <span>{new Date(entry.created_at).toLocaleString()}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Add Link Modal */}
            <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Link Product Across Platforms</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <p className="text-sm text-slate-500">
                            Enter the SKU and the platform-specific product ID for the same item on each platform. The SKU must match across all stores.
                        </p>
                        <div>
                            <Label>SKU *</Label>
                            <Input
                                placeholder="e.g. BACKPACK-BLK-L"
                                value={form.sku}
                                onChange={e => setForm(f => ({ ...f, sku: e.target.value }))}
                            />
                        </div>
                        <div>
                            <Label>Platform *</Label>
                            <Select value={form.platform_id} onValueChange={v => setForm(f => ({ ...f, platform_id: v }))}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a connected platform..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {platforms.map(p => (
                                        <SelectItem key={p.id} value={p.id}>
                                            {p.platform_type} — {p.shop_name || p.shop_domain}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Product ID on that platform *</Label>
                            <Input
                                placeholder="e.g. 7234567890123 (Shopify product ID)"
                                value={form.platform_product_id}
                                onChange={e => setForm(f => ({ ...f, platform_product_id: e.target.value }))}
                            />
                        </div>
                        <div>
                            <Label>Variant ID <span className="text-slate-400">(optional — only if product has variants)</span></Label>
                            <Input
                                placeholder="e.g. 41234567890123"
                                value={form.platform_variant_id}
                                onChange={e => setForm(f => ({ ...f, platform_variant_id: e.target.value }))}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
                        <Button onClick={handleAdd} className="bg-emerald-600 hover:bg-emerald-700">Add Link</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
