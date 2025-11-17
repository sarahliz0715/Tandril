import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Edit, Trash2, Copy } from 'lucide-react';

const formatColors = {
    image: 'bg-blue-100 text-blue-800',
    video: 'bg-purple-100 text-purple-800',
    carousel: 'bg-indigo-100 text-indigo-800',
    collection: 'bg-teal-100 text-teal-800',
    story: 'bg-pink-100 text-pink-800',
    reel: 'bg-rose-100 text-rose-800',
};

export default function AdCreativeCard({ creative }) {
    const { name, format, content } = creative;
    const previewImage = content?.media_urls?.[0] || 'https://placehold.co/400x300?text=Ad';
    
    return (
        <Card className="group overflow-hidden">
            <div className="relative">
                <img src={previewImage} alt={name} className="w-full h-40 object-cover" />
                <div className="absolute top-2 right-2">
                    <Badge className={`text-xs ${formatColors[format] || 'bg-gray-200'}`}>
                        {format}
                    </Badge>
                </div>
            </div>
            <CardHeader className="pt-4 pb-2">
                <CardTitle className="text-sm font-semibold truncate">{name}</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
                <p className="text-xs text-muted-foreground line-clamp-2">
                    {content?.primary_text || 'No description provided.'}
                </p>
            </CardContent>
            <CardFooter className="flex justify-end gap-1 p-2 border-t">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Eye className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Copy className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Edit className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                </Button>
            </CardFooter>
        </Card>
    );
}