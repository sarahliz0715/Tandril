import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, TrendingUp, TrendingDown, Sparkles } from 'lucide-react';

export default function InventoryInsights({ inventory }) {
    // Mock insights based on inventory data
    const sortedByVelocity = [...inventory].sort((a, b) => b.sales_velocity - a.sales_velocity);
    const topPerformer = sortedByVelocity[0];
    const slowMover = inventory.find(p => p.sales_velocity < 2 && p.total_stock > 50);

    const insights = [];
    if (topPerformer) {
        insights.push({
            icon: TrendingUp,
            color: "text-green-500",
            title: "Top Performer",
            description: `${topPerformer.product_name} is flying off the shelves! Consider increasing stock.`,
            action: "Analyze Trend",
        });
    }
    if (slowMover) {
        insights.push({
            icon: TrendingDown,
            color: "text-red-500",
            title: "Slow-Moving Stock",
            description: `${slowMover.product_name} has high stock but low sales. A flash sale could help.`,
            action: "Create Sale",
        });
    }
     insights.push({
        icon: Sparkles,
        color: "text-blue-500",
        title: "Bundle Opportunity",
        description: `Customers often buy ${inventory[0]?.product_name} and ${inventory[1]?.product_name} together.`,
        action: "Create Bundle",
    });

    return (
        <Card className="h-full bg-white/80 backdrop-blur-sm shadow-lg">
            <CardHeader>
                <div className="flex items-center gap-3">
                    <Lightbulb className="w-6 h-6 text-yellow-500" />
                    <CardTitle>AI-Powered Insights</CardTitle>
                </div>
                <CardDescription>Opportunities identified from your inventory data.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {insights.slice(0, 3).map((insight, index) => (
                        <div key={index} className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                            <div className="flex items-start gap-3">
                                <insight.icon className={`w-5 h-5 mt-1 ${insight.color}`} />
                                <div>
                                    <h4 className="font-semibold text-sm">{insight.title}</h4>
                                    <p className="text-xs text-slate-600 mt-1 mb-2">{insight.description}</p>
                                    <Button size="sm" variant="outline">
                                        {insight.action}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}