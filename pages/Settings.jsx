
import React, { useState, useEffect, useCallback } from 'react';
import { User } from '@/api/entities';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings as SettingsIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import ProfileSettings from '../components/settings/ProfileSettings';
import SecuritySettings from '../components/settings/SecuritySettings';
import NotificationSettings from '../components/settings/NotificationSettings';
import AppearanceSettings from '../components/settings/AppearanceSettings';
import SubscriptionSettings from '../components/settings/SubscriptionSettings';
import ResourcesSettings from '../components/settings/ResourcesSettings';
import { handleAuthError } from '../components/utils/authHelpers';
import BetaAccessManager from '../components/settings/BetaAccessManager';

export default function Settings() {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const navigate = useNavigate();

    const loadUser = useCallback(async () => {
        setIsLoading(true);
        try {
            const currentUser = await User.me();
            setUser(currentUser);
        } catch (error) {
            console.error('Error loading user settings:', error);
            
            if (handleAuthError(error, navigate, { showToast: true })) {
                return;
            }

            toast.error("Failed to load settings", {
                description: "Please try refreshing the page."
            });
        } finally {
            setIsLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        loadUser();
    }, [loadUser]);

    const handleUpdateUser = useCallback(async (updates) => {
        setIsSaving(true);
        try {
            await User.updateMyUserData(updates);
            setUser(prev => ({ ...prev, ...updates }));
            toast.success("Settings updated successfully");
        } catch (error) {
            console.error('Error updating user settings:', error);
            
            if (handleAuthError(error, navigate)) {
                return;
            }

            toast.error("Failed to update settings", {
                description: "Please try again."
            });
        } finally {
            setIsSaving(false);
        }
    }, [navigate]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                    <p className="text-slate-600">Loading settings...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Card className="max-w-md">
                    <CardContent className="p-6 text-center">
                        <p className="text-slate-600">Unable to load user settings.</p>
                        <Button onClick={loadUser} className="mt-4">
                            Try Again
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-4 sm:p-6 lg:p-8">
            <div className="max-w-6xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 flex items-center gap-3">
                        <SettingsIcon className="w-8 h-8 sm:w-10 sm:h-10 text-indigo-600" />
                        Settings
                    </h1>
                    <p className="mt-2 text-lg text-slate-600">
                        Manage your account preferences and application settings
                    </p>
                </div>

                <Tabs defaultValue="profile" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6 mb-8">
                        <TabsTrigger value="profile">Profile</TabsTrigger>
                        <TabsTrigger value="security">Security</TabsTrigger>
                        <TabsTrigger value="notifications">Notifications</TabsTrigger>
                        <TabsTrigger value="appearance">Appearance</TabsTrigger>
                        <TabsTrigger value="subscription">Subscription</TabsTrigger>
                        <TabsTrigger value="resources">Resources</TabsTrigger>
                    </TabsList>

                    <TabsContent value="profile">
                        <ProfileSettings 
                            user={user} 
                            onUpdate={handleUpdateUser} 
                            isSaving={isSaving}
                        />
                    </TabsContent>

                    <TabsContent value="security">
                        <SecuritySettings 
                            user={user} 
                            onUpdate={handleUpdateUser} 
                            isSaving={isSaving}
                        />
                    </TabsContent>

                    <TabsContent value="notifications">
                        <NotificationSettings 
                            user={user} 
                            onUpdate={handleUpdateUser} 
                            isSaving={isSaving}
                        />
                    </TabsContent>

                    <TabsContent value="appearance">
                        <AppearanceSettings 
                            user={user} 
                            onUpdate={handleUpdateUser} 
                            isSaving={isSaving}
                        />
                    </TabsContent>

                    <TabsContent value="subscription">
                        <SubscriptionSettings user={user} />
                    </TabsContent>

                    <TabsContent value="resources">
                        <ResourcesSettings user={user} />
                    </TabsContent>
                </Tabs>

                {/* Beta Access Manager - Only show for admins */}
                {user.role === 'admin' && (
                    <div className="mt-8">
                        <BetaAccessManager />
                    </div>
                )}
            </div>
        </div>
    );
}
