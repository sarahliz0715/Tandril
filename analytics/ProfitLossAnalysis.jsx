import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

export default function ProfitLossAnalysis({ orders, products, timeRange }) {
    // This is a placeholder since we don't have cost data.
    // In a real scenario, this would use product.base_price (COGS)
    const mockData = [
        { name: 'Revenue', value: orders.reduce((s, o) => s + o.total_price, 0) },
        { name: 'COGS', value: orders.reduce((s, o) => s + o.total_price, 0) * 0.45 }, // Mock COGS at 45%
        { name: 'Gross Profit', value: orders.reduce((s, o) => s + o.total_price, 0) * 0.55 },
        { name: 'Marketing', value: 3200 },
        { name: 'Shipping', value: 7800 },
        { name: 'Net Profit', value: orders.reduce((s, o) => s + o.total_price, 0) * 0.55 - 3200 - 7800 },
    ];
    
    return (
        <Card className="bg-white/80 backdrop-blur-sm shadow-lg">
            <CardHeader>
                <CardTitle>Profit & Loss (P&L) Analysis</CardTitle>
                <CardDescription>A high-level overview of profitability.</CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded-lg mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    <p className="text-xs">COGS and operational costs are estimated for this demo.</p>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={mockData} layout="vertical">
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                        <Bar dataKey="value" fill="#3b82f6" label={{ position: 'right', formatter: (value) => `$${value.toLocaleString()}` }} />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}