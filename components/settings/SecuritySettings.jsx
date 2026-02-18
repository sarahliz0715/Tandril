import React, { useState, useEffect } from 'react';
import { User } from '@/lib/entities';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from 'sonner';
import { Loader2, Eye, EyeOff, Lock } from 'lucide-react';

export default function SecuritySettings() {
    const [user, setUser] = useState(null);
    const [settings, setSettings] = useState({
        inactivity_timeout_minutes: 15,
        require_secondary_auth: true,
    });
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [passwordForm, setPasswordForm] = useState({
        newPassword: '',
        confirmPassword: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    useEffect(() => {
        const loadUser = async () => {
            try {
                const currentUser = await User.me();
                setUser(currentUser);
                setSettings({
                    inactivity_timeout_minutes: currentUser?.inactivity_timeout_minutes || 15,
                    require_secondary_auth: currentUser?.require_secondary_auth !== false,
                });
            } catch (error) {
                console.error('Error loading user:', error);
                toast.error('Failed to load security settings.');
            } finally {
                setIsLoading(false);
            }
        };
        loadUser();
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await User.updateMyUserData(settings);
            const updatedUser = await User.me();
            setUser(updatedUser);
            toast.success('Security settings updated successfully!');
        } catch (error) {
            toast.error('Failed to update settings.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleChangePassword = async () => {
        // Validation
        if (!passwordForm.newPassword || !passwordForm.confirmPassword) {
            toast.error('Please fill in both password fields');
            return;
        }

        if (passwordForm.newPassword.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        setIsChangingPassword(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: passwordForm.newPassword
            });

            if (error) throw error;

            toast.success('Password changed successfully!');
            setPasswordForm({ newPassword: '', confirmPassword: '' });
        } catch (error) {
            console.error('Error changing password:', error);
            toast.error(error.message || 'Failed to change password');
        } finally {
            setIsChangingPassword(false);
        }
    };

    if (isLoading || !user) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center p-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                </CardContent>
            </Card>
        );
    }
    
    return (
        <div className="space-y-6">
            {/* Password Change Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Lock className="w-5 h-5" />
                        Change Password
                    </CardTitle>
                    <CardDescription>Update your account password</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="new-password">New Password</Label>
                        <div className="relative">
                            <Input
                                id="new-password"
                                type={showPassword ? "text" : "password"}
                                placeholder="Enter new password"
                                value={passwordForm.newPassword}
                                onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        <p className="text-xs text-slate-500">Must be at least 6 characters</p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirm-password">Confirm New Password</Label>
                        <Input
                            id="confirm-password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Confirm new password"
                            value={passwordForm.confirmPassword}
                            onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        />
                    </div>
                </CardContent>
                <CardFooter className="border-t px-6 py-4">
                    <Button
                        onClick={handleChangePassword}
                        disabled={isChangingPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
                    >
                        {isChangingPassword ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Changing Password...
                            </>
                        ) : (
                            'Change Password'
                        )}
                    </Button>
                </CardFooter>
            </Card>

            {/* Security Settings Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Security Settings</CardTitle>
                    <CardDescription>Manage your account's security preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                            <Label htmlFor="secondary-auth" className="font-medium">High-Impact Command Verification</Label>
                            <p className="text-sm text-slate-500">Require biometric or device PIN verification for risky actions.</p>
                        </div>
                        <Switch
                            id="secondary-auth"
                            checked={settings.require_secondary_auth}
                            onCheckedChange={(checked) => setSettings(s => ({ ...s, require_secondary_auth: checked }))}
                        />
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                            <Label htmlFor="inactivity-timeout" className="font-medium">Automatic Logout</Label>
                            <p className="text-sm text-slate-500">Automatically log out after a period of inactivity.</p>
                        </div>
                        <Select
                            value={String(settings.inactivity_timeout_minutes)}
                            onValueChange={(value) => setSettings(s => ({ ...s, inactivity_timeout_minutes: parseInt(value) }))}
                        >
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Select timeout" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="15">15 minutes</SelectItem>
                                <SelectItem value="30">30 minutes</SelectItem>
                                <SelectItem value="60">1 hour</SelectItem>
                                <SelectItem value="120">2 hours</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
                <CardFooter className="border-t px-6 py-4">
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : 'Save Changes'}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}