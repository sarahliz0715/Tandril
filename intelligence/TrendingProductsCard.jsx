import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Package, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function TrendingProductsCard({ data }) {
    const navigate = useNavigate();

    return (
        <Card className="flex flex-col h-full bg-white/80 backdrop-blur-sm border-slate-200/60 hover:shadow-xl transition-shadow">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <TrendingUp className="w-5 h-5 text-green-500" />
                            Trending Products
                        </CardTitle>
                        <p className="text-sm text-slate-500 mt-1">in "{data.category}"</p>
                    </div>
                    <Badge variant="outline">Confidence: {data.confidence_score || 'N/A'}</Badge>
                </div>
            </CardHeader>
            <CardContent className="flex-grow">
                <p className="text-sm text-slate-600 mb-4">{data.insights?.summary}</p>
                <div className="space-y-3">
                    {data.trending_products_data?.slice(0, 3).map((product, index) => (
                        <div key={index} className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 border border-slate-100">
                            <img src={product.image_url} alt={product.name} className="w-10 h-10 object-cover rounded-md" />
                            <div className="flex-1">
                                <p className="text-sm font-medium text-slate-800">{product.name}</p>
                                <p className="text-xs text-green-600">Trend Score: {product.trend_score}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
            <CardFooter>
                 <Button 
                    className="w-full bg-indigo-600 hover:bg-indigo-700" 
                    onClick={() => navigate(createPageUrl('Commands?prompt=' + encodeURIComponent(`Create a new product listing inspired by trending items in ${data.category}`)))}
                >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Create Inspired Listing
                </Button>
            </CardFooter>
        </Card>
    );
}