
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Bell, Mail, CheckCircle, Shield, TrendingUp, BarChart3, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function NotificationSettings({ user, onUpdate }) {
    const [preferences, setPreferences] = useState(
        user?.notification_preferences || {
            email_alerts: true,
            command_completion: true,
            security_alerts: true,
            weekly_reports: false,
            daily_reports: false,
            beta_banner_dismissed: false
        }
    );
    const [saving, setSaving] = useState(false);

    const handleToggle = async (key) => {
        const newPreferences = { ...preferences, [key]: !preferences[key] };
        setPreferences(newPreferences);
        
        setSaving(true);
        try {
            await onUpdate({ notification_preferences: newPreferences });
            toast.success('Notification preferences updated');
        } catch (error) {
            console.error('Failed to update preferences:', error);
            toast.error('Failed to update preferences');
            // Revert preferences if update fails
            setPreferences(preferences); 
        } finally {
            setSaving(false);
        }
    };

    const notificationOptions = [
        {
            key: 'email_alerts',
            title: 'Email Alerts',
            description: 'Receive email notifications for critical alerts and warnings',
            icon: Mail
        },
        {
            key: 'command_completion',
            title: 'Command Completion',
            description: 'Get notified when AI commands finish executing',
            icon: CheckCircle
        },
        {
            key: 'security_alerts',
            title: 'Security Alerts',
            description: 'Important security and account activity notifications',
            icon: Shield
        },
        {
            key: 'daily_reports',
            title: '📊 Daily Business Report',
            description: 'Get a beautiful email summary of yesterday\'s performance every morning at 8 AM',
            icon: TrendingUp,
            badge: 'New'
        },
        {
            key: 'weekly_reports',
            title: '📈 Weekly Summary',
            description: 'Comprehensive weekly analytics with insights and recommendations every Monday',
            icon: BarChart3,
            badge: 'New'
        }
    ];

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    Notification Preferences
                </CardTitle>
                <CardDescription>
                    Choose what notifications you want to receive
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {notificationOptions.map((option) => (
                    <div 
                        key={option.key}
                        className="flex items-start justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors"
                    >
                        <div className="flex items-start gap-3 flex-1">
                            <div className="mt-1">
                                <option.icon className="w-5 h-5 text-slate-600" />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <Label htmlFor={option.key} className="font-semibold text-slate-900 cursor-pointer">
                                        {option.title}
                                    </Label>
                                    {option.badge && (
                                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                                            {option.badge}
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-sm text-slate-600 mt-1">{option.description}</p>
                            </div>
                        </div>
                        <Switch
                            id={option.key}
                            checked={preferences[option.key]}
                            onCheckedChange={() => handleToggle(option.key)}
                            disabled={saving}
                        />
                    </div>
                ))}

                <Alert className="bg-blue-50 border-blue-200">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertTitle className="text-blue-900">Email Reports</AlertTitle>
                    <AlertDescription className="text-blue-800">
                        Daily and weekly reports are beautifully formatted HTML emails with metrics, 
                        charts, and AI recommendations to help you stay on top of your business.
                    </AlertDescription>
                </Alert>
            </CardContent>
        </Card>
    );
}
