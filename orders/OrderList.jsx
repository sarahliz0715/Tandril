import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
    Eye, MoreVertical, Package, Truck, CheckCircle, 
    Clock, AlertCircle, Star, MessageSquare 
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function OrderList({ orders, onOrderClick, onBulkAction }) {
    const [selectedOrders, setSelectedOrders] = useState(new Set());

    const toggleOrderSelection = (orderId) => {
        const newSelection = new Set(selectedOrders);
        if (newSelection.has(orderId)) {
            newSelection.delete(orderId);
        } else {
            newSelection.add(orderId);
        }
        setSelectedOrders(newSelection);
    };

    const selectAllOrders = () => {
        if (selectedOrders.size === orders.length) {
            setSelectedOrders(new Set());
        } else {
            setSelectedOrders(new Set(orders.map(o => o.id)));
        }
    };

    const getStatusBadge = (status) => {
        const variants = {
            pending: { variant: 'secondary', icon: Clock, color: 'text-orange-600' },
            processing: { variant: 'outline', icon: Package, color: 'text-blue-600' },
            shipped: { variant: 'outline', icon: Truck, color: 'text-purple-600' },
            delivered: { variant: 'default', icon: CheckCircle, color: 'text-green-600' },
            cancelled: { variant: 'destructive', icon: AlertCircle, color: 'text-red-600' },
            returned: { variant: 'secondary', icon: AlertCircle, color: 'text-gray-600' }
        };
        
        const config = variants[status] || variants.pending;
        const IconComponent = config.icon;
        
        return (
            <Badge variant={config.variant} className="flex items-center gap-1">
                <IconComponent className={`w-3 h-3 ${config.color}`} />
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
        );
    };

    const getPlatformBadge = (platform) => {
        const colors = {
            'Shopify': 'bg-green-100 text-green-800',
            'Amazon': 'bg-orange-100 text-orange-800',
            'Etsy': 'bg-red-100 text-red-800',
            'WooCommerce': 'bg-purple-100 text-purple-800',
            'Manual': 'bg-gray-100 text-gray-800'
        };
        
        return (
            <Badge variant="outline" className={colors[platform] || 'bg-gray-100 text-gray-800'}>
                {platform}
            </Badge>
        );
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const getOrderInsights = (order) => {
        const insights = [];
        
        // VIP Customer (high order value or multiple orders)
        if (order.total_price > 200) {
            insights.push({ type: 'vip', icon: Star, color: 'text-yellow-500', label: 'High Value' });
        }
        
        // Rush order (placed recently)
        const daysSinceOrder = Math.floor((Date.now() - new Date(order.order_date)) / (1000 * 60 * 60 * 24));
        if (daysSinceOrder <= 1 && order.status === 'pending') {
            insights.push({ type: 'rush', icon: AlertCircle, color: 'text-red-500', label: 'Rush Order' });
        }
        
        // Has customer messages (simulated)
        if (Math.random() > 0.7) {
            insights.push({ type: 'message', icon: MessageSquare, color: 'text-blue-500', label: 'Has Messages' });
        }
        
        return insights;
    };

    return (
        <div className="space-y-4">
            {/* Bulk Actions Bar */}
            {selectedOrders.size > 0 && (
                <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <span className="text-blue-800 font-medium">
                                {selectedOrders.size} order{selectedOrders.size !== 1 ? 's' : ''} selected
                            </span>
                            <div className="flex gap-2">
                                <Button size="sm" onClick={() => onBulkAction('mark_as_processing', Array.from(selectedOrders))}>
                                    Mark as Processing
                                </Button>
                                <Button size="sm" onClick={() => onBulkAction('mark_as_shipped', Array.from(selectedOrders))}>
                                    Mark as Shipped
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => onBulkAction('export', Array.from(selectedOrders))}>
                                    Export Selected
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Orders Table Header */}
            <Card>
                <CardContent className="p-0">
                    <div className="border-b border-slate-200">
                        <div className="grid grid-cols-12 gap-4 p-4 text-sm font-medium text-slate-600">
                            <div className="col-span-1 flex items-center">
                                <Checkbox
                                    checked={selectedOrders.size === orders.length && orders.length > 0}
                                    onCheckedChange={selectAllOrders}
                                    aria-label="Select all orders"
                                />
                            </div>
                            <div className="col-span-2">Order</div>
                            <div className="col-span-2">Customer</div>
                            <div className="col-span-2">Platform</div>
                            <div className="col-span-1">Status</div>
                            <div className="col-span-2">Date</div>
                            <div className="col-span-1">Total</div>
                            <div className="col-span-1">Actions</div>
                        </div>
                    </div>

                    {/* Orders List */}
                    <div className="divide-y divide-slate-200">
                        {orders.map((order) => {
                            const insights = getOrderInsights(order);
                            
                            return (
                                <div
                                    key={order.id}
                                    className="grid grid-cols-12 gap-4 p-4 hover:bg-slate-50 transition-colors cursor-pointer"
                                    onClick={() => onOrderClick(order)}
                                >
                                    <div className="col-span-1 flex items-center" onClick={(e) => e.stopPropagation()}>
                                        <Checkbox
                                            checked={selectedOrders.has(order.id)}
                                            onCheckedChange={() => toggleOrderSelection(order.id)}
                                            aria-label={`Select order ${order.order_id}`}
                                        />
                                    </div>
                                    
                                    <div className="col-span-2">
                                        <div className="font-medium text-slate-900">{order.order_id}</div>
                                        <div className="flex items-center gap-1 mt-1">
                                            {insights.map((insight, idx) => (
                                                <insight.icon 
                                                    key={idx} 
                                                    className={`w-3 h-3 ${insight.color}`}
                                                    title={insight.label}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    
                                    <div className="col-span-2">
                                        <div className="font-medium text-slate-900">{order.customer_name}</div>
                                        <div className="text-sm text-slate-500">{order.customer_email}</div>
                                    </div>
                                    
                                    <div className="col-span-2">
                                        {getPlatformBadge(order.platform)}
                                    </div>
                                    
                                    <div className="col-span-1">
                                        {getStatusBadge(order.status)}
                                    </div>
                                    
                                    <div className="col-span-2">
                                        <div className="text-slate-900">{formatDate(order.order_date)}</div>
                                    </div>
                                    
                                    <div className="col-span-1">
                                        <div className="font-medium text-slate-900">${order.total_price.toFixed(2)}</div>
                                    </div>
                                    
                                    <div className="col-span-1" onClick={(e) => e.stopPropagation()}>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon">
                                                    <MoreVertical className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => onOrderClick(order)}>
                                                    <Eye className="w-4 h-4 mr-2" />
                                                    View Details
                                                </DropdownMenuItem>
                                                <DropdownMenuItem>
                                                    <Package className="w-4 h-4 mr-2" />
                                                    Mark as Processing
                                                </DropdownMenuItem>
                                                <DropdownMenuItem>
                                                    <Truck className="w-4 h-4 mr-2" />
                                                    Mark as Shipped
                                                </DropdownMenuItem>
                                                <DropdownMenuItem>
                                                    <MessageSquare className="w-4 h-4 mr-2" />
                                                    Contact Customer
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {orders.length === 0 && (
                        <div className="text-center py-12">
                            <Package className="mx-auto h-12 w-12 text-slate-300" />
                            <h3 className="mt-2 text-sm font-medium text-slate-900">No orders found</h3>
                            <p className="mt-1 text-sm text-slate-500">
                                Try adjusting your filters or check back later.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}