import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, Eye } from 'lucide-react';

export default function AdTemplateCard({ template }) {
    const { name, category, preview_image, rating, usage_count } = template;
    const preview = preview_image || `https://placehold.co/400x400?text=${name.replace(' ', '+')}`;
    
    return (
        <Card className="group overflow-hidden">
            <div className="relative">
                <img src={preview} alt={name} className="w-full h-48 object-cover transition-transform group-hover:scale-105 duration-300" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                <div className="absolute bottom-2 left-2">
                     <Badge className="text-xs bg-white/20 backdrop-blur-sm text-white border-white/30">{category}</Badge>
                </div>
            </div>
            <CardContent className="p-4">
                 <CardTitle className="text-base font-semibold truncate mb-2">{name}</CardTitle>
                 <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-500" />
                        <span>{rating || 'N/A'}</span>
                    </div>
                    <span>{usage_count || 0} uses</span>
                 </div>
            </CardContent>
            <CardFooter className="p-2 border-t">
                <Button variant="outline" className="w-full">
                    <Eye className="w-4 h-4 mr-2" />
                    Use Template
                </Button>
            </CardFooter>
        </Card>
    );
}