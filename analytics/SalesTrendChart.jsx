import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

export default function SalesTrendChart({ orders = [], timeRange = '30d' }) {
    const aggregateData = () => {
        const formatters = {
            '7d': (date) => date.toLocaleDateString('en-US', { weekday: 'short' }),
            '30d': (date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            '90d': (date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            '365d': (date) => date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        };
        
        // Ensure we have a valid formatter
        const formatter = formatters[timeRange] || formatters['30d'];

        const aggregated = orders.reduce((acc, order) => {
            const date = new Date(order.order_date);
            const key = formatter(date);
            if (!acc[key]) {
                acc[key] = { name: key, revenue: 0, orders: 0, dateObj: date };
            }
            acc[key].revenue += order.total_price || 0;
            acc[key].orders += 1;
            return acc;
        }, {});

        return Object.values(aggregated).sort((a,b) => a.dateObj - b.dateObj);
    };

    const chartData = aggregateData();

    const formatCurrency = (value) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

    return (
        <Card className="h-full bg-white/80 backdrop-blur-sm shadow-lg">
            <CardHeader>
                <CardTitle>Sales Trends</CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis yAxisId="left" tickFormatter={formatCurrency} tick={{ fontSize: 12 }} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                        <Tooltip
                            contentStyle={{
                                background: "rgba(255, 255, 255, 0.8)",
                                backdropFilter: "blur(4px)",
                                border: "1px solid rgba(200, 200, 200, 0.5)",
                                borderRadius: "0.5rem"
                            }} 
                            formatter={(value, name) => name === 'revenue' ? formatCurrency(value) : value}
                        />
                        <Legend />
                        <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 6 }} name="Revenue" />
                        <Line yAxisId="right" type="monotone" dataKey="orders" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 6 }} name="Orders" />
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}