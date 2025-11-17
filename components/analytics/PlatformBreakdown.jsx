import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

export default function PlatformBreakdown({ platforms, orders }) {

    const platformData = platforms.map(platform => {
        const platformOrders = orders.filter(order => order.platform === platform.name);
        return {
            name: platform.name,
            value: platformOrders.reduce((sum, order) => sum + order.total_price, 0)
        };
    }).filter(p => p.value > 0);

    const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f97316', '#ec4899'];

    return (
        <Card className="h-full bg-white/80 backdrop-blur-sm shadow-lg">
            <CardHeader>
                <CardTitle>Sales by Platform</CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={platformData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                            {platformData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}