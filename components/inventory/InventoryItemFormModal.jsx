import React, { useState } from 'react';
import { InventoryItem } from '@/api/entities';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function InventoryItemFormModal({ item, onClose, onSave, isOpen }) {
    const [formData, setFormData] = useState(item || {
        product_name: '',
        sku: '',
        description: '',
        base_price: 0,
        total_stock: 0,
        status: 'active',
        image_url: 'https://via.placeholder.com/150',
    });
    const [isSaving, setIsSaving] = useState(false);

    // Check if this is a Shopify product (has platform_id)
    const isShopifyProduct = item && item.platform_id;

    const handleChange = (key, value) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        // For Shopify products, only validate stock quantity
        if (isShopifyProduct) {
            if (formData.total_stock === undefined || formData.total_stock < 0) {
                toast.error("Validation Error", { description: "Stock quantity must be 0 or greater." });
                return;
            }
        } else {
            // For non-Shopify products (if any), validate all fields
            if (!formData.product_name || !formData.sku) {
                toast.error("Validation Error", { description: "Product Name and SKU are required." });
                return;
            }
        }

        setIsSaving(true);
        try {
            await onSave(formData);
        } catch (error) {
            toast.error("Save Failed", { description: `Could not save the item. ${error.message}` });
            console.error('Failed to save inventory item', error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>
                        {isShopifyProduct ? 'Update Inventory Quantity' : formData.id ? 'Edit Product' : 'Add New Product'}
                    </DialogTitle>
                    <DialogDescription>
                        {isShopifyProduct
                            ? `Adjust stock quantity for ${formData.product_name || 'this product'}. Other product details must be updated in Shopify.`
                            : formData.id
                                ? `Update details for ${formData.product_name}.`
                                : 'Add a new product to your master inventory.'}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    {isShopifyProduct ? (
                        <>
                            {/* Shopify product - show read-only details and editable stock */}
                            <div className="space-y-2 p-3 bg-slate-50 rounded-lg">
                                <div className="text-sm">
                                    <span className="font-medium text-slate-700">Product:</span>{' '}
                                    <span className="text-slate-900">{formData.product_name}</span>
                                    {formData.variant_name && (
                                        <span className="text-slate-600"> - {formData.variant_name}</span>
                                    )}
                                </div>
                                <div className="text-sm">
                                    <span className="font-medium text-slate-700">SKU:</span>{' '}
                                    <span className="text-slate-900">{formData.sku || 'N/A'}</span>
                                </div>
                                <div className="text-sm">
                                    <span className="font-medium text-slate-700">Store:</span>{' '}
                                    <span className="text-slate-900">{formData.platform_name}</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="total_stock" className="text-right font-semibold">Stock Quantity</Label>
                                <Input
                                    id="total_stock"
                                    type="number"
                                    min="0"
                                    value={formData.total_stock}
                                    onChange={e => handleChange('total_stock', parseInt(e.target.value, 10) || 0)}
                                    className="col-span-3"
                                    autoFocus
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Non-Shopify product - show all editable fields */}
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="product_name" className="text-right">Name</Label>
                                <Input id="product_name" value={formData.product_name} onChange={e => handleChange('product_name', e.target.value)} className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="sku" className="text-right">SKU</Label>
                                <Input id="sku" value={formData.sku} onChange={e => handleChange('sku', e.target.value)} className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="total_stock" className="text-right">Total Stock</Label>
                                <Input id="total_stock" type="number" value={formData.total_stock} onChange={e => handleChange('total_stock', parseInt(e.target.value, 10) || 0)} className="col-span-3" />
                            </div>
                        </>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? 'Updating...' : isShopifyProduct ? 'Update Shopify Inventory' : 'Save Changes'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}