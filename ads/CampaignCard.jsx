import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { DollarSign, BarChart, Target, Users, Play, Pause, Edit, Trash2 } from 'lucide-react';

const platformColors = {
    facebook: 'bg-blue-100 text-blue-800 border-blue-200',
    instagram: 'bg-pink-100 text-pink-800 border-pink-200',
    google_ads: 'bg-red-100 text-red-800 border-red-200',
    tiktok: 'bg-black text-white border-gray-400',
};

const statusColors = {
    active: 'bg-green-100 text-green-800 border-green-200',
    paused: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    draft: 'bg-gray-100 text-gray-800 border-gray-200',
    completed: 'bg-blue-100 text-blue-800 border-blue-200',
};

export default function CampaignCard({ campaign }) {
    const { name, platform, status, budget, performance_metrics: metrics } = campaign;
    
    const budgetProgress = budget?.type === 'total' && metrics?.spend 
        ? (metrics.spend / budget.amount) * 100 
        : null;

    return (
        <Card className="flex flex-col h-full">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <CardTitle className="text-base font-semibold leading-tight">{name}</CardTitle>
                    <Badge className={`text-xs ${platformColors[platform] || 'bg-gray-200'}`}>{platform}</Badge>
                </div>
                <Badge variant="outline" className={`mt-2 w-fit ${statusColors[status] || 'bg-gray-200'}`}>{status}</Badge>
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        <div>
                            <div className="font-semibold">${(metrics?.spend || 0).toLocaleString()}</div>
                            <div className="text-xs text-muted-foreground">Spend</div>
                        </div>
                    </div>
                     <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-muted-foreground" />
                        <div>
                            <div className="font-semibold">{(metrics?.conversions || 0)}</div>
                            <div className="text-xs text-muted-foreground">Conversions</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <BarChart className="w-4 h-4 text-muted-foreground" />
                        <div>
                            <div className="font-semibold">{(metrics?.roas || 0).toFixed(2)}x</div>
                            <div className="text-xs text-muted-foreground">ROAS</div>
                        </div>
                    </div>
                     <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <div>
                            <div className="font-semibold">{(metrics?.clicks || 0).toLocaleString()}</div>
                            <div className="text-xs text-muted-foreground">Clicks</div>
                        </div>
                    </div>
                </div>
                
                {budgetProgress !== null && (
                    <div>
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>Budget</span>
                            <span>${budget.amount.toLocaleString()}</span>
                        </div>
                        <Progress value={budgetProgress} />
                    </div>
                )}
            </CardContent>
            <CardFooter className="flex justify-end gap-2 border-t pt-4">
                <Button variant="ghost" size="icon">
                    <Edit className="w-4 h-4" />
                </Button>
                {status === 'active' ? (
                    <Button variant="ghost" size="icon">
                        <Pause className="w-4 h-4" />
                    </Button>
                ) : (
                    <Button variant="ghost" size="icon">
                        <Play className="w-4 h-4" />
                    </Button>
                )}
                <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                </Button>
            </CardFooter>
        </Card>
    );
}