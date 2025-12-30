import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
    Bot, 
    ThumbsUp, 
    ThumbsDown, 
    Copy, 
    Send, 
    Edit2, 
    Sparkles,
    CheckCircle,
    Info,
    Lightbulb
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/api/apiClient';

export default function AIResponseSuggestion({ 
    suggestion, 
    context,
    onUseSuggestion,
    onRegenerateWithFeedback 
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [editedResponse, setEditedResponse] = useState(suggestion.suggested_response);
    const [feedbackGiven, setFeedbackGiven] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(editedResponse);
        toast.success('Response copied to clipboard');
    };

    const handleFeedback = async (feedbackType) => {
        setIsSaving(true);
        try {
            await api.functions.invoke('saveResponseFeedback', {
                response_id: context.response_id,
                response_type: context.response_type,
                feedback_type: feedbackType,
                original_prompt: context.original_message,
                ai_response: suggestion.suggested_response,
                user_edited_response: editedResponse !== suggestion.suggested_response ? editedResponse : null,
                context: {
                    customer_email: context.customer_email,
                    product_id: context.product_id,
                    product_name: context.product_name,
                    category: context.category,
                    sentiment: context.sentiment,
                    rating: context.rating
                },
                response_was_used: false
            });

            setFeedbackGiven(feedbackType);
            
            if (feedbackType === 'thumbs_up') {
                toast.success('Thanks for the feedback! 👍');
            } else {
                toast.info('Thanks for the feedback. Regenerating...', {
                    description: 'I\'ll try to provide a better response.'
                });
                // Trigger regeneration with negative feedback context
                if (onRegenerateWithFeedback) {
                    onRegenerateWithFeedback('The previous response wasn\'t suitable. Please try again with a different approach.');
                }
            }
        } catch (error) {
            console.error('Error saving feedback:', error);
            toast.error('Failed to save feedback');
        } finally {
            setIsSaving(false);
        }
    };

    const handleUseResponse = async () => {
        setIsSaving(true);
        try {
            // Save positive feedback since they're using it
            await api.functions.invoke('saveResponseFeedback', {
                response_id: context.response_id,
                response_type: context.response_type,
                feedback_type: 'thumbs_up',
                original_prompt: context.original_message,
                ai_response: suggestion.suggested_response,
                user_edited_response: editedResponse !== suggestion.suggested_response ? editedResponse : null,
                context: {
                    customer_email: context.customer_email,
                    product_id: context.product_id,
                    product_name: context.product_name,
                    category: context.category,
                    sentiment: context.sentiment,
                    rating: context.rating
                },
                response_was_used: true
            });

            // Call parent handler to actually send the response
            if (onUseSuggestion) {
                onUseSuggestion(editedResponse);
            }

            toast.success('Response sent!');
        } catch (error) {
            console.error('Error using response:', error);
            toast.error('Failed to send response');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50">
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Bot className="w-5 h-5 text-indigo-600" />
                        AI-Generated Response
                        <Badge className="bg-indigo-100 text-indigo-700 text-xs">
                            {suggestion.tone_used || 'friendly'}
                        </Badge>
                    </CardTitle>
                    
                    {!feedbackGiven && !isSaving && (
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleFeedback('thumbs_up')}
                                className="h-8 w-8 p-0 hover:bg-green-100 hover:text-green-600"
                            >
                                <ThumbsUp className="w-4 h-4" />
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleFeedback('thumbs_down')}
                                className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600"
                            >
                                <ThumbsDown className="w-4 h-4" />
                            </Button>
                        </div>
                    )}

                    {feedbackGiven && (
                        <Badge className={feedbackGiven === 'thumbs_up' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                            {feedbackGiven === 'thumbs_up' ? (
                                <>
                                    <ThumbsUp className="w-3 h-3 mr-1" />
                                    Helpful
                                </>
                            ) : (
                                <>
                                    <ThumbsDown className="w-3 h-3 mr-1" />
                                    Not Helpful
                                </>
                            )}
                        </Badge>
                    )}
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Context Indicators */}
                {suggestion.context_used && (
                    <div className="flex flex-wrap gap-2 text-xs">
                        {suggestion.context_used.has_past_successes && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Learning from past successes
                            </Badge>
                        )}
                        {suggestion.context_used.has_product_details && (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                <Info className="w-3 h-3 mr-1" />
                                Product details included
                            </Badge>
                        )}
                    </div>
                )}

                {/* Response Text */}
                {isEditing ? (
                    <Textarea
                        value={editedResponse}
                        onChange={(e) => setEditedResponse(e.target.value)}
                        className="min-h-[150px] text-sm"
                    />
                ) : (
                    <div className="bg-white rounded-lg p-4 border border-indigo-200">
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{editedResponse}</p>
                    </div>
                )}

                {/* Suggested Actions */}
                {suggestion.suggested_actions && suggestion.suggested_actions.length > 0 && (
                    <Alert className="bg-amber-50 border-amber-200">
                        <Lightbulb className="h-4 w-4 text-amber-600" />
                        <AlertDescription>
                            <strong className="text-amber-900">Recommended Actions:</strong>
                            <ul className="mt-2 space-y-1 text-sm text-amber-800">
                                {suggestion.suggested_actions.map((action, idx) => (
                                    <li key={idx} className="flex items-start gap-2">
                                        <span className="text-amber-600">•</span>
                                        <div>
                                            <strong>{action.action}:</strong> {action.description}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </AlertDescription>
                    </Alert>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                    <Button
                        onClick={() => setIsEditing(!isEditing)}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                    >
                        <Edit2 className="w-4 h-4 mr-2" />
                        {isEditing ? 'Preview' : 'Edit'}
                    </Button>
                    
                    <Button
                        onClick={handleCopy}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                    >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy
                    </Button>

                    <Button
                        onClick={handleUseResponse}
                        disabled={isSaving}
                        size="sm"
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                    >
                        {isSaving ? (
                            <>
                                <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                                Sending...
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4 mr-2" />
                                Use & Send
                            </>
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}