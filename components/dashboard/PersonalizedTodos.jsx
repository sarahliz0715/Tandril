
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    CheckCircle, Clock, AlertTriangle, Target, Plus, Sparkles, ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { User } from '@/lib/entities';

export default function PersonalizedTodos({ user, platforms, alerts, recommendations }) {
    const navigate = useNavigate();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                // This call verifies the user's session.
                // If successful, isAuthenticated is set to true.
                // The actual 'user' object for rendering content is expected via props.
                await User.me(); 
                setIsAuthenticated(true);
            } catch (error) {
                if (error.response?.status === 401) {
                    console.log('User not authenticated in PersonalizedTodos, redirecting to Home.');
                    navigate(createPageUrl('Home'));
                    return; // Prevent further execution if navigating away
                }
                console.error('Error checking authentication in PersonalizedTodos:', error);
            } finally {
                setLoading(false);
            }
        };
        checkAuth();
    }, [navigate]);

    if (loading || !isAuthenticated) {
        return null; // Don't render anything while loading or if user is not authenticated
    }
    
    const generateTodos = () => {
        const todos = [];

        if (!platforms || platforms.length === 0) {
            todos.push({
                icon: Sparkles, // Changed from Zap
                text: 'Connect your first store',
                action: () => navigate(createPageUrl('Platforms')),
                color: 'text-indigo-500'
            });
        }
        
        const criticalAlerts = alerts?.filter(a => (a.priority === 'urgent' || a.priority === 'high') && !a.is_dismissed);
        if (criticalAlerts && criticalAlerts.length > 0) {
            todos.push({
                icon: AlertTriangle,
                text: `Address ${criticalAlerts.length} critical alert(s)`,
                action: () => navigate(createPageUrl('Inbox')),
                color: 'text-red-500'
            });
        }

        const highImpactRecs = recommendations?.filter(r => (r.impact_level === 'High' || r.impact_level === 'Critical') && r.status === 'new');
        if (highImpactRecs && highImpactRecs.length > 0) {
            todos.push({
                icon: Target, // Changed from Lightbulb
                text: `Review ${highImpactRecs.length} high-impact growth opportunity`,
                action: () => navigate(createPageUrl('AIAdvisor')),
                color: 'text-amber-500'
            });
        }

        // Ensure user.onboarding_completed is available and true
        // The 'user' prop is expected to be passed and valid if isAuthenticated is true.
        if (user?.onboarding_completed && platforms?.length > 0 && todos.length < 3) {
            todos.push({
                icon: Clock, // Changed from Package
                text: 'Review your inventory health',
                action: () => navigate(createPageUrl('Inventory')),
                color: 'text-green-500'
            });
        }

        if (todos.length === 0) {
             return [{
                icon: CheckCircle, // Changed from Check
                text: "You're all caught up!",
                action: () => navigate(createPageUrl('Commands')),
                color: 'text-slate-500',
                isDone: true
            }];
        }

        return todos.slice(0, 3);
    };

    const todos = generateTodos();

    return (
        <Card className="bg-white/80 backdrop-blur-sm shadow-none border-none">
            <CardHeader className="p-0 pb-3">
                <CardTitle className="flex items-center gap-2 sm:gap-3 text-lg sm:text-xl">
                    <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                    Today's Focus
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <div className="space-y-3">
                    {todos.map((todo, index) => (
                        <div 
                            key={index}
                            className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                                todo.isDone 
                                ? 'bg-slate-50 border-slate-200' 
                                : 'bg-white hover:bg-slate-50 border-slate-200 cursor-pointer'
                            }`}
                            onClick={!todo.isDone ? todo.action : undefined}
                        >
                            <div className="flex items-center gap-3">
                                <todo.icon className={`w-5 h-5 ${todo.color}`} />
                                <span className={`text-sm font-medium ${todo.isDone ? 'text-slate-500' : 'text-slate-800'}`}>
                                    {todo.text}
                                </span>
                            </div>
                            {!todo.isDone && (
                                <ArrowRight className="w-4 h-4 text-slate-400" />
                            )}
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
