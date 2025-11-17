
import React from 'react';
import { Card } from '@/components/ui/card';
import { DollarSign, AlertTriangle, Lightbulb, Bot, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const HubCard = ({ title, value, description, icon: Icon, iconColor, linkTo }) => {
    return (
        <Link to={linkTo} className="block group">
            <Card className="bg-white/80 backdrop-blur-sm h-full transition-all duration-200 hover:shadow-xl hover:border-indigo-300 border-slate-200 border">
                <div className="p-5">
                    <div className="flex items-center justify-between mb-4">
                        <div className={`p-2.5 rounded-lg ${iconColor}`}>
                            <Icon className="w-6 h-6 text-white" />
                        </div>
                         <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
                        <p className="text-sm font-semibold text-slate-700">{title}</p>
                        <p className="text-xs text-slate-500 mt-1">{description}</p>
                    </div>
                </div>
            </Card>
        </Link>
    );
};

export default function AIHub({ stats }) {
    const formatSeconds = (seconds) => {
        if (!seconds || seconds < 3600) return "Just getting started!";
        const hours = Math.floor(seconds / 3600);
        return `${hours} hour${hours > 1 ? 's' : ''}`;
      };

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <HubCard 
                title="Recent Sales Activity"
                value={`$${stats.recentRevenue.toLocaleString()}`}
                description={`From ${stats.recentOrders} new orders`}
                icon={DollarSign}
                iconColor="bg-green-500"
                linkTo={createPageUrl('Orders')}
            />
            <HubCard 
                title="Critical Insights"
                value={`${stats.criticalAlerts} Alerts`}
                description="Urgent issues needing review"
                icon={AlertTriangle}
                iconColor="bg-red-500"
                linkTo={createPageUrl('Inbox')}
            />
            <HubCard 
                title="AI Recommendations"
                value={`${stats.newRecommendations} New Ideas`}
                description="Growth & profit opportunities"
                icon={Lightbulb}
                iconColor="bg-amber-500"
                linkTo={createPageUrl('AIAdvisor')}
            />
            <HubCard 
                title="Time Automated"
                value={`${stats.automationsRun} Tasks Handled`}
                description="Completed by your AI agent"
                icon={Bot}
                iconColor="bg-indigo-500"
                linkTo={createPageUrl('History')}
            />
        </div>
    );
}
