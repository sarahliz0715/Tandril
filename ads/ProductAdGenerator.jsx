import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Wand2, Loader2, Send } from 'lucide-react';
import { AdCreative } from '@/api/entities';
import GeneratedAdPreview from './GeneratedAdPreview';

export default function ProductAdGenerator({ isOpen, onClose, products, campaigns }) {
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [selectedCampaign, setSelectedCampaign] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedAds, setGeneratedAds] = useState([]);
    
    const handleGenerate = async () => {
        if (!selectedProduct || !selectedCampaign) {
            toast.error("Please select a product and a campaign.");
            return;
        }
        
        setIsGenerating(true);
        setGeneratedAds([]);

        // Simulate AI generation
        await new Promise(resolve => setTimeout(resolve, 2500));
        
        const product = products.find(p => p.id === selectedProduct);
        const campaign = campaigns.find(c => c.id === selectedCampaign);

        const newAds = [
            {
                name: `${product.product_name} - Value Prop Ad`,
                format: 'image',
                platform: campaign.platform,
                content: {
                    headline: `Discover the Perfect ${product.category}`,
                    primary_text: `Unleash your style with the ${product.product_name}. Made with premium materials, it's designed for comfort and durability. ${product.description}`,
                    media_urls: [product.image_url],
                    call_to_action: 'Shop Now'
                },
                inventory_item_id: product.id,
            },
            {
                name: `${product.product_name} - Scarcity Ad`,
                format: 'image',
                platform: campaign.platform,
                content: {
                    headline: `Limited Stock: ${product.product_name}!`,
                    primary_text: `Don't miss out! Our popular ${product.product_name} is flying off the shelves. Grab yours before it's gone forever.`,
                    media_urls: [product.image_url],
                    call_to_action: 'Buy Now'
                },
                inventory_item_id: product.id,
            },
            {
                name: `${product.product_name} - Benefit Ad`,
                format: 'image',
                platform: campaign.platform,
                content: {
                    headline: `Experience Unmatched Comfort`,
                    primary_text: `From morning coffee to evening strolls, the ${product.product_name} offers all-day comfort and timeless style. Elevate your wardrobe today.`,
                    media_urls: [product.image_url],
                    call_to_action: 'Learn More'
                },
                inventory_item_id: product.id,
            }
        ];

        setGeneratedAds(newAds);
        setIsGenerating(false);
    };

    const handleSaveAd = async (adData) => {
        try {
            await AdCreative.create(adData);
            toast.success(`Ad "${adData.name}" saved successfully!`);
            // Optionally remove it from the list
            setGeneratedAds(prev => prev.filter(ad => ad.name !== adData.name));
        } catch (error) {
            toast.error("Failed to save ad.");
        }
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Wand2 className="w-5 h-5 text-indigo-600" />
                        AI Ad Generator
                    </DialogTitle>
                    <DialogDescription>
                        Automatically generate multiple ad variations for a specific product.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-4">
                    <div>
                        <Label>1. Select a Product to Advertise</Label>
                        <Select onValueChange={setSelectedProduct}>
                            <SelectTrigger><SelectValue placeholder="Choose a product..." /></SelectTrigger>
                            <SelectContent>
                                {products.map(p => <SelectItem key={p.id} value={p.id}>{p.product_name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>2. Select a Campaign</Label>
                         <Select onValueChange={setSelectedCampaign}>
                            <SelectTrigger><SelectValue placeholder="Choose a campaign..." /></SelectTrigger>
                            <SelectContent>
                                {campaigns.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <Button onClick={handleGenerate} disabled={isGenerating || !selectedProduct || !selectedCampaign} className="w-full">
                    {isGenerating ? 
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating Ads...</> : 
                        <><Wand2 className="w-4 h-4 mr-2" /> Generate Ad Creatives</>
                    }
                </Button>
                
                {generatedAds.length > 0 && (
                    <div className="mt-6">
                        <h3 className="text-lg font-semibold mb-4">Generated Ads ({generatedAds.length})</h3>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 max-h-[40vh] overflow-y-auto p-1">
                            {generatedAds.map((ad, index) => (
                                <GeneratedAdPreview key={index} adData={ad} onSave={handleSaveAd} />
                            ))}
                        </div>
                    </div>
                )}
                
                <DialogFooter className="mt-6">
                    <Button variant="outline" onClick={onClose}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}