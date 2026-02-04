import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { PlayCircle, Pause, AlertTriangle } from 'lucide-react';
import { User } from '@/lib/entities';
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

export default function ModeToggle({ user, onModeChange }) {
    const [isChanging, setIsChanging] = useState(false);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [pendingMode, setPendingMode] = useState(null);

    const isLiveMode = user?.user_mode === 'live';

    const handleToggle = (newMode) => {
        if (newMode === 'live' && user?.user_mode === 'demo') {
            // Switching from demo to live - show warning
            setPendingMode('live');
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
                        ? 'You are now working with real data and live integrations.'
                        : 'You are now using demo data. Your real data is safe.'
                }
            );
            
            if (onModeChange) {
                onModeChange(mode);
            }
            
            // Reload page to refresh data
            window.location.reload();
        } catch (error) {
            console.error('Error changing mode:', error);
            toast.error('Failed to change mode', {
                description: 'Please try again or contact support if the issue persists.'
            });
        } finally {
            setIsChanging(false);
            setShowConfirmDialog(false);
            setPendingMode(null);
        }
    };

    return (
        <>
            <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {isLiveMode ? (
                                <PlayCircle className="w-5 h-5 text-green-600" />
                            ) : (
                                <Pause className="w-5 h-5 text-amber-600" />
                            )}
                            <div>
                                <Label className="text-sm font-semibold text-slate-900">
                                    {isLiveMode ? 'Live Mode' : 'Demo Mode'}
                                </Label>
                                <p className="text-xs text-slate-600">
                                    {isLiveMode 
                                        ? 'Working with real data and live integrations'
                                        : 'Testing with sample data - your real data is safe'
                                    }
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-500">Demo</span>
                            <Switch
                                checked={isLiveMode}
                                onCheckedChange={(checked) => handleToggle(checked ? 'live' : 'demo')}
                                disabled={isChanging}
                            />
                            <span className="text-xs text-slate-500">Live</span>
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
                                <li>Commands will affect your real stores and products</li>
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