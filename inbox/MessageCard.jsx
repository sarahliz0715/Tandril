import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
    MessageSquare, Bot, Clock, AlertTriangle, CheckCircle, 
    Star, Mail, Package, RefreshCw, MoreVertical, Send, Sparkles, Loader2 
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import AIResponseSuggestion from '../support/AIResponseSuggestion';

const platformColors = {
    shopify: 'bg-green-100 text-green-800',
    etsy: 'bg-orange-100 text-orange-800',
    amazon_seller: 'bg-blue-100 text-blue-800',
    ebay: 'bg-yellow-100 text-yellow-800',
    facebook_shop: 'bg-blue-100 text-blue-800',
    instagram_shop: 'bg-purple-100 text-purple-800'
};

const priorityColors = {
    urgent: 'bg-red-100 text-red-800 border-red-200',
    high: 'bg-orange-100 text-orange-800 border-orange-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    low: 'bg-gray-100 text-gray-800 border-gray-200'
};

const sentimentColors = {
    positive: 'text-green-600',
    neutral: 'text-slate-600',
    negative: 'text-red-600',
    urgent: 'text-red-600'
};

const statusIcons = {
    new: Mail,
    ai_replied: Bot,
    manually_replied: MessageSquare,
    escalated: AlertTriangle,
    resolved: CheckCircle
};

