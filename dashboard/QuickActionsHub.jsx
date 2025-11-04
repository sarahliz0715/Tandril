
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    Zap, Plus, Search, TrendingUp, Package, 
    MessageSquare, Target, Sparkles, Clock,
    BarChart3, ShoppingCart, Users
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { User } from '@/api/entities';

const ActionCard = ({ title, description, icon: Icon, onClick, variant = "default", badge = null }) => {
    const variants = {
        default: "bg-white hover:bg-slate-50 border-slate-200",
        primary: "bg-indigo-50 hover:bg-indigo-100 border-indigo-200", 
        success: "bg-green-50 hover:bg-green-100 border-green-200",
        warning: "bg-amber-50 hover:bg-amber-100 border-amber-200"
    };

    return (
        <Card 
            className={`cursor-pointer transition-all duration-200 hover:shadow-md ${variants[variant]} border group`}
            onClick={onClick}
        >
            <CardContent className="p-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-white/80 group-hover:bg-white transition-colors">
                        <Icon className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-slate-900 text-sm">{title}</h3>
                            {badge && (
                                <Badge variant="secondary" className="text-xs px-2 py-0.5">
                                    {badge}
                                </Badge>
                            )}
                        </div>
                        <p className="text-xs text-slate-600">{description}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default function QuickActionsHub({ products, orders, platforms }) {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const currentUser = await User.me();
                setUser(currentUser);
            } catch (error) {
                if (error.response?.status === 401) {
                    console.log('User not authenticated in QuickActionsHub');
                    navigate(createPageUrl('Home'));
                    return;
                }
                console.error('Error fetching user in QuickActionsHub:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchUser();
    }, [navigate]);

    if (loading || !user) {
        return null; // Don't render anything while loading or if user is not authenticated
    }

    const generateQuickActions = () => {
        const actions = [];

        // Core actions that are always available
        actions.push(
            {
                title: 'AI Command',
                description: 'Give Orion a natural language command',
                icon: Zap,
                variant: 'primary',
                action: () => navigate(createPageUrl('Commands'))
            },
            {
                title: 'Chat with Orion',
                description: 'Have a conversation with your AI advisor',
                icon: MessageSquare,
                variant: 'default',
                action: () => navigate(createPageUrl('AIAdvisor'))
            }
        );

        // Conditional actions based on data
        if (!platforms || platforms.length === 0) {
            actions.push({
                title: 'Connect Platform',
                description: 'Link your first store to get started',
                icon: Plus,
                variant: 'success',
                badge: 'Start Here',
                action: () => navigate(createPageUrl('Platforms'))
            });
        } else {
            actions.push({
                title: 'View Analytics',
                description: 'See your performance insights',
                icon: BarChart3,
                variant: 'default',
                action: () => navigate(createPageUrl('Analytics'))
            });
        }

        if (products && products.length > 0) {
            actions.push({
                title: 'Optimize SEO',
                description: 'Improve product visibility',
                icon: TrendingUp,
                variant: 'default',
                action: () => navigate(createPageUrl('Commands?prompt=' + encodeURIComponent('Optimize SEO for my top 5 products')))
            });
        } else {
            actions.push({
                title: 'Add Products',
                description: 'Start by adding your first products',
                icon: Package,
                variant: 'warning',
                action: () => navigate(createPageUrl('Inventory'))
            });
        }

        // Additional quick actions
        actions.push(
            {
                title: 'Check Inventory',
                description: 'Review stock levels and alerts',
                icon: Package,
                variant: 'default',
                action: () => navigate(createPageUrl('Inventory'))
            },
            {
                title: 'Smart Campaign',
                description: 'Create AI-powered marketing',
                icon: Target,
                variant: 'default',
                action: () => navigate(createPageUrl('Ads'))
            }
        );

        return actions.slice(0, 6); // Show max 6 actions
    };

    const quickActions = generateQuickActions();

    return (
        <Card className="bg-white/80 backdrop-blur-sm shadow-none border-none">
            <CardHeader className="p-0 pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 sm:gap-3 text-lg sm:text-xl">
                        <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
                        Quick Actions
                    </CardTitle>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {quickActions.map((action, index) => (
                        <ActionCard
                            key={index}
                            title={action.title}
                            description={action.description}
                            icon={action.icon}
                            onClick={action.action}
                            variant={action.variant}
                            badge={action.badge}
                        />
                    ))}
                </div>
                
                <div className="mt-4 pt-4 border-t border-slate-200">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => navigate(createPageUrl('Commands'))}
                        className="w-full"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Custom AI Command
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
