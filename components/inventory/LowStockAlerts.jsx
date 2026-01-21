
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Package, Bot } from 'lucide-react';

export default function LowStockAlerts({ inventory, onCreateReorderPO }) {
    const lowStockItems = inventory
        .filter(item => item.status === 'low_stock')
        .sort((a, b) => a.total_stock - b.total_stock);

    return (
        <Card className="h-full bg-white/80 backdrop-blur-sm shadow-lg">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="w-6 h-6 text-orange-500" />
                        <CardTitle>Low Stock Alerts</CardTitle>
                    </div>
                    {lowStockItems.length > 0 && onCreateReorderPO && (
                        <Button size="sm" variant="outline" onClick={() => onCreateReorderPO(lowStockItems)}>
                            <Bot className="w-4 h-4 mr-2" />
                            Create Reorder PO
                        </Button>
                    )}
                </div>
                 <CardDescription>
                    {lowStockItems.length > 0 
                        ? `You have ${lowStockItems.length} items that need attention.`
                        : "All stock levels are healthy!"}
                </CardDescription>
            </CardHeader>
            <CardContent>
                {lowStockItems.length > 0 ? (
                    <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                        {lowStockItems.slice(0, 5).map(item => (
                            <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-orange-50 border border-orange-200">
                                <div className="flex items-center gap-3">
                                    <img 
                                        src={item.image_url || 'https://placehold.co/40x40/e2e8f0/e2e8f0'} 
                                        alt={item.product_name} 
                                        className="w-10 h-10 rounded-md object-cover" 
                                    />
                                    <div>
                                        <p className="font-medium text-sm">{item.product_name}</p>
                                        <p className="text-xs text-slate-500">SKU: {item.sku}</p>
                                    </div>
                                </div>
                                <div className="text-center">
                                    <p className="font-bold text-lg text-orange-600">{item.total_stock}</p>
                                    <p className="text-xs text-slate-500">units left</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <Package className="w-12 h-12 text-green-500 mx-auto" />
                        <p className="mt-4 font-medium text-slate-700">No low stock items.</p>
                        <p className="text-sm text-slate-500">Good job on keeping your inventory up!</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
