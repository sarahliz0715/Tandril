import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { MessageSquare, Send, Sparkles, Clock, CheckCircle, Search, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { CustomerMessage } from '@/api/entities';
import { generateAIResponse } from '@/api/functions';

export default function MessageInbox({ messages, onRefresh, user }) {
    const [selectedMessage, setSelectedMessage] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    const filteredMessages = messages.filter(msg => {
        const matchesSearch = !searchQuery || 
            msg.original_message.toLowerCase().includes(searchQuery.toLowerCase()) ||
            msg.customer_name.toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesFilter = filterStatus === 'all' || msg.status === filterStatus;
        
        return matchesSearch && matchesFilter;
    });

    const handleGenerateAIResponse = async (message) => {
        setIsGeneratingAI(true);
        try {
            const response = await generateAIResponse({ 
                message: message.original_message,
                context: {
                    customer_name: message.customer_name,
                    platform: message.platform,
                    message_type: message.message_type,
                    sentiment: message.sentiment
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
            await CustomerMessage.update(selectedMessage.id, {
                status: 'manually_replied',
                ai_suggested_reply: replyText
            });

            toast.success('Response sent!');
            setSelectedMessage(null);
            setReplyText('');
            onRefresh();
        } catch (error) {
            console.error('Error sending reply:', error);
            toast.error('Failed to send response');
        }
    };

    const getSentimentColor = (sentiment) => {
        switch (sentiment) {
            case 'positive': return 'bg-green-100 text-green-800 border-green-200';
            case 'negative': return 'bg-red-100 text-red-800 border-red-200';
            case 'urgent': return 'bg-red-200 text-red-900 border-red-300';
            default: return 'bg-slate-100 text-slate-800 border-slate-200';
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'new': return 'bg-blue-100 text-blue-800';
            case 'ai_replied': return 'bg-purple-100 text-purple-800';
            case 'manually_replied': return 'bg-green-100 text-green-800';
            case 'resolved': return 'bg-slate-100 text-slate-800';
            default: return 'bg-slate-100 text-slate-800';
        }
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-blue-600" />
                            Customer Messages
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            <Input
                                placeholder="Search messages..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-64"
                            />
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="border rounded-md px-3 py-2 text-sm"
                            >
                                <option value="all">All Status</option>
                                <option value="new">New</option>
                                <option value="ai_replied">AI Replied</option>
                                <option value="manually_replied">Manually Replied</option>
                                <option value="resolved">Resolved</option>
                            </select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {filteredMessages.length === 0 ? (
                        <div className="text-center py-12">
                            <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-500">No messages found</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredMessages.map((message) => (
                                <div
                                    key={message.id}
                                    onClick={() => setSelectedMessage(message)}
                                    className="p-4 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 cursor-pointer transition-colors"
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-semibold text-slate-900">{message.customer_name}</h4>
                                            <Badge className={getSentimentColor(message.sentiment)}>
                                                {message.sentiment}
                                            </Badge>
                                            <Badge className={getStatusColor(message.status)}>
                                                {message.status.replace('_', ' ')}
                                            </Badge>
                                        </div>
                                        <span className="text-xs text-slate-500">
                                            {new Date(message.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-700 line-clamp-2">{message.original_message}</p>
                                    <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
                                        <span>📧 {message.customer_email}</span>
                                        <span>🏷️ {message.message_type.replace('_', ' ')}</span>
                                        <span>🛍️ {message.platform}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Reply Dialog */}
            <Dialog open={!!selectedMessage} onOpenChange={() => setSelectedMessage(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Reply to {selectedMessage?.customer_name}</DialogTitle>
                    </DialogHeader>
                    
                    {selectedMessage && (
                        <div className="space-y-4">
                            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                                <p className="text-sm font-semibold text-slate-700 mb-2">Customer Message:</p>
                                <p className="text-slate-900">{selectedMessage.original_message}</p>
                                <div className="flex items-center gap-2 mt-3">
                                    <Badge className={getSentimentColor(selectedMessage.sentiment)}>
                                        {selectedMessage.sentiment}
                                    </Badge>
                                    <Badge variant="outline">{selectedMessage.message_type}</Badge>
                                </div>
                            </div>

                            {selectedMessage.ai_suggested_reply && (
                                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                                    <p className="text-sm font-semibold text-purple-900 mb-2 flex items-center gap-2">
                                        <Sparkles className="w-4 h-4" />
                                        AI Suggested Response:
                                    </p>
                                    <p className="text-sm text-purple-800">{selectedMessage.ai_suggested_reply}</p>
                                </div>
                            )}

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-semibold text-slate-700">Your Response:</label>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleGenerateAIResponse(selectedMessage)}
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
                                    className="min-h-[120px]"
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedMessage(null)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSendReply} className="bg-indigo-600 hover:bg-indigo-700">
                            <Send className="w-4 h-4 mr-2" />
                            Send Response
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}