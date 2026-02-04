import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { 
    Truck, Package, Printer, CheckSquare, 
    MapPin, User, Calendar, Download 
} from 'lucide-react';
import { toast } from 'sonner';
import { Order } from '@/lib/entities';

export default function FulfillmentCenter({ orders, orderItems, onRefresh }) {
    const [selectedOrders, setSelectedOrders] = useState(new Set());
    const [isProcessing, setIsProcessing] = useState(false);

    const handleSelectOrder = (orderId, checked) => {
        const newSelected = new Set(selectedOrders);
        if (checked) {
            newSelected.add(orderId);
        } else {
            newSelected.delete(orderId);
        }
        setSelectedOrders(newSelected);
    };

    const handleSelectAll = (checked) => {
        if (checked) {
            setSelectedOrders(new Set(orders.map(order => order.id)));
        } else {
            setSelectedOrders(new Set());
        }
    };

    const handleBatchShip = async () => {
        if (selectedOrders.size === 0) {
            toast.error('Please select orders to ship');
            return;
        }

        setIsProcessing(true);
        try {
            // Simulate batch processing
            await Promise.all(
                Array.from(selectedOrders).map(orderId =>
                    Order.update(orderId, { status: 'shipped' })
                )
            );
            
            toast.success(`${selectedOrders.size} orders marked as shipped`);
            setSelectedOrders(new Set());
            onRefresh();
        } catch (error) {
            toast.error('Failed to update orders');
        } finally {
            setIsProcessing(false);
        }
    };

    const handlePrintLabels = () => {
        if (selectedOrders.size === 0) {
            toast.error('Please select orders to print labels for');
            return;
        }
        
        // Simulate printing
        toast.success(`Printing ${selectedOrders.size} shipping labels...`);
    };

    const getOrderItems = (orderId) => {
        return orderItems.filter(item => item.order_id_ref === orderId);
    };

    const formatAddress = (address) => {
        if (!address) return 'No address';
        return `${address.city}, ${address.state} ${address.zip}`;
    };

    if (orders.length === 0) {
        return (
            <Card>
                <CardContent className="text-center py-12">
                    <Package className="mx-auto w-12 h-12 text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No orders ready for fulfillment</h3>
                    <p className="text-gray-500">Orders in "processing" status will appear here when ready to ship.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Batch Actions */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Truck className="w-5 h-5" />
                        Fulfillment Actions
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <Button 
                            onClick={handlePrintLabels}
                            variant="outline"
                            disabled={selectedOrders.size === 0}
                        >
                            <Printer className="w-4 h-4 mr-2" />
                            Print Labels ({selectedOrders.size})
                        </Button>
                        <Button 
                            onClick={handleBatchShip}
                            disabled={selectedOrders.size === 0 || isProcessing}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            <Truck className="w-4 h-4 mr-2" />
                            {isProcessing ? 'Processing...' : `Mark as Shipped (${selectedOrders.size})`}
                        </Button>
                        <Button 
                            variant="outline"
                            disabled={selectedOrders.size === 0}
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Export to CSV
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Orders Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Orders Ready for Fulfillment ({orders.length})</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12">
                                    <Checkbox
                                        checked={orders.length > 0 && selectedOrders.size === orders.length}
                                        onCheckedChange={handleSelectAll}
                                    />
                                </TableHead>
                                <TableHead>Order</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead>Items</TableHead>
                                <TableHead>Shipping</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {orders.map((order) => {
                                const items = getOrderItems(order.order_id);
                                return (
                                    <TableRow key={order.id}>
                                        <TableCell>
                                            <Checkbox
                                                checked={selectedOrders.has(order.id)}
                                                onCheckedChange={(checked) => handleSelectOrder(order.id, checked)}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <div>
                                                <div className="font-medium">{order.order_id}</div>
                                                <Badge className="text-xs bg-blue-100 text-blue-800">
                                                    {order.platform}
                                                </Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div>
                                                <div className="font-medium flex items-center gap-2">
                                                    <User className="w-3 h-3" />
                                                    {order.customer_name}
                                                </div>
                                                <div className="text-sm text-gray-500 flex items-center gap-2">
                                                    <MapPin className="w-3 h-3" />
                                                    {formatAddress(order.shipping_address)}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-1">
                                                {items.slice(0, 2).map((item, index) => (
                                                    <div key={index} className="text-sm">
                                                        {item.quantity}x {item.product_name}
                                                    </div>
                                                ))}
                                                {items.length > 2 && (
                                                    <div className="text-xs text-gray-500">
                                                        +{items.length - 2} more items
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {order.shipping_method || 'Standard'}
                                        </TableCell>
                                        <TableCell className="text-sm text-gray-500">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-3 h-3" />
                                                {new Date(order.order_date).toLocaleDateString()}
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            ${order.total_price.toLocaleString()}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}