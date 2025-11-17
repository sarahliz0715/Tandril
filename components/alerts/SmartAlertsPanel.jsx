import React, { useState, useEffect } from 'react';
import { SmartAlert } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    Bell, AlertTriangle, Lightbulb, TrendingUp, Target, 
    X, ChevronRight, Sparkles, Zap 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

export default function SmartAlertsPanel({ onAlertAction }) {
    const [alerts, setAlerts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        loadAlerts();
    }, []);

    const loadAlerts = async () => {
        setIsLoading(true);
        try {
            const alertsData = await SmartAlert.filter({
                is_dismissed: false
            }, '-created_date', 10);
            setAlerts(alertsData);
        } catch (error) {
            console.error('Error loading alerts:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDismissAlert = async (alertId) => {
        try {
            await SmartAlert.update(alertId, { is_dismissed: true });
            setAlerts(prev => prev.filter(alert => alert.id !== alertId));
            toast.success('Alert dismissed');
        } catch (error) {
            toast.error('Failed to dismiss alert');
        }
    };

    const handleActionClick = (action, alert) => {
        // Navigate to Commands page with the suggested command
        const commandPrompt = encodeURIComponent(action.command);
        navigate(createPageUrl(`Commands?prompt=${commandPrompt}`));
        
        // Mark alert as read
        SmartAlert.update(alert.id, { is_read: true });
        
        if (onAlertAction) {
            onAlertAction(action, alert);
        }
    };

    const getAlertIcon = (alertType) => {
        switch (alertType) {
            case 'critical': return <AlertTriangle className="w-5 h-5 text-red-500" />;
            case 'opportunity': return <Lightbulb className="w-5 h-5 text-yellow-500" />;
            case 'maintenance': return <Bell className="w-5 h-5 text-blue-500" />;
            default: return <Bell className="w-5 h-5 text-slate-500" />;
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
            case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
            default: return 'bg-slate-100 text-slate-800 border-slate-200';
        }
    };

    if (isLoading) {
        return (
            <Card className="bg-white/80 backdrop-blur-sm shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-500" />
                        Smart Alerts
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex justify-center py-8">
                        <div className="animate-pulse text-slate-500">Loading alerts...</div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-white/80 backdrop-blur-sm shadow-lg">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-500" />
                        Smart Alerts
                        {alerts.length > 0 && (
                            <Badge variant="destructive">{alerts.length}</Badge>
                        )}
                    </CardTitle>
                    <Button 
                        variant="outline" 
                        size="sm"
                        onClick={loadAlerts}
                    >
                        <Zap className="w-4 h-4 mr-1" />
                        Refresh
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {alerts.length === 0 ? (
                    <div className="text-center py-8">
                        <Lightbulb className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-slate-700 mb-2">All caught up!</h3>
                        <p className="text-slate-500">No new opportunities or issues detected.</p>
                    </div>
                ) : (
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                        {alerts.map((alert) => (
                            <div 
                                key={alert.id} 
                                className={`relative p-4 rounded-lg border transition-all duration-200 hover:shadow-md ${
                                    alert.alert_type === 'opportunity' ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200' :
                                    alert.alert_type === 'critical' ? 'bg-gradient-to-r from-red-50 to-pink-50 border-red-200' :
                                    'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'
                                }`}
                            >
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-2 right-2 h-6 w-6 text-slate-400 hover:text-slate-600"
                                    onClick={() => handleDismissAlert(alert.id)}
                                >
                                    <X className="w-4 h-4" />
                                </Button>

                                <div className="flex items-start gap-3 pr-8">
                                    {getAlertIcon(alert.alert_type)}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                            <h4 className="font-semibold text-slate-900 text-sm">
                                                {alert.title}
                                            </h4>
                                            <Badge className={getPriorityColor(alert.priority)}>
                                                {alert.priority}
                                            </Badge>
                                        </div>
                                        
                                        <p className="text-sm text-slate-600 mb-3 leading-relaxed">
                                            {alert.message}
                                        </p>

                                        {alert.suggested_actions && alert.suggested_actions.length > 0 && (
                                            <div className="space-y-2">
                                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                                                    Suggested Actions:
                                                </p>
                                                <div className="flex flex-wrap gap-2">
                                                    {alert.suggested_actions.slice(0, 2).map((action, index) => (
                                                        <Button
                                                            key={index}
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-8 text-xs bg-white/80 hover:bg-white hover:scale-105 transition-all"
                                                            onClick={() => handleActionClick(action, alert)}
                                                        >
                                                            <ChevronRight className="w-3 h-3 mr-1" />
                                                            {action.action}
                                                        </Button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {alert.expires_at && (
                                            <p className="text-xs text-slate-400 mt-2">
                                                Expires: {new Date(alert.expires_at).toLocaleDateString()}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}