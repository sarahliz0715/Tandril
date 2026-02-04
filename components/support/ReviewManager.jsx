import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Star, Sparkles, Send, AlertTriangle, ThumbsUp } from 'lucide-react';
import { toast } from 'sonner';
import { Review } from '@/lib/entities';
import { generateAIResponse } from '@/lib/functions';

export default function ReviewManager({ reviews, onRefresh, user }) {
    const [selectedReview, setSelectedReview] = useState(null);
    const [responseText, setResponseText] = useState('');
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);
    const [filterRating, setFilterRating] = useState('all');

    const filteredReviews = reviews.filter(review => {
        if (filterRating === 'all') return true;
        if (filterRating === 'negative') return review.rating <= 2;
        if (filterRating === 'neutral') return review.rating === 3;
        if (filterRating === 'positive') return review.rating >= 4;
        return true;
    });

    const handleGenerateAIResponse = async (review) => {
        setIsGeneratingAI(true);
        try {
            const response = await generateAIResponse({ 
                message: review.review_text,
                context: {
                    customer_name: review.customer_name,
                    rating: review.rating,
                    product_name: review.product_name,
                    sentiment: review.sentiment,
                    type: 'review_response'
                }
            });
            
            setResponseText(response.data.suggested_response);
            toast.success('AI response generated!');
        } catch (error) {
            console.error('Error generating AI response:', error);
            toast.error('Failed to generate AI response');
        } finally {
            setIsGeneratingAI(false);
        }
    };

    const handleSendResponse = async () => {
        if (!responseText.trim()) {
            toast.error('Please enter a response');
            return;
        }

        try {
            await Review.update(selectedReview.id, {
                has_responded: true,
                response: responseText,
                response_date: new Date().toISOString()
            });

            toast.success('Response posted!');
            setSelectedReview(null);
            setResponseText('');
            onRefresh();
        } catch (error) {
            console.error('Error posting response:', error);
            toast.error('Failed to post response');
        }
    };

    const renderStars = (rating) => {
        return [...Array(5)].map((_, i) => (
            <Star
                key={i}
                className={`w-4 h-4 ${i < rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
            />
        ));
    };

    const getSentimentColor = (rating) => {
        if (rating >= 4) return 'bg-green-100 text-green-800 border-green-200';
        if (rating === 3) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        return 'bg-red-100 text-red-800 border-red-200';
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Star className="w-5 h-5 text-amber-500" />
                            Product Reviews
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            <select
                                value={filterRating}
                                onChange={(e) => setFilterRating(e.target.value)}
                                className="border rounded-md px-3 py-2 text-sm"
                            >
                                <option value="all">All Ratings</option>
                                <option value="positive">Positive (4-5★)</option>
                                <option value="neutral">Neutral (3★)</option>
                                <option value="negative">Negative (1-2★)</option>
                            </select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {filteredReviews.length === 0 ? (
                        <div className="text-center py-12">
                            <Star className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-500">No reviews found</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredReviews.map((review) => (
                                <div
                                    key={review.id}
                                    className={`p-4 rounded-lg border-2 transition-all ${
                                        review.requires_action ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50'
                                    }`}
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <h4 className="font-semibold text-slate-900">{review.customer_name}</h4>
                                                <div className="flex items-center gap-1">
                                                    {renderStars(review.rating)}
                                                </div>
                                                {review.is_verified_purchase && (
                                                    <Badge variant="outline" className="text-xs">
                                                        <ThumbsUp className="w-3 h-3 mr-1" />
                                                        Verified
                                                    </Badge>
                                                )}
                                                {review.requires_action && (
                                                    <Badge className="bg-red-100 text-red-800 border-red-200">
                                                        <AlertTriangle className="w-3 h-3 mr-1" />
                                                        Needs Action
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-sm font-medium text-slate-700 mb-2">{review.product_name}</p>
                                            <p className="text-slate-700">{review.review_text}</p>
                                            {review.photos && review.photos.length > 0 && (
                                                <div className="flex gap-2 mt-2">
                                                    {review.photos.map((photo, idx) => (
                                                        <img
                                                            key={idx}
                                                            src={photo}
                                                            alt="Review"
                                                            className="w-16 h-16 object-cover rounded"
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            <span>{new Date(review.review_date).toLocaleDateString()}</span>
                                            <span>•</span>
                                            <span>{review.platform}</span>
                                            {review.helpful_votes > 0 && (
                                                <>
                                                    <span>•</span>
                                                    <span>{review.helpful_votes} found helpful</span>
                                                </>
                                            )}
                                        </div>
                                        <Button
                                            size="sm"
                                            variant={review.has_responded ? 'outline' : 'default'}
                                            onClick={() => setSelectedReview(review)}
                                            className={!review.has_responded ? 'bg-indigo-600 hover:bg-indigo-700' : ''}
                                        >
                                            {review.has_responded ? 'View Response' : 'Respond'}
                                        </Button>
                                    </div>

                                    {review.has_responded && review.response && (
                                        <div className="mt-3 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                                            <p className="text-xs font-semibold text-indigo-900 mb-1">Your Response:</p>
                                            <p className="text-sm text-indigo-800">{review.response}</p>
                                            <p className="text-xs text-indigo-600 mt-1">
                                                {new Date(review.response_date).toLocaleDateString()}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Response Dialog */}
            <Dialog open={!!selectedReview} onOpenChange={() => setSelectedReview(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Respond to Review</DialogTitle>
                    </DialogHeader>
                    
                    {selectedReview && (
                        <div className="space-y-4">
                            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                                <div className="flex items-center gap-2 mb-2">
                                    <p className="font-semibold text-slate-900">{selectedReview.customer_name}</p>
                                    <div className="flex items-center gap-1">
                                        {renderStars(selectedReview.rating)}
                                    </div>
                                </div>
                                <p className="text-sm font-medium text-slate-700 mb-2">{selectedReview.product_name}</p>
                                <p className="text-slate-900">{selectedReview.review_text}</p>
                                
                                {selectedReview.requires_action && (
                                    <div className="mt-3 p-2 bg-amber-50 rounded border border-amber-200">
                                        <p className="text-xs font-semibold text-amber-900">
                                            Recommended Action: {selectedReview.action_type}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {selectedReview.ai_suggested_response && (
                                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                                    <p className="text-sm font-semibold text-purple-900 mb-2 flex items-center gap-2">
                                        <Sparkles className="w-4 h-4" />
                                        AI Suggested Response:
                                    </p>
                                    <p className="text-sm text-purple-800">{selectedReview.ai_suggested_response}</p>
                                </div>
                            )}

                            {!selectedReview.has_responded && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-semibold text-slate-700">Your Response:</label>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleGenerateAIResponse(selectedReview)}
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
                                        value={responseText}
                                        onChange={(e) => setResponseText(e.target.value)}
                                        placeholder="Write your response..."
                                        className="min-h-[120px]"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedReview(null)}>
                            Close
                        </Button>
                        {!selectedReview?.has_responded && (
                            <Button onClick={handleSendResponse} className="bg-indigo-600 hover:bg-indigo-700">
                                <Send className="w-4 h-4 mr-2" />
                                Post Response
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}