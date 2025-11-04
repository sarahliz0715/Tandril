import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Target, TrendingUp, Package, AlertTriangle } from 'lucide-react';

export default function PredictiveInsights({ orders, products, platforms }) {
    // Mock predictive insights
    const insights = [
        {
            icon: TrendingUp,
            title: "Forecast: Sales to increase 15% next month",
            description: "Seasonal trends and recent performance indicate strong upcoming growth, especially in your 'Apparel' category."
        },
        {
            icon: Package,
            title: "Reorder 'Classic Tee - Blue' within 5 days",
            description: "Sales velocity for this product is high. You risk a stock-out which could cost an estimated $1,200 in lost sales."
        },
        {
            icon: Target,
            title: "Opportunity: Target 'eco-friendly' keyword",
            description: "This keyword is trending on Google with low competition. Optimizing your sustainable products for this term could capture new customers."
        }
    ];

    return (
        <Card className="bg-white/80 backdrop-blur-sm shadow-lg">
            <CardHeader>
                <CardTitle>AI Predictive Insights</CardTitle>
                <CardDescription>Actionable forecasts and opportunities identified by AI.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded-lg mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    <p className="text-xs">Insights are based on demo data models.</p>
                </div>
                <div className="space-y-4">
                    {insights.map((insight, index) => (
                        <div key={index} className="flex items-start gap-4 p-3 bg-slate-50 rounded-lg">
                            <insight.icon className="w-6 h-6 text-indigo-500 mt-1 flex-shrink-0" />
                            <div>
                                <h4 className="font-semibold text-slate-800">{insight.title}</h4>
                                <p className="text-sm text-slate-600">{insight.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}