import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { CustomerMessage } from '@/api/entities';
import { SupportTicket } from '@/api/entities';
import { Review } from '@/api/entities';
import { User } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Star, LifeBuoy, Filter, Search, Sparkles, CheckCircle, Clock, AlertTriangle, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import MessageInbox from '../components/support/MessageInbox';
import ReviewManager from '../components/support/ReviewManager';
import TicketManager from '../components/support/TicketManager';
import SupportAnalytics from '../components/support/SupportAnalytics';
import AutoResponseSettings from '../components/support/AutoResponseSettings';
import { handleAuthError } from '../components/utils/authHelpers';

export default function CustomerSupport() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('messages');
    const [messages, setMessages] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState({
        unreadMessages: 0,
        pendingReviews: 0,
        openTickets: 0,
        avgResponseTime: 0,
        satisfactionScore: 0
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const currentUser = await User.me();
            setUser(currentUser);

            const [messagesData, reviewsData, ticketsData] = await Promise.all([
                CustomerMessage.list('-created_date', 50),
                Review.list('-review_date', 50),
                SupportTicket.list('-created_date', 50)
            ]);

            setMessages(messagesData);
            setReviews(reviewsData);
            setTickets(ticketsData);

            // Calculate stats
            const unreadMessages = messagesData.filter(m => m.status === 'new').length;
            const pendingReviews = reviewsData.filter(r => !r.has_responded && r.rating <= 3).length;
            const openTickets = ticketsData.filter(t => ['new', 'open', 'pending_seller'].includes(t.status)).length;

            const resolvedTickets = ticketsData.filter(t => t.resolution_time_hours);
            const avgResponseTime = resolvedTickets.length > 0
                ? resolvedTickets.reduce((sum, t) => sum + t.resolution_time_hours, 0) / resolvedTickets.length
                : 0;

            const ratedTickets = ticketsData.filter(t => t.customer_satisfaction_rating);
            const satisfactionScore = ratedTickets.length > 0
                ? ratedTickets.reduce((sum, t) => sum + t.customer_satisfaction_rating, 0) / ratedTickets.length
                : 0;

            setStats({
                unreadMessages,
                pendingReviews,
                openTickets,
                avgResponseTime: Math.round(avgResponseTime * 10) / 10,
                satisfactionScore: Math.round(satisfactionScore * 10) / 10
            });

        } catch (error) {
            console.error('Error loading support data:', error);
            if (handleAuthError(error, navigate)) return;
            toast.error('Failed to load customer support data');
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <MessageSquare className="w-12 h-12 text-indigo-600 animate-pulse mx-auto mb-4" />
                    <p className="text-slate-600">Loading customer support...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-6 space-y-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Customer Support</h1>
                        <p className="text-slate-600 mt-1">AI-powered support automation & management</p>
                    </div>
                    <Button className="bg-indigo-600 hover:bg-indigo-700">
                        <Sparkles className="w-4 h-4 mr-2" />
                        AI Settings
                    </Button>
                </div>

                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-600">Unread Messages</p>
                                    <p className="text-3xl font-bold text-slate-900">{stats.unreadMessages}</p>
                                </div>
                                <MessageSquare className="w-8 h-8 text-blue-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-600">Pending Reviews</p>
                                    <p className="text-3xl font-bold text-slate-900">{stats.pendingReviews}</p>
                                </div>
                                <Star className="w-8 h-8 text-amber-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-600">Open Tickets</p>
                                    <p className="text-3xl font-bold text-slate-900">{stats.openTickets}</p>
                                </div>
                                <LifeBuoy className="w-8 h-8 text-red-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-600">Avg Response</p>
                                    <p className="text-3xl font-bold text-slate-900">{stats.avgResponseTime}h</p>
                                </div>
                                <Clock className="w-8 h-8 text-indigo-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-600">Satisfaction</p>
                                    <p className="text-3xl font-bold text-slate-900">{stats.satisfactionScore}/5</p>
                                </div>
                                <TrendingUp className="w-8 h-8 text-green-500" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList className="grid w-full grid-cols-5">
                        <TabsTrigger value="messages" className="gap-2">
                            <MessageSquare className="w-4 h-4" />
                            Messages
                            {stats.unreadMessages > 0 && (
                                <Badge variant="destructive" className="ml-2">{stats.unreadMessages}</Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="reviews" className="gap-2">
                            <Star className="w-4 h-4" />
                            Reviews
                            {stats.pendingReviews > 0 && (
                                <Badge variant="destructive" className="ml-2">{stats.pendingReviews}</Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="tickets" className="gap-2">
                            <LifeBuoy className="w-4 h-4" />
                            Tickets
                            {stats.openTickets > 0 && (
                                <Badge variant="destructive" className="ml-2">{stats.openTickets}</Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="analytics" className="gap-2">
                            <TrendingUp className="w-4 h-4" />
                            Analytics
                        </TabsTrigger>
                        <TabsTrigger value="settings" className="gap-2">
                            <Sparkles className="w-4 h-4" />
                            AI Settings
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="messages" className="space-y-4">
                        <MessageInbox messages={messages} onRefresh={loadData} user={user} />
                    </TabsContent>

                    <TabsContent value="reviews" className="space-y-4">
                        <ReviewManager reviews={reviews} onRefresh={loadData} user={user} />
                    </TabsContent>

                    <TabsContent value="tickets" className="space-y-4">
                        <TicketManager tickets={tickets} onRefresh={loadData} user={user} />
                    </TabsContent>

                    <TabsContent value="analytics" className="space-y-4">
                        <SupportAnalytics 
                            messages={messages} 
                            reviews={reviews} 
                            tickets={tickets} 
                            stats={stats}
                        />
                    </TabsContent>

                    <TabsContent value="settings" className="space-y-4">
                        <AutoResponseSettings user={user} onUpdate={loadData} />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}