import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
    User, Mail, Phone, MapPin, Package, DollarSign, 
    Calendar, Star, MessageSquare, TrendingUp, Clock, 
    Edit, MoreVertical 
} from 'lucide-react';

export default function CustomerProfilePanel({ customer, message }) {
    if (!customer || !message) {
        return (
            <Card className="h-fit">
                <CardContent className="p-6 text-center">
                    <User className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 mb-2">Select a Message</h3>
                    <p className="text-slate-500">Choose a message to view customer details and history</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="h-fit">
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Customer Profile</CardTitle>
                    <Button size="sm" variant="outline">
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                    </Button>
                </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
                {/* Customer Basic Info */}
                <div className="flex items-center gap-4">
                    <Avatar className="w-16 h-16">
                        <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xl">
                            {customer.name ? customer.name.charAt(0).toUpperCase() : '?'}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <h3 className="font-semibold text-lg text-slate-900">{customer.name}</h3>
                        <p className="text-slate-600 flex items-center gap-1">
                            <Mail className="w-4 h-4" />
                            {customer.email}
                        </p>
                        {customer.satisfaction_score && (
                            <div className="flex items-center gap-1 mt-1">
                                <Star className="w-4 h-4 text-yellow-500" />
                                <span className="text-sm text-slate-600">
                                    {customer.satisfaction_score}/100 satisfaction
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Customer Tags */}
                {customer.tags && customer.tags.length > 0 && (
                    <div>
                        <h4 className="text-sm font-medium text-slate-900 mb-2">Tags</h4>
                        <div className="flex flex-wrap gap-2">
                            {customer.tags.map((tag, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                    {tag}
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}

                {/* Purchase History */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-slate-50 rounded-lg">
                        <Package className="w-5 h-5 text-slate-600 mx-auto mb-1" />
                        <div className="text-xl font-bold text-slate-900">{customer.total_orders || 0}</div>
                        <div className="text-xs text-slate-600">Orders</div>
                    </div>
                    <div className="text-center p-3 bg-slate-50 rounded-lg">
                        <DollarSign className="w-5 h-5 text-slate-600 mx-auto mb-1" />
                        <div className="text-xl font-bold text-slate-900">
                            ${(customer.total_spent || 0).toFixed(0)}
                        </div>
                        <div className="text-xs text-slate-600">Spent</div>
                    </div>
                </div>

                {/* Communication Preferences */}
                <div>
                    <h4 className="text-sm font-medium text-slate-900 mb-3">Preferences</h4>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-600">Preferred Platform</span>
                            <Badge variant="outline">
                                {customer.preferred_platform || message.platform}
                            </Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-600">Communication Style</span>
                            <Badge variant="outline">
                                {customer.communication_style || 'Unknown'}
                            </Badge>
                        </div>
                        {customer.last_order_date && (
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-600">Last Order</span>
                                <span className="text-slate-900">
                                    {new Date(customer.last_order_date).toLocaleDateString()}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Current Message Context */}
                <div className="border-t pt-4">
                    <h4 className="text-sm font-medium text-slate-900 mb-3">Current Message</h4>
                    <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-slate-600">Type</span>
                            <Badge variant="outline">
                                {message.message_type?.replace('_', ' ')}
                            </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-slate-600">Priority</span>
                            <Badge className={
                                message.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                                message.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                                message.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                            }>
                                {message.priority}
                            </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-slate-600">Sentiment</span>
                            <span className={`font-medium ${
                                message.sentiment === 'positive' ? 'text-green-600' :
                                message.sentiment === 'negative' ? 'text-red-600' :
                                'text-slate-600'
                            }`}>
                                {message.sentiment}
                            </span>
                        </div>
                        {message.order_id && (
                            <div className="flex items-center justify-between">
                                <span className="text-slate-600">Related Order</span>
                                <span className="text-slate-900 font-medium">#{message.order_id}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="border-t pt-4">
                    <h4 className="text-sm font-medium text-slate-900 mb-3">Quick Actions</h4>
                    <div className="space-y-2">
                        <Button size="sm" variant="outline" className="w-full justify-start">
                            <MessageSquare className="w-4 h-4 mr-2" />
                            View Message History
                        </Button>
                        <Button size="sm" variant="outline" className="w-full justify-start">
                            <Package className="w-4 h-4 mr-2" />
                            View Orders
                        </Button>
                        <Button size="sm" variant="outline" className="w-full justify-start">
                            <Star className="w-4 h-4 mr-2" />
                            Add to VIP List
                        </Button>
                    </div>
                </div>

                {/* Internal Notes */}
                {customer.notes && (
                    <div className="border-t pt-4">
                        <h4 className="text-sm font-medium text-slate-900 mb-2">Internal Notes</h4>
                        <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                            {customer.notes}
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}