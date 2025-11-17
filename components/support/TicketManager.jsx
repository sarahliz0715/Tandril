import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { LifeBuoy, Send, Sparkles, Clock, User, Package } from 'lucide-react';
import { toast } from 'sonner';
import { SupportTicket } from '@/api/entities';
import { generateAIResponse } from '@/api/functions';

export default function TicketManager({ tickets, onRefresh, user }) {
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);
    const [filterStatus, setFilterStatus] = useState('open');

    const filteredTickets = tickets.filter(ticket => {
        if (filterStatus === 'open') {
            return ['new', 'open', 'pending_seller'].includes(ticket.status);
        }
        if (filterStatus === 'all') return true;
        return ticket.status === filterStatus;
    });

    const handleGenerateAIResponse = async (ticket) => {
        setIsGeneratingAI(true);
        try {
            const conversationHistory = ticket.conversation_thread?.map(msg => ({
                role: msg.sender === 'customer' ? 'user' : 'assistant',
                content: msg.message
            })) || [];

            const response = await generateAIResponse({ 
                message: ticket.message,
                context: {
                    customer_name: ticket.customer_name,
                    category: ticket.category,
                    sentiment: ticket.sentiment,
                    conversation_history: conversationHistory,
                    type: 'support_ticket'
                }
            });
            
            setReplyText(response.data.suggested_response);
            toast.success('AI response generated!');
        } catch (error) {
            console.error('Error generating AI response:', error);
            toast.error('Failed to generate AI response');
        } finally {
            setIsGeneratingAI(false);
        }
    };

    const handleSendReply = async () => {
        if (!replyText.trim()) {
            toast.error('Please enter a response');
            return;
        }

        try {
            const newThread = [
                ...(selectedTicket.conversation_thread || []),
                {
                    timestamp: new Date().toISOString(),
                    sender: 'seller',
                    message: replyText,
                    is_automated: false
                }
            ];

            await SupportTicket.update(selectedTicket.id, {
                status: 'pending_customer',
                conversation_thread: newThread
            });

            toast.success('Reply sent!');
            setSelectedTicket(null);
            setReplyText('');
            onRefresh();
        } catch (error) {
            console.error('Error sending reply:', error);
            toast.error('Failed to send reply');
        }
    };

    const handleResolveTicket = async (ticketId) => {
        try {
            await SupportTicket.update(ticketId, {
                status: 'resolved'
            });
            toast.success('Ticket marked as resolved!');
            onRefresh();
        } catch (error) {
            console.error('Error resolving ticket:', error);
            toast.error('Failed to resolve ticket');
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
            case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            default: return 'bg-slate-100 text-slate-800 border-slate-200';
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'new': return 'bg-blue-100 text-blue-800';
            case 'open': return 'bg-indigo-100 text-indigo-800';
            case 'pending_customer': return 'bg-purple-100 text-purple-800';
            case 'resolved': return 'bg-green-100 text-green-800';
            case 'closed': return 'bg-slate-100 text-slate-800';
            default: return 'bg-slate-100 text-slate-800';
        }
    };

    const getCategoryIcon = (category) => {
        switch (category) {
            case 'order_issue': return '📦';
            case 'product_question': return '❓';
            case 'shipping_inquiry': return '🚚';
            case 'return_request': return '↩️';
            case 'refund_request': return '💰';
            case 'complaint': return '⚠️';
            default: return '💬';
        }
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <LifeBuoy className="w-5 h-5 text-red-600" />
                            Support Tickets
                        </CardTitle>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="border rounded-md px-3 py-2 text-sm"
                        >
                            <option value="open">Open Tickets</option>
                            <option value="all">All Tickets</option>
                            <option value="new">New</option>
                            <option value="pending_customer">Pending Customer</option>
                            <option value="resolved">Resolved</option>
                            <option value="closed">Closed</option>
                        </select>
                    </div>
                </CardHeader>
                <CardContent>
                    {filteredTickets.length === 0 ? (
                        <div className="text-center py-12">
                            <LifeBuoy className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-500">No tickets found</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredTickets.map((ticket) => (
                                <div
                                    key={ticket.id}
                                    onClick={() => setSelectedTicket(ticket)}
                                    className="p-4 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 cursor-pointer transition-colors"
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-lg">{getCategoryIcon(ticket.category)}</span>
                                            <h4 className="font-semibold text-slate-900">{ticket.subject}</h4>
                                            <Badge className={getPriorityColor(ticket.priority)}>
                                                {ticket.priority}
                                            </Badge>
                                            <Badge className={getStatusColor(ticket.status)}>
                                                {ticket.status.replace('_', ' ')}
                                            </Badge>
                                        </div>
                                        <span className="text-xs text-slate-500">
                                            {new Date(ticket.created_date).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-700 line-clamp-2 mb-2">{ticket.message}</p>
                                    <div className="flex items-center gap-3 text-xs text-slate-500">
                                        <span className="flex items-center gap-1">
                                            <User className="w-3 h-3" />
                                            {ticket.customer_name}
                                        </span>
                                        <span>📧 {ticket.customer_email}</span>
                                        {ticket.order_id && (
                                            <span className="flex items-center gap-1">
                                                <Package className="w-3 h-3" />
                                                Order {ticket.order_id}
                                            </span>
                                        )}
                                        {ticket.conversation_thread && (
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {ticket.conversation_thread.length} messages
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Ticket Details Dialog */}
            <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {selectedTicket && getCategoryIcon(selectedTicket.category)}
                            {selectedTicket?.subject}
                        </DialogTitle>
                    </DialogHeader>
                    
                    {selectedTicket && (
                        <div className="space-y-4">
                            {/* Ticket Header */}
                            <div className="flex items-center gap-2 flex-wrap">
                                <Badge className={getPriorityColor(selectedTicket.priority)}>
                                    {selectedTicket.priority} priority
                                </Badge>
                                <Badge className={getStatusColor(selectedTicket.status)}>
                                    {selectedTicket.status.replace('_', ' ')}
                                </Badge>
                                <Badge variant="outline">{selectedTicket.category}</Badge>
                                {selectedTicket.sentiment && (
                                    <Badge variant="outline">Sentiment: {selectedTicket.sentiment}</Badge>
                                )}
                            </div>

                            {/* Customer Info */}
                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                        <span className="text-slate-600">Customer:</span>
                                        <span className="ml-2 font-medium">{selectedTicket.customer_name}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-600">Email:</span>
                                        <span className="ml-2 font-medium">{selectedTicket.customer_email}</span>
                                    </div>
                                    {selectedTicket.order_id && (
                                        <div>
                                            <span className="text-slate-600">Order ID:</span>
                                            <span className="ml-2 font-medium">{selectedTicket.order_id}</span>
                                        </div>
                                    )}
                                    {selectedTicket.platform && (
                                        <div>
                                            <span className="text-slate-600">Platform:</span>
                                            <span className="ml-2 font-medium">{selectedTicket.platform}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Conversation Thread */}
                            <div className="space-y-3">
                                <h4 className="font-semibold text-slate-900">Conversation:</h4>
                                
                                {/* Initial Message */}
                                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                    <div className="flex items-center gap-2 mb-2">
                                        <User className="w-4 h-4 text-blue-600" />
                                        <span className="text-sm font-semibold text-blue-900">
                                            {selectedTicket.customer_name}
                                        </span>
                                        <span className="text-xs text-blue-600">
                                            {new Date(selectedTicket.created_date).toLocaleString()}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-900">{selectedTicket.message}</p>
                                </div>

                                {/* Thread Messages */}
                                {selectedTicket.conversation_thread?.map((msg, idx) => (
                                    <div
                                        key={idx}
                                        className={`p-3 rounded-lg border ${
                                            msg.sender === 'customer'
                                                ? 'bg-blue-50 border-blue-200'
                                                : 'bg-green-50 border-green-200'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            <User className="w-4 h-4" />
                                            <span className="text-sm font-semibold">
                                                {msg.sender === 'customer' ? selectedTicket.customer_name : 'You'}
                                            </span>
                                            {msg.is_automated && (
                                                <Badge variant="outline" className="text-xs">
                                                    <Sparkles className="w-3 h-3 mr-1" />
                                                    AI
                                                </Badge>
                                            )}
                                            <span className="text-xs text-slate-500">
                                                {new Date(msg.timestamp).toLocaleString()}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-900">{msg.message}</p>
                                    </div>
                                ))}
                            </div>

                            {/* AI Suggested Actions */}
                            {selectedTicket.ai_suggested_actions && selectedTicket.ai_suggested_actions.length > 0 && (
                                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                                    <p className="text-sm font-semibold text-purple-900 mb-2 flex items-center gap-2">
                                        <Sparkles className="w-4 h-4" />
                                        AI Suggested Actions:
                                    </p>
                                    <ul className="space-y-1">
                                        {selectedTicket.ai_suggested_actions.map((action, idx) => (
                                            <li key={idx} className="text-sm text-purple-800">
                                                • {action.action}: {action.description}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Reply Form */}
                            {selectedTicket.status !== 'closed' && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-semibold text-slate-700">Your Response:</label>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleGenerateAIResponse(selectedTicket)}
                                            disabled={isGeneratingAI}
                                        >
                                            {isGeneratingAI ? (
                                                <>Generating...</>
                                            ) : (
                                                <>
                                                    <Sparkles className="w-3 h-3 mr-1" />
                                                    Generate AI Response
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                    <Textarea
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        placeholder="Write your response..."
                                        className="min-h-[100px]"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        {selectedTicket?.status !== 'resolved' && selectedTicket?.status !== 'closed' && (
                            <Button
                                variant="outline"
                                onClick={() => handleResolveTicket(selectedTicket.id)}
                            >
                                Mark as Resolved
                            </Button>
                        )}
                        <Button variant="outline" onClick={() => setSelectedTicket(null)}>
                            Close
                        </Button>
                        {selectedTicket?.status !== 'closed' && (
                            <Button onClick={handleSendReply} className="bg-indigo-600 hover:bg-indigo-700">
                                <Send className="w-4 h-4 mr-2" />
                                Send Reply
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}