export default function MessageCard({ message, onClick, isSelected = false, onReload }) {
    const StatusIcon = statusIcons[message.status] || Mail;
    const [showReplyModal, setShowReplyModal] = useState(false);
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);
    const [aiSuggestion, setAiSuggestion] = useState(null);
    const [manualReply, setManualReply] = useState('');
    const [isSending, setIsSending] = useState(false);
    
    const truncateMessage = (text, maxLength = 120) => {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    };

    const formatTimeAgo = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInMinutes = Math.floor((now - date) / (1000 * 60));
        
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
        if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
        return `${Math.floor(diffInMinutes / 1440)}d ago`;
    };

    const handleGenerateAIResponse = async () => {
        setIsGeneratingAI(true);
        setShowReplyModal(true);
        
        try {
            const { data } = await base44.functions.invoke('generateAIResponse', {
                message: message.original_message,
                context: {
                    response_id: message.id,
                    response_type: 'message',
                    customer_email: message.customer_email,
                    customer_name: message.customer_name,
                    platform: message.platform,
                    message_type: message.message_type,
                    category: message.message_type,
                    sentiment: message.sentiment,
                    product_name: message.product_mentioned,
                    original_message: message.original_message
                }
            });

            setAiSuggestion(data);
        } catch (error) {
            console.error('Error generating AI response:', error);
            toast.error('Failed to generate AI response');
        } finally {
            setIsGeneratingAI(false);
        }
    };

    const handleSendReply = async (responseText) => {
        setIsSending(true);
        try {
            // Update message status to manually replied
            await base44.entities.CustomerMessage.update(message.id, {
                status: 'manually_replied'
            });

            toast.success('Response sent successfully!');
            setShowReplyModal(false);
            if (onReload) onReload();
        } catch (error) {
            console.error('Error sending reply:', error);
            toast.error('Failed to send reply');
        } finally {
            setIsSending(false);
        }
    };

    return (
        <>
            <div 
                className={`p-4 hover:bg-slate-50 cursor-pointer transition-colors border-l-4 ${
                    isSelected 
                        ? 'bg-indigo-50 border-l-indigo-500' 
                        : message.status === 'new' 
                            ? 'border-l-blue-500' 
                            : 'border-l-transparent'
                }`}
                onClick={onClick}
            >
                <div className="flex items-start gap-3">
                    <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-slate-200 text-slate-700">
                            {message.customer_name ? message.customer_name.charAt(0).toUpperCase() : '?'}
                        </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-slate-900 truncate">
                                    {message.customer_name || 'Unknown Customer'}
                                </h4>
                                <Badge className={`text-xs ${platformColors[message.platform] || 'bg-gray-100 text-gray-800'}`}>
                                    {message.platform}
                                </Badge>
                            </div>
                            
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <span className={`text-xs ${sentimentColors[message.sentiment]}`}>
                                    {message.sentiment}
                                </span>
                                <StatusIcon className="w-4 h-4 text-slate-400" />
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-xs">
                                {message.message_type?.replace('_', ' ').toUpperCase()}
                            </Badge>
                            <Badge className={`text-xs ${priorityColors[message.priority]}`}>
                                {message.priority} priority
                            </Badge>
                            {message.order_id && (
                                <Badge variant="outline" className="text-xs">
                                    Order #{message.order_id}
                                </Badge>
                            )}
                        </div>
                        
                        <p className="text-sm text-slate-600 mb-2">
                            {truncateMessage(message.original_message)}
                        </p>
                        
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-500">
                                {formatTimeAgo(message.created_date)}
                            </span>
                            
                            <div className="flex items-center gap-2">
                                {message.status === 'new' && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleGenerateAIResponse();
                                        }}
                                        className="h-7 text-xs"
                                    >
                                        <Bot className="w-3 h-3 mr-1" />
                                        AI Reply
                                    </Button>
                                )}
                                
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button 
                                            size="sm" 
                                            variant="ghost"
                                            onClick={(e) => e.stopPropagation()}
                                            className="h-7 w-7 p-0"
                                        >
                                            <MoreVertical className="w-4 h-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={(e) => {
                                            e.stopPropagation();
                                            setShowReplyModal(true);
                                        }}>
                                            <MessageSquare className="w-4 h-4 mr-2" />
                                            Reply Manually
                                        </DropdownMenuItem>
                                        <DropdownMenuItem>
                                            <Star className="w-4 h-4 mr-2" />
                                            Mark Important
                                        </DropdownMenuItem>
                                        <DropdownMenuItem>
                                            <CheckCircle className="w-4 h-4 mr-2" />
                                            Mark Resolved
                                        </DropdownMenuItem>
                                        {message.order_id && (
                                            <DropdownMenuItem>
                                                <Package className="w-4 h-4 mr-2" />
                                                View Order
                                            </DropdownMenuItem>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                        
                        {message.ai_suggested_reply && !showReplyModal && (
                            <div className="mt-3 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                                <div className="flex items-center gap-2 mb-2">
                                    <Bot className="w-4 h-4 text-indigo-600" />
                                    <span className="text-sm font-medium text-indigo-900">AI Suggested Reply</span>
                                </div>
                                <p className="text-sm text-indigo-800">
                                    {truncateMessage(message.ai_suggested_reply, 100)}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Reply Modal */}
            <Dialog open={showReplyModal} onOpenChange={setShowReplyModal}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Reply to {message.customer_name}</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Original Message */}
                        <div className="bg-slate-50 rounded-lg p-4 border">
                            <p className="text-sm font-medium text-slate-700 mb-2">Customer Message:</p>
                            <p className="text-sm text-slate-600">{message.original_message}</p>
                        </div>

                        {/* AI Suggestion */}
                        {isGeneratingAI ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="text-center">
                                    <Sparkles className="w-8 h-8 text-indigo-600 animate-pulse mx-auto mb-2" />
                                    <p className="text-sm text-slate-600">Generating AI response...</p>
                                </div>
                            </div>
                        ) : aiSuggestion ? (
                            <AIResponseSuggestion
                                suggestion={aiSuggestion}
                                context={{
                                    response_id: message.id,
                                    response_type: 'message',
                                    customer_email: message.customer_email,
                                    customer_name: message.customer_name,
                                    platform: message.platform,
                                    category: message.message_type,
                                    sentiment: message.sentiment,
                                    product_mentioned: message.product_mentioned,
                                    original_message: message.original_message
                                }}
                                onUseSuggestion={handleSendReply}
                                onRegenerateWithFeedback={(feedback) => {
                                    setAiSuggestion(null);
                                    handleGenerateAIResponse();
                                }}
                            />
                        ) : (
                            <>
                                <div>
                                    <p className="text-sm font-medium text-slate-700 mb-2">Your Reply:</p>
                                    <Textarea
                                        value={manualReply}
                                        onChange={(e) => setManualReply(e.target.value)}
                                        placeholder="Type your response here..."
                                        className="min-h-[150px]"
                                    />
                                </div>

                                <Button
                                    onClick={handleGenerateAIResponse}
                                    variant="outline"
                                    className="w-full"
                                >
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    Generate AI Suggestion
                                </Button>
                            </>
                        )}
                    </div>

                    {!aiSuggestion && (
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowReplyModal(false)}>
                                Cancel
                            </Button>
                            <Button 
                                onClick={() => handleSendReply(manualReply)}
                                disabled={!manualReply.trim() || isSending}
                            >
                                {isSending ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4 mr-2" />
                                        Send Reply
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}