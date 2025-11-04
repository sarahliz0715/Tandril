import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Facebook, Instagram, Image as ImageIcon, Copy } from 'lucide-react';
import { toast } from 'sonner';

export default function GeneratedAdPreview({ ad, product }) {
    if (!ad || !product) {
        return (
            <Card className="flex items-center justify-center h-full border-dashed">
                <div className="text-center text-slate-500">
                    <ImageIcon className="mx-auto h-12 w-12" />
                    <p className="mt-2">Your generated ad will appear here.</p>
                </div>
            </Card>
        );
    }

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard!");
    };

    return (
        <Card className="bg-white/80 backdrop-blur-sm shadow-xl">
            <CardHeader>
                <CardTitle>AI Ad Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="aspect-video bg-slate-200 rounded-lg overflow-hidden flex items-center justify-center">
                    {ad.image_url ? (
                        <img src={ad.image_url} alt="Generated ad visual" className="w-full h-full object-cover" />
                    ) : (
                        <div className="text-slate-500 flex flex-col items-center">
                            <ImageIcon className="w-12 h-12" />
                            <p className="mt-2 text-sm">No image generated</p>
                        </div>
                    )}
                </div>

                <div className="p-4 rounded-lg border bg-white">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-200 rounded-full flex-shrink-0"></div>
                            <div>
                                <p className="font-bold text-sm">{product.product_name} Brand</p>
                                <p className="text-xs text-slate-500">Sponsored</p>
                            </div>
                        </div>
                        <div className="flex gap-1 text-slate-400">
                            <Facebook className="w-4 h-4" />
                            <Instagram className="w-4 h-4" />
                        </div>
                    </div>
                    
                    <div className="mt-3 space-y-2 text-sm">
                        <p>{ad.primary_text}</p>
                        <div className="p-3 rounded-md border">
                            <p className="uppercase text-xs text-slate-500 tracking-wider">YourWebsite.com</p>
                            <p className="font-semibold">{ad.headline}</p>
                            <p className="text-slate-600 text-xs">{ad.description}</p>
                        </div>
                    </div>
                    <div className="mt-3 flex justify-between items-center text-xs text-slate-500 font-medium">
                        <span>1.2k Likes</span>
                        <span>45 Comments</span>
                        <span>18 Shares</span>
                    </div>
                </div>

                <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Ad Copy</h4>
                    <div className="flex items-center justify-between p-2 border rounded-md bg-slate-50">
                        <p className="text-xs text-slate-700"><strong>Headline:</strong> {ad.headline}</p>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(ad.headline)}><Copy className="w-3 h-3" /></Button>
                    </div>
                    <div className="flex items-center justify-between p-2 border rounded-md bg-slate-50">
                        <p className="text-xs text-slate-700"><strong>Primary Text:</strong> {ad.primary_text}</p>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(ad.primary_text)}><Copy className="w-3 h-3" /></Button>
                    </div>
                </div>

                <div>
                    <h4 className="font-semibold text-sm mb-1">Targeting Suggestions</h4>
                    <div className="flex flex-wrap gap-2">
                        {ad.targeting_suggestions?.map((suggestion, index) => (
                            <Badge key={index} variant="outline">{suggestion}</Badge>
                        ))}
                    </div>
                </div>

                 <div className="flex justify-end gap-2">
                    <Button variant="outline">Save Creative</Button>
                    <Button>Launch Campaign</Button>
                </div>
            </CardContent>
        </Card>
    );
}