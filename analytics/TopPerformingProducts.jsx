
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function TopPerformingProducts({ products, orders }) {
    const productSales = products.map(product => {
        const relatedOrderItems = orders.flatMap(order => 
            order.items?.filter(item => item.sku === product.sku) || []
        );
        const totalRevenue = relatedOrderItems.reduce((sum, item) => sum + item.price_per_item * item.quantity, 0);
        const unitsSold = relatedOrderItems.reduce((sum, item) => sum + item.quantity, 0);

        return { ...product, totalRevenue, unitsSold };
    }).sort((a, b) => b.totalRevenue - a.totalRevenue);

    return (
        <Card className="bg-white/80 backdrop-blur-sm shadow-lg">
            <CardHeader>
                <CardTitle>Top Performing Products</CardTitle>
                <CardDescription>By total revenue over the selected period.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead className="text-right">Units Sold</TableHead>
                            <TableHead className="text-right">Total Revenue</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {productSales.slice(0, 5).map(product => (
                            <TableRow key={product.id}>
                                <TableCell className="flex items-center gap-3">
                                    <img 
                                        src={product.image_url || 'https://placehold.co/40x40/e2e8f0/e2e8f0'} 
                                        alt={product.product_name} 
                                        className="w-10 h-10 object-cover rounded-md" 
                                    />
                                    <div>
                                        <p className="font-medium">{product.product_name}</p>
                                        <p className="text-xs text-slate-500">{product.sku}</p>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">{product.unitsSold.toLocaleString()}</TableCell>
                                <TableCell className="text-right font-medium">${product.totalRevenue.toLocaleString()}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
