import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ShieldCheck, AlertTriangle } from 'lucide-react';
import { User } from '@/api/entities';
import { toast } from 'sonner';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function DemoModeToggle({ user, onToggle }) {
    const [isChanging, setIsChanging] = useState(false);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);

    const isLiveMode = user?.user_mode === 'live';

    const handleToggle = (checked) => {
        const newMode = checked ? 'live' : 'demo';
        
        if (newMode === 'live' && user?.user_mode === 'demo') {
            // Switching from demo to live - show warning
            setShowConfirmDialog(true);
        } else {
            // Switching from live to demo - no warning needed
            confirmModeChange(newMode);
        }
    };

    const confirmModeChange = async (mode) => {
        setIsChanging(true);
        try {
            await User.updateMyUserData({ user_mode: mode });
            
            toast.success(
                mode === 'live' ? 'Switched to Live Mode' : 'Switched to Demo Mode',
                {
                    description: mode === 'live' 
                        ? 'You can now connect real stores and work with live data.'
                        : 'You are now using demo data. Your real data is safe.'
                }
            );
            
            if (onToggle) {
                onToggle(mode);
            }
            
            // Reload page to refresh data
            setTimeout(() => {
                window.location.reload();
            }, 500);
        } catch (error) {
            console.error('Error changing mode:', error);
            toast.error('Failed to change mode', {
                description: 'Please try again or contact support if the issue persists.'
            });
        } finally {
            setIsChanging(false);
            setShowConfirmDialog(false);
        }
    };

    return (
        <>
            <Card className={`${isLiveMode ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {isLiveMode ? (
                                <ShieldCheck className="w-6 h-6 text-green-600" />
                            ) : (
                                <AlertTriangle className="w-6 h-6 text-amber-600" />
                            )}
                            <div>
                                <Label className="text-base font-semibold text-slate-900">
                                    {isLiveMode ? 'Live Mode' : 'Demo Mode'}
                                </Label>
                                <p className="text-sm text-slate-600 mt-1">
                                    {isLiveMode 
                                        ? 'You\'re in live mode. Connections will use real store data and commands will make actual changes.'
                                        : 'You\'re in demo mode. All connections use sample data and won\'t affect real stores. You can still connect to platforms to see the OAuth flow.'
                                    }
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-3 ml-4">
                            <span className="text-sm text-slate-500 whitespace-nowrap">Demo</span>
                            <Switch
                                checked={isLiveMode}
                                onCheckedChange={handleToggle}
                                disabled={isChanging}
                                className="data-[state=checked]:bg-green-600"
                            />
                            <span className="text-sm text-slate-500 whitespace-nowrap">Live</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-amber-600" />
                            Switch to Live Mode?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-base space-y-3">
                            <p>
                                You're about to switch from Demo Mode to Live Mode. This means:
                            </p>
                            <ul className="list-disc pl-5 space-y-1">
                                <li>Platform connections will use real OAuth and API credentials</li>
                                <li>Commands will affect your actual stores and products</li>
                                <li>Changes will be permanent and cannot be undone</li>
                                <li>You'll be working with live integrations</li>
                            </ul>
                            <p className="font-semibold text-slate-900">
                                Are you sure you want to proceed?
                            </p>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Stay in Demo Mode</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => confirmModeChange('live')}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            Yes, Switch to Live Mode
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}