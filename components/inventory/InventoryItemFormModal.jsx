import React, { useState } from 'react';
import { InventoryItem } from '@/lib/entities';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function InventoryItemFormModal({ item, onClose, onSaveSuccess }) {
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

    const handleChange = (key, value) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        // Basic validation
        if (!formData.product_name || !formData.sku) {
            toast.error("Validation Error", { description: "Product Name and SKU are required." });
            return;
        }

        setIsSaving(true);
        try {
            if (formData.id) {
                await InventoryItem.update(formData.id, formData);
            } else {
                await InventoryItem.create(formData);
            }
            onSaveSuccess();
        } catch (error) {
            toast.error("Save Failed", { description: `Could not save the item. ${error.message}` });
            console.error('Failed to save inventory item', error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{formData.id ? 'Edit' : 'Add New'} Product</DialogTitle>
                    <DialogDescription>
                        {formData.id ? `Update details for ${formData.product_name}.` : 'Add a new product to your master inventory.'}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="product_name" className="text-right">Name</Label>
                        <Input id="product_name" value={formData.product_name} onChange={e => handleChange('product_name', e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="sku" className="text-right">SKU</Label>
                        <Input id="sku" value={formData.sku} onChange={e => handleChange('sku', e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="description" className="text-right">Description</Label>
                        <Textarea id="description" value={formData.description} onChange={e => handleChange('description', e.target.value)} className="col-span-3" />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="base_price" className="text-right">Base Price</Label>
                        <Input id="base_price" type="number" value={formData.base_price} onChange={e => handleChange('base_price', parseFloat(e.target.value) || 0)} className="col-span-3" />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="total_stock" className="text-right">Total Stock</Label>
                        <Input id="total_stock" type="number" value={formData.total_stock} onChange={e => handleChange('total_stock', parseInt(e.target.value, 10) || 0)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="status" className="text-right">Status</Label>
                         <Select value={formData.status} onValueChange={value => handleChange('status', value)}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="low_stock">Low Stock</SelectItem>
                                <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                                <SelectItem value="discontinued">Discontinued</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}