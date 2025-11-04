import React, { useState, useEffect } from 'react';
import { AICommand, User } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, ArrowRight, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function RecentCommands() {
    const [commands, setCommands] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const loadRecentCommands = async () => {
            try {
                await User.me(); // Auth check first
                const recentCommands = await AICommand.list('-created_date', 5);
                setCommands(recentCommands);
            } catch (error) {
                if (error.response?.status === 401) {
                    navigate(createPageUrl('Home'));
                } else {
                    console.error('Error loading recent commands:', error);
                }
            } finally {
                setIsLoading(false);
            }
        };

        loadRecentCommands();
    }, [navigate]);

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed': return 'bg-green-100 text-green-800';
            case 'failed': return 'bg-red-100 text-red-800';
            case 'executing': return 'bg-blue-100 text-blue-800';
            default: return 'bg-slate-100 text-slate-800';
        }
    };

    if (isLoading) {
        return (
            <Card className="bg-white/60 backdrop-blur-sm shadow-sm border-slate-200/60">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-indigo-600" />
                        Recent Commands
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="animate-pulse space-y-4">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-16 bg-slate-200 rounded"></div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-white/60 backdrop-blur-sm shadow-sm border-slate-200/60">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-indigo-600" />
                    Recent Commands
                </CardTitle>
                <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => navigate(createPageUrl('History'))}
                    className="text-indigo-600 hover:text-indigo-800"
                >
                    View All <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
            </CardHeader>
            <CardContent>
                {commands.length > 0 ? (
                    <div className="space-y-4">
                        {commands.map((command) => (
                            <div key={command.id} className="flex items-start justify-between p-3 bg-slate-50 rounded-lg">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-900 truncate">
                                        {command.command_text}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1">
                                        {formatDistanceToNow(new Date(command.created_date))} ago
                                    </p>
                                </div>
                                <Badge className={`${getStatusColor(command.status)} text-xs ml-3`}>
                                    {command.status}
                                </Badge>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-slate-500">
                        <Clock className="mx-auto h-8 w-8 mb-2" />
                        <p className="text-sm">No commands executed yet</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}