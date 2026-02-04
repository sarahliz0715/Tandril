import React, { useState, useEffect } from 'react';
import { Platform, PlatformType, User } from '@/lib/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, ArrowRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function PlatformOverview() {
    const [platforms, setPlatforms] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const loadPlatforms = async () => {
            try {
                await User.me(); // Auth check first
                const userPlatforms = await Platform.list();
                setPlatforms(userPlatforms);
            } catch (error) {
                if (error.response?.status === 401) {
                    navigate(createPageUrl('Home'));
                } else {
                    console.error('Error loading platforms:', error);
                }
            } finally {
                setIsLoading(false);
            }
        };

        loadPlatforms();
    }, [navigate]);

    const getStatusColor = (status) => {
        switch (status) {
            case 'connected': return 'bg-green-100 text-green-800';
            case 'disconnected': return 'bg-red-100 text-red-800';
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-slate-100 text-slate-800';
        }
    };

    if (isLoading) {
        return (
            <Card className="bg-white/60 backdrop-blur-sm shadow-sm border-slate-200/60">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        Connected Platforms
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="animate-pulse space-y-4">
                        {[...Array(2)].map((_, i) => (
                            <div key={i} className="h-16 bg-slate-200 rounded"></div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-white/60 backdrop-blur-sm shadow-sm border-slate-200/60">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                    Connected Platforms
                </CardTitle>
                <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => navigate(createPageUrl('Platforms'))}
                    className="text-indigo-600 hover:text-indigo-800"
                >
                    Manage <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
            </CardHeader>
            <CardContent>
                {platforms.length > 0 ? (
                    <div className="space-y-3">
                        {platforms.slice(0, 4).map((platform) => (
                            <div key={platform.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="text-2xl">
                                        {platform.platform_type === 'shopify' && '🛍️'}
                                        {platform.platform_type === 'etsy' && '🎨'}
                                        {platform.platform_type === 'printful' && '👕'}
                                        {!['shopify', 'etsy', 'printful'].includes(platform.platform_type) && '🏪'}
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-900">{platform.name}</p>
                                        <p className="text-xs text-slate-500 capitalize">{platform.platform_type}</p>
                                    </div>
                                </div>
                                <Badge className={`${getStatusColor(platform.status)} text-xs`}>
                                    {platform.status}
                                </Badge>
                            </div>
                        ))}
                        {platforms.length > 4 && (
                            <p className="text-xs text-center text-slate-500 pt-2">
                                And {platforms.length - 4} more platforms
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <div className="text-4xl mb-3">🔌</div>
                        <p className="text-sm text-slate-600 mb-4">No platforms connected yet</p>
                        <Button 
                            size="sm" 
                            onClick={() => navigate(createPageUrl('Platforms'))}
                            className="bg-indigo-600 hover:bg-indigo-700"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Connect Platform
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}