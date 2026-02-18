
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
    X, Package, User, MapPin, CreditCard, 
    Truck, MessageSquare, AlertTriangle, 
    DollarSign, Save 
} from 'lucide-react';
import { toast } from 'sonner';
import { Order } from '@/lib/entities';

const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-blue-100 text-blue-800',
    shipped: 'bg-indigo-100 text-indigo-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    returned: 'bg-orange-100 text-orange-800',
};

export default function OrderDetails({ order, orderItems, onClose, onUpdate }) {
    const [trackingNumber, setTrackingNumber] = useState(order.tracking_number || '');
    const [notes, setNotes] = useState(order.ai_notes || '');
    const [isUpdating, setIsUpdating] = useState(false);

    const handleStatusChange = async (newStatus) => {
        setIsUpdating(true);
        try {
            await Order.update(order.id, { status: newStatus });
            toast.success(`Order ${order.order_id} marked as ${newStatus}`);
            onUpdate();
        } catch (error) {
            toast.error('Failed to update order status');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleSaveTracking = async () => {
        setIsUpdating(true);
        try {
            await Order.update(order.id, { 
                tracking_number: trackingNumber,
                ai_notes: notes 
            });
            toast.success('Order details updated');
            onUpdate();
        } catch (error) {
            toast.error('Failed to update order details');
        } finally {
            setIsUpdating(false);
        }
    };

    const formatAddress = (address) => {
        if (!address) return 'No address provided';
        return `${address.street}, ${address.city}, ${address.state} ${address.zip}, ${address.country}`;
    };

    const subtotal = orderItems.reduce((sum, item) => sum + (item.price_per_item * item.quantity), 0);
    const shipping = order.total_price - subtotal;

    return (
        <Card className="h-fit sticky top-6">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Order {order.order_id}</CardTitle>
                <Button variant="ghost" size="icon" onClick={onClose}>
                    <X className="w-4 h-4" />
                </Button>
            </CardHeader>
            <CardContent className="space-y-6 max-h-[calc(100vh-12rem)] overflow-y-auto">
                {/* Status */}
                <div>
                    <Label className="text-sm font-medium">Status</Label>
                    <div className="mt-2">
                        <Badge className={`${statusColors[order.status]} text-sm`}>
                            {order.status}
                        </Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                        {order.status === 'pending' && (
                            <Button size="sm" onClick={() => handleStatusChange('processing')} disabled={isUpdating}>
                                <Package className="w-4 h-4 mr-2" />
                                Start Processing
                            </Button>
                        )}
                        {order.status === 'processing' && (
                            <Button size="sm" onClick={() => handleStatusChange('shipped')} disabled={isUpdating}>
                                <Truck className="w-4 h-4 mr-2" />
                                Mark as Shipped
                            </Button>
                        )}
                        {order.status === 'shipped' && (
                            <Button size="sm" onClick={() => handleStatusChange('delivered')} disabled={isUpdating}>
                                <Package className="w-4 h-4 mr-2" />
                                Mark as Delivered
                            </Button>
                        )}
                    </div>
                </div>

                <Separator />

                {/* Customer Info */}
                <div>
                    <Label className="text-sm font-medium flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Customer
                    </Label>
                    <div className="mt-2 space-y-1">
                        <p className="font-medium">{order.customer_name}</p>
                        <p className="text-sm text-gray-500">{order.customer_email}</p>
                    </div>
                </div>

                <Separator />

                {/* Shipping Address */}
                <div>
                    <Label className="text-sm font-medium flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Shipping Address
                    </Label>
                    <div className="mt-2">
                        <p className="text-sm">{formatAddress(order.shipping_address)}</p>
                        {order.shipping_method && (
                            <p className="text-xs text-gray-500 mt-1">Method: {order.shipping_method}</p>
                        )}
                    </div>
                </div>

                <Separator />

                {/* Order Items */}
                <div>
                    <Label className="text-sm font-medium">Order Items</Label>
                    <div className="mt-2 space-y-3">
                        {orderItems.map((item, index) => (
                            <div key={index} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                                <img 
                                    src={item.image_url || 'https://placehold.co/48x48/e2e8f0/e2e8f0'} 
                                    alt={item.product_name}
                                    className="w-12 h-12 object-cover rounded"
                                />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{item.product_name}</p>
                                    {item.sku && <p className="text-xs text-gray-500">SKU: {item.sku}</p>}
                                    <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                                </div>
                                <div className="text-sm font-medium">
                                    ${(item.price_per_item * item.quantity).toFixed(2)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <Separator />

                {/* Order Total */}
                <div>
                    <Label className="text-sm font-medium flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        Order Total
                    </Label>
                    <div className="mt-2 space-y-1 text-sm">
                        <div className="flex justify-between">
                            <span>Subtotal:</span>
                            <span>${subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Shipping:</span>
                            <span>${shipping.toFixed(2)}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-medium">
                            <span>Total:</span>
                            <span>${order.total_price.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                <Separator />

                {/* Tracking */}
                <div>
                    <Label className="text-sm font-medium">Tracking Number</Label>
                    <Input 
                        value={trackingNumber}
                        onChange={(e) => setTrackingNumber(e.target.value)}
                        placeholder="Enter tracking number..."
                        className="mt-2"
                    />
                </div>

                {/* Notes */}
                <div>
                    <Label className="text-sm font-medium">Order Notes</Label>
                    <Textarea 
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add notes about this order..."
                        className="mt-2"
                        rows={3}
                    />
                </div>

                {/* Save Button */}
                <Button 
                    onClick={handleSaveTracking} 
                    disabled={isUpdating}
                    className="w-full"
                >
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                </Button>

                {/* AI Notes */}
                {order.ai_notes && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-amber-800">AI Analysis</p>
                                <p className="text-sm text-amber-700 mt-1">{order.ai_notes}</p>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
