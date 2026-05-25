import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const demandColor = (level) => {
    if (!level) return 'bg-slate-100 text-slate-700';
    if (level.toLowerCase() === 'high') return 'bg-green-100 text-green-800';
    if (level.toLowerCase() === 'medium') return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
};

export default function TrendingProductsCard({ data }) {
    const navigate = useNavigate();
    const products = Array.isArray(data.content) ? data.content : [];

    return (
        <Card className="flex flex-col h-full bg-white/80 backdrop-blur-sm border-slate-200/60 hover:shadow-xl transition-shadow">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <TrendingUp className="w-5 h-5 text-green-500" />
                            Trending Products
                        </CardTitle>
                        <p className="text-sm text-slate-500 mt-1">in "{data.niche}"</p>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-grow space-y-3">
                {products.slice(0, 5).map((product, index) => (
                    <div key={index} className="p-3 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-slate-800">{product.name}</p>
                            {product.demand && (
                                <Badge className={demandColor(product.demand)}>{product.demand} demand</Badge>
                            )}
                        </div>
                        {product.price_range && (
                            <p className="text-xs text-slate-500">Price range: {product.price_range}</p>
                        )}
                        {product.trend_reason && (
                            <p className="text-xs text-slate-600">{product.trend_reason}</p>
                        )}
                        {product.seller_tip && (
                            <p className="text-xs text-emerald-700 font-medium">Tip: {product.seller_tip}</p>
                        )}
                    </div>
                ))}
                {products.length === 0 && (
                    <p className="text-sm text-slate-400 italic">No trending products data available.</p>
                )}
            </CardContent>
            <CardFooter>
                <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => navigate(createPageUrl('Commands?prompt=' + encodeURIComponent(`Create a new product listing inspired by trending items in ${data.niche}`)))}
                >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Create Inspired Listing
                </Button>
            </CardFooter>
        </Card>
    );
}
