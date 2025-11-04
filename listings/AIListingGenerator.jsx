import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

// This is a mock function. In a real scenario, this would be a backend call.
const generateListingWithAI = async (productInfo) => {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve({
                title: `Premium Handcrafted ${productInfo} - Perfect Gift`,
                description: `Discover the finest **Premium Handcrafted ${productInfo}**, meticulously designed for elegance and durability. Made from high-quality materials, this ${productInfo} is perfect as a unique gift or a special treat for yourself.\n\n*   **Superior Quality:** Built to last with attention to every detail.\n*   **Unique Design:** Stand out with this one-of-a-kind piece.\n*   **Versatile:** Ideal for any occasion, from casual outings to formal events.`,
                tags: `${productInfo}, handcrafted, premium, gift, unique, quality, elegant, stylish`,
            });
        }, 1500);
    });
};

export default function AIListingGenerator({ onListingCreated }) {
    const [productInfo, setProductInfo] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [generatedListing, setGeneratedListing] = useState(null);
    const [copiedField, setCopiedField] = useState(null);

    const handleGenerate = async () => {
        if (!productInfo) {
            toast.warning("Please enter a product name or keywords.");
            return;
        }
        setIsLoading(true);
        setGeneratedListing(null);
        try {
            const result = await generateListingWithAI(productInfo);
            setGeneratedListing(result);
            toast.success("Listing generated successfully!");
        } catch (error) {
            toast.error("Failed to generate listing.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const copyToClipboard = (text, fieldName) => {
        navigator.clipboard.writeText(text);
        setCopiedField(fieldName);
        setTimeout(() => setCopiedField(null), 2000);
    };

    return (
        <div className="space-y-4">
            <div>
                <Label htmlFor="product-info">Product Name or Keywords</Label>
                <Input
                    id="product-info"
                    placeholder="e.g., 'leather wallet' or 'blue cotton t-shirt'"
                    value={productInfo}
                    onChange={(e) => setProductInfo(e.target.value)}
                    disabled={isLoading}
                />
            </div>
            <Button onClick={handleGenerate} disabled={isLoading || !productInfo} className="w-full">
                {isLoading ? (
                    <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                    </>
                ) : (
                    <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Listing
                    </>
                )}
            </Button>

            {generatedListing && (
                <div className="space-y-4 pt-4 border-t">
                    <h3 className="font-semibold">Generated Content</h3>
                    <div className="space-y-2">
                        <Label>Title</Label>
                        <div className="relative">
                            <Input value={generatedListing.title} readOnly />
                             <Button size="icon" variant="ghost" className="absolute right-1 top-1 h-8 w-8" onClick={() => copyToClipboard(generatedListing.title, 'title')}>
                                {copiedField === 'title' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                            </Button>
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label>Description</Label>
                         <div className="relative">
                            <Textarea value={generatedListing.description} readOnly rows={6} className="bg-slate-50"/>
                             <Button size="icon" variant="ghost" className="absolute right-1 top-1 h-8 w-8" onClick={() => copyToClipboard(generatedListing.description, 'description')}>
                                {copiedField === 'description' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                            </Button>
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label>Tags</Label>
                         <div className="relative">
                            <Textarea value={generatedListing.tags} readOnly rows={2} className="bg-slate-50"/>
                            <Button size="icon" variant="ghost" className="absolute right-1 top-1 h-8 w-8" onClick={() => copyToClipboard(generatedListing.tags, 'tags')}>
                                {copiedField === 'tags' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                            </Button>
                        </div>
                    </div>
                    <Button variant="outline" className="w-full" onClick={() => toast.info("This would create the product in a real app.")}>
                        Create Product with this Content
                    </Button>
                </div>
            )}
        </div>
    );
}