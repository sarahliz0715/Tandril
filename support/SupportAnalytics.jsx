import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, Clock, Star, MessageSquare } from 'lucide-react';

export default function SupportAnalytics({ messages, reviews, tickets, stats }) {
    // Calculate response time distribution
    const responseTimeRanges = {
        under1h: 0,
        '1-4h': 0,
        '4-24h': 0,
        over24h: 0
    };

    tickets.forEach(ticket => {
        if (ticket.resolution_time_hours) {
            if (ticket.resolution_time_hours < 1) responseTimeRanges.under1h++;
            else if (ticket.resolution_time_hours < 4) responseTimeRanges['1-4h']++;
            else if (ticket.resolution_time_hours < 24) responseTimeRanges['4-24h']++;
            else responseTimeRanges.over24h++;
        }
    });

    // Calculate sentiment distribution
    const sentimentCounts = {
        positive: messages.filter(m => m.sentiment === 'positive').length,
        neutral: messages.filter(m => m.sentiment === 'neutral').length,
        negative: messages.filter(m => m.sentiment === 'negative').length,
        urgent: messages.filter(m => m.sentiment === 'urgent').length
    };

    // Calculate review rating distribution
    const ratingDistribution = [1, 2, 3, 4, 5].map(rating => ({
        rating,
        count: reviews.filter(r => r.rating === rating).length
    }));

    const avgRating = reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

    // Category breakdown
    const categoryBreakdown = {};
    tickets.forEach(ticket => {
        categoryBreakdown[ticket.category] = (categoryBreakdown[ticket.category] || 0) + 1;
    });

    return (
        <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
                {/* Response Time Distribution */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Clock className="w-5 h-5 text-indigo-600" />
                            Response Time Distribution
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {Object.entries(responseTimeRanges).map(([range, count]) => {
                                const total = Object.values(responseTimeRanges).reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? (count / total) * 100 : 0;
                                return (
                                    <div key={range}>
                                        <div className="flex items-center justify-between text-sm mb-1">
                                            <span className="text-slate-700">{range}</span>
                                            <span className="font-semibold text-slate-900">{count}</span>
                                        </div>
                                        <div className="w-full bg-slate-200 rounded-full h-2">
                                            <div
                                                className="bg-indigo-600 rounded-full h-2 transition-all"
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* Sentiment Analysis */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <MessageSquare className="w-5 h-5 text-blue-600" />
                            Customer Sentiment
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {Object.entries(sentimentCounts).map(([sentiment, count]) => {
                                const total = Object.values(sentimentCounts).reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? (count / total) * 100 : 0;
                                const colors = {
                                    positive: 'bg-green-500',
                                    neutral: 'bg-slate-500',
                                    negative: 'bg-red-500',
                                    urgent: 'bg-orange-500'
                                };
                                return (
                                    <div key={sentiment}>
                                        <div className="flex items-center justify-between text-sm mb-1">
                                            <span className="text-slate-700 capitalize">{sentiment}</span>
                                            <span className="font-semibold text-slate-900">{count}</span>
                                        </div>
                                        <div className="w-full bg-slate-200 rounded-full h-2">
                                            <div
                                                className={`${colors[sentiment]} rounded-full h-2 transition-all`}
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* Review Rating Distribution */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Star className="w-5 h-5 text-amber-500" />
                            Review Rating Distribution
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="mb-4 text-center">
                            <p className="text-3xl font-bold text-slate-900">{avgRating.toFixed(1)}</p>
                            <p className="text-sm text-slate-600">Average Rating</p>
                        </div>
                        <div className="space-y-2">
                            {ratingDistribution.reverse().map(({ rating, count }) => {
                                const total = reviews.length;
                                const percentage = total > 0 ? (count / total) * 100 : 0;
                                return (
                                    <div key={rating} className="flex items-center gap-2">
                                        <span className="text-sm text-slate-700 w-12">{rating} ⭐</span>
                                        <div className="flex-1 bg-slate-200 rounded-full h-2">
                                            <div
                                                className="bg-amber-400 rounded-full h-2 transition-all"
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                        <span className="text-sm font-semibold text-slate-900 w-8 text-right">{count}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* Ticket Category Breakdown */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <BarChart3 className="w-5 h-5 text-purple-600" />
                            Support Categories
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {Object.entries(categoryBreakdown)
                                .sort(([, a], [, b]) => b - a)
                                .map(([category, count]) => {
                                    const total = Object.values(categoryBreakdown).reduce((a, b) => a + b, 0);
                                    const percentage = total > 0 ? (count / total) * 100 : 0;
                                    return (
                                        <div key={category}>
                                            <div className="flex items-center justify-between text-sm mb-1">
                                                <span className="text-slate-700">{category.replace('_', ' ')}</span>
                                                <span className="font-semibold text-slate-900">{count}</span>
                                            </div>
                                            <div className="w-full bg-slate-200 rounded-full h-2">
                                                <div
                                                    className="bg-purple-600 rounded-full h-2 transition-all"
                                                    style={{ width: `${percentage}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Key Insights */}
            <Card className="bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-200">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-indigo-600" />
                        Key Insights
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid md:grid-cols-3 gap-4">
                        <div className="p-4 bg-white rounded-lg">
                            <p className="text-sm text-slate-600 mb-1">Most Common Issue</p>
                            <p className="text-lg font-bold text-slate-900">
                                {Object.entries(categoryBreakdown).sort(([, a], [, b]) => b - a)[0]?.[0]?.replace('_', ' ') || 'N/A'}
                            </p>
                        </div>
                        <div className="p-4 bg-white rounded-lg">
                            <p className="text-sm text-slate-600 mb-1">Customer Satisfaction</p>
                            <p className="text-lg font-bold text-slate-900">{stats.satisfactionScore.toFixed(1)}/5.0</p>
                        </div>
                        <div className="p-4 bg-white rounded-lg">
                            <p className="text-sm text-slate-600 mb-1">Response Quality</p>
                            <p className="text-lg font-bold text-green-600">
                                {stats.avgResponseTime < 4 ? 'Excellent' : stats.avgResponseTime < 12 ? 'Good' : 'Needs Improvement'}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}