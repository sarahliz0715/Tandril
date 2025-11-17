import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';

export default function MetricCard({ title, value, growth, icon: Icon, iconColor, timeRange, growthLabel = 'vs last period', isPercentage = false }) {
    const isPositiveGrowth = parseFloat(growth) >= 0;
    const growthColor = isPositiveGrowth ? 'text-green-600' : 'text-red-600';
    
    return (
        <Card className="bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">{title}</CardTitle>
                <Icon className={`h-5 w-5 ${iconColor}`} />
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-bold text-slate-900">{value}</div>
                <p className={`text-xs ${growthColor} flex items-center`}>
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {isPositiveGrowth ? '+' : ''}{growth}% {isPercentage ? growthLabel : `vs. last ${timeRange.replace('d', ' days')}`}
                </p>
            </CardContent>
        </Card>
    );
}