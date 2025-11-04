import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Sparkles,
    Star,
    Download,
    Clock,
    TrendingUp,
    Zap
} from 'lucide-react';

export default function AutomationTemplateCard({ template, onUse, showTrending = false }) {
    const getDifficultyColor = (difficulty) => {
        const colors = {
            beginner: 'bg-green-100 text-green-800',
            intermediate: 'bg-yellow-100 text-yellow-800',
            advanced: 'bg-red-100 text-red-800'
        };
        return colors[difficulty] || 'bg-slate-100 text-slate-800';
    };

    const getCategoryColor = (category) => {
        const colors = {
            inventory: 'bg-blue-100 text-blue-800',
            marketing: 'bg-purple-100 text-purple-800',
            customer_service: 'bg-green-100 text-green-800',
            analytics: 'bg-orange-100 text-orange-800',
            operations: 'bg-indigo-100 text-indigo-800',
            general: 'bg-slate-100 text-slate-800'
        };
        return colors[category] || 'bg-slate-100 text-slate-800';
    };

    return (
        <Card className="hover:shadow-lg transition-all border-slate-200">
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <CardTitle className="flex items-center gap-2 text-lg mb-2">
                            <Zap className="w-5 h-5 text-indigo-600" />
                            {template.name}
                        </CardTitle>
                        <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={getCategoryColor(template.category)}>
                                {template.category}
                            </Badge>
                            <Badge className={getDifficultyColor(template.difficulty)}>
                                {template.difficulty}
                            </Badge>
                            {template.is_featured && (
                                <Badge className="bg-yellow-100 text-yellow-800">
                                    <Star className="w-3 h-3 mr-1" />
                                    Featured
                                </Badge>
                            )}
                            {showTrending && (
                                <Badge className="bg-orange-100 text-orange-800">
                                    <TrendingUp className="w-3 h-3 mr-1" />
                                    Trending
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-sm text-slate-600 line-clamp-3">
                    {template.description}
                </p>

                {/* Time Saved */}
                {template.estimated_time_saved_hours_per_week && (
                    <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-green-600" />
                        <span className="text-slate-700">
                            Saves ~{template.estimated_time_saved_hours_per_week}h/week
                        </span>
                    </div>
                )}

                {/* Stats */}
                <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                        <Download className="w-3 h-3" />
                        {template.use_count || 0} installs
                    </span>
                    {template.rating && (
                        <span className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                            {template.rating.toFixed(1)}
                        </span>
                    )}
                </div>

                {/* Action Button */}
                <Button
                    onClick={onUse}
                    className="w-full bg-indigo-600 hover:bg-indigo-700"
                    size="sm"
                >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Use This Template
                </Button>
            </CardContent>
        </Card>
    );
}