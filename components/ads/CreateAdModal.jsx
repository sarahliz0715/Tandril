
import React, { useState, useEffect } from 'react';
import { AdCreative } from '@/lib/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ImageIcon, Save } from 'lucide-react';

export default function CreateAdModal({ isOpen, onClose, onSave, campaigns, products, initialImageUrl = null }) {
    const [formData, setFormData] = useState({
        name: '',
        format: 'image',
        platform: 'facebook',
        content: { headline: '', primary_text: '', media_urls: [initialImageUrl || ''] },
        inventory_item_id: '',
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        // If an initialImageUrl is provided, update the form state
        if (initialImageUrl) {
            setFormData(prev => ({
                ...prev,
                content: { ...prev.content, media_urls: [initialImageUrl] }
            }));
        }
    }, [initialImageUrl]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await AdCreative.create(formData);
            onSave();
        } catch (error) {
            toast.error("Failed to create ad creative.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ImageIcon className="w-5 h-5 text-purple-600" />
                        Create New Ad Creative
                    </DialogTitle>
                    <DialogDescription>
                        Design your ad with compelling copy and visuals.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
                    <div>
                        <Label htmlFor="ad-name">Creative Name</Label>
                        <Input id="ad-name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., Blue T-Shirt Ad V1" required />
                    </div>
                     <div>
                        <Label>Link to Product</Label>
                        <Select value={formData.inventory_item_id} onValueChange={(v) => setFormData({ ...formData, inventory_item_id: v })}>
                            <SelectTrigger><SelectValue placeholder="Select a product..." /></SelectTrigger>
                            <SelectContent>
                                {products.map(p => <SelectItem key={p.id} value={p.id}>{p.product_name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="headline">Headline</Label>
                        <Input id="headline" value={formData.content.headline} onChange={(e) => setFormData({ ...formData, content: {...formData.content, headline: e.target.value } })} placeholder="e.g., Get 50% Off Today!" />
                    </div>
                    <div>
                        <Label htmlFor="primary-text">Primary Text</Label>
                        <Textarea id="primary-text" value={formData.content.primary_text} onChange={(e) => setFormData({ ...formData, content: {...formData.content, primary_text: e.target.value } })} placeholder="Describe your product or offer..." />
                    </div>
                    <div>
                        <Label htmlFor="media-url">Image/Video URL</Label>
                        <Input id="media-url" value={formData.content.media_urls[0]} onChange={(e) => setFormData({ ...formData, content: {...formData.content, media_urls: [e.target.value] } })} placeholder="https://your-image-url.com/image.jpg" />
                    </div>
                </form>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isSaving}>
                        {isSaving ? 'Saving...' : <><Save className="w-4 h-4 mr-2" />Save Creative</>}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
