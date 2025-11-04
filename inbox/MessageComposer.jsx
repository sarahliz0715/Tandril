import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Send, X, Bot, Paperclip, Smile } from 'lucide-react';

export default function MessageComposer({ onClose, onSend }) {
    const [messageData, setMessageData] = useState({
        customer_email: '',
        customer_name: '',
        platform: '',
        message_type: '',
        subject: '',
        message: '',
        priority: 'medium'
    });

    const [useAIHelp, setUseAIHelp] = useState(false);
    const [aiSuggestions, setAiSuggestions] = useState([]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSend(messageData);
    };

    const generateAISuggestions = () => {
        setUseAIHelp(true);
        // Mock AI suggestions
        const suggestions = [
            "Thank you for reaching out! I'm here to help with any questions you may have.",
            "I appreciate your business and want to ensure you have the best experience possible.",
            "Let me look into this right away and get back to you with a detailed response."
        ];
        setAiSuggestions(suggestions);
    };

    const insertSuggestion = (suggestion) => {
        setMessageData({ ...messageData, message: suggestion });
        setUseAIHelp(false);
    };

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Send className="w-5 h-5" />
                        Compose New Message
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Recipient Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-slate-700 mb-1 block">
                                Customer Email *
                            </label>
                            <Input
                                type="email"
                                placeholder="customer@email.com"
                                value={messageData.customer_email}
                                onChange={(e) => setMessageData({...messageData, customer_email: e.target.value})}
                                required
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-slate-700 mb-1 block">
                                Customer Name
                            </label>
                            <Input
                                placeholder="John Doe"
                                value={messageData.customer_name}
                                onChange={(e) => setMessageData({...messageData, customer_name: e.target.value})}
                            />
                        </div>
                    </div>

                    {/* Platform and Type */}
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="text-sm font-medium text-slate-700 mb-1 block">
                                Platform *
                            </label>
                            <Select value={messageData.platform} onValueChange={(value) => setMessageData({...messageData, platform: value})}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select platform" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="shopify">Shopify</SelectItem>
                                    <SelectItem value="etsy">Etsy</SelectItem>
                                    <SelectItem value="amazon_seller">Amazon</SelectItem>
                                    <SelectItem value="ebay">eBay</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-slate-700 mb-1 block">
                                Message Type
                            </label>
                            <Select value={messageData.message_type} onValueChange={(value) => setMessageData({...messageData, message_type: value})}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="general_inquiry">General Inquiry</SelectItem>
                                    <SelectItem value="order_inquiry">Order Inquiry</SelectItem>
                                    <SelectItem value="product_question">Product Question</SelectItem>
                                    <SelectItem value="return_request">Return Request</SelectItem>
                                    <SelectItem value="review_follow_up">Review Follow-up</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-slate-700 mb-1 block">
                                Priority
                            </label>
                            <Select value={messageData.priority} onValueChange={(value) => setMessageData({...messageData, priority: value})}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="low">Low</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                    <SelectItem value="urgent">Urgent</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Subject */}
                    <div>
                        <label className="text-sm font-medium text-slate-700 mb-1 block">
                            Subject
                        </label>
                        <Input
                            placeholder="Message subject"
                            value={messageData.subject}
                            onChange={(e) => setMessageData({...messageData, subject: e.target.value})}
                        />
                    </div>

                    {/* AI Assistance */}
                    {!useAIHelp ? (
                        <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                            <div className="flex items-center gap-2">
                                <Bot className="w-5 h-5 text-indigo-600" />
                                <span className="text-sm font-medium text-indigo-900">Need help writing your message?</span>
                            </div>
                            <Button size="sm" variant="outline" onClick={generateAISuggestions}>
                                Get AI Suggestions
                            </Button>
                        </div>
                    ) : (
                        <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-medium text-indigo-900">AI Suggestions</span>
                                <Button size="sm" variant="ghost" onClick={() => setUseAIHelp(false)}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                            <div className="space-y-2">
                                {aiSuggestions.map((suggestion, index) => (
                                    <button
                                        key={index}
                                        type="button"
                                        className="w-full text-left p-2 text-sm text-indigo-800 bg-white rounded border border-indigo-200 hover:bg-indigo-100 transition-colors"
                                        onClick={() => insertSuggestion(suggestion)}
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Message Content */}
                    <div>
                        <label className="text-sm font-medium text-slate-700 mb-1 block">
                            Message *
                        </label>
                        <Textarea
                            placeholder="Type your message here..."
                            value={messageData.message}
                            onChange={(e) => setMessageData({...messageData, message: e.target.value})}
                            rows={6}
                            required
                        />
                    </div>

                    {/* Message Tools */}
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Button type="button" size="sm" variant="ghost">
                            <Paperclip className="w-4 h-4 mr-1" />
                            Attach File
                        </Button>
                        <Button type="button" size="sm" variant="ghost">
                            <Smile className="w-4 h-4 mr-1" />
                            Emoji
                        </Button>
                    </div>
                </form>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" onClick={handleSubmit} className="bg-indigo-600 hover:bg-indigo-700">
                        <Send className="w-4 h-4 mr-2" />
                        Send Message
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}