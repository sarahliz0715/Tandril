import React, { useState, useEffect } from 'react';
import { User } from '@/lib/entities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Sun, Moon, Droplet, Zap, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';

const themes = [
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
    { id: 'ocean', label: 'Ocean', icon: Droplet },
    { id: 'dusk', label: 'Dusk', icon: Zap },
    { id: 'forest', label: 'Forest', icon: Sparkles },
];

export default function AppearanceSettings() {
    const [user, setUser] = useState(null);
    const [settings, setSettings] = useState({
        dashboard_layout: {
            theme: 'light',
            ai_avatar_style: 'friendly',
            ai_voice_preference: 'warm',
        },
        custom_colors: {
            primary: '#3b82f6',
            secondary: '#8b5cf6',
        },
    });
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadUser = async () => {
            try {
                const currentUser = await User.me();
                setUser(currentUser);
                setSettings({
                    dashboard_layout: {
                        theme: currentUser?.dashboard_layout?.theme || 'light',
                        ai_avatar_style: currentUser?.dashboard_layout?.ai_avatar_style || 'friendly',
                        ai_voice_preference: currentUser?.dashboard_layout?.ai_voice_preference || 'warm',
                    },
                    custom_colors: {
                        primary: currentUser?.custom_colors?.primary || '#3b82f6',
                        secondary: currentUser?.custom_colors?.secondary || '#8b5cf6',
                    },
                });
            } catch (error) {
                console.error('Error loading user:', error);
                toast.error('Failed to load appearance settings.');
            } finally {
                setIsLoading(false);
            }
        };
        loadUser();
    }, []);

    const handleAvatarStyleChange = (value) => {
        setSettings(s => ({
            ...s,
            dashboard_layout: {
                ...s.dashboard_layout,
                ai_avatar_style: value
            }
        }));
    };

    const handleVoicePreferenceChange = (value) => {
        setSettings(s => ({
            ...s,
            dashboard_layout: {
                ...s.dashboard_layout,
                ai_voice_preference: value
            }
        }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        const dataToUpdate = {
            dashboard_layout: settings.dashboard_layout,
            custom_colors: settings.custom_colors,
        };
        try {
            await User.updateMyUserData(dataToUpdate);
            const updatedUser = await User.me();
            setUser(updatedUser);
            toast.success('Appearance settings updated! The page will now refresh to apply changes.');
            setTimeout(() => window.location.reload(), 1500);
        } catch (error) {
            toast.error('Failed to update settings.');
        } finally {
            setIsSaving(false);
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
        <Card>
            <CardHeader>
                <CardTitle>Appearance & Personalization</CardTitle>
                <CardDescription>Customize how your Tandril experience looks and feels.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <Label className="text-base font-medium">Theme</Label>
                    <p className="text-sm text-slate-500 mb-4">Select your preferred color theme.</p>
                    <RadioGroup
                        value={settings.dashboard_layout.theme}
                        onValueChange={(value) => setSettings(s => ({
                            ...s,
                            dashboard_layout: { ...s.dashboard_layout, theme: value }
                        }))}
                        className="grid grid-cols-2 sm:grid-cols-3 gap-4"
                    >
                        {themes.map(({ id, label, icon: Icon }) => (
                            <div key={id}>
                                <RadioGroupItem value={id} id={`theme-${id}`} className="sr-only" />
                                <Label
                                    htmlFor={`theme-${id}`}
                                    className={`flex flex-col items-center justify-center rounded-md border-2 p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer ${
                                        settings.dashboard_layout.theme === id ? "border-indigo-500" : "border-muted"
                                    }`}
                                >
                                    <Icon className="mb-3 h-6 w-6" />
                                    {label}
                                </Label>
                            </div>
                        ))}
                    </RadioGroup>
                </div>

                <div>
                    <label className="text-sm font-medium mb-3 block">AI Assistant Avatar</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                            { value: 'friendly', label: 'Friendly', desc: 'Warm blue tones' },
                            { value: 'professional', label: 'Professional', desc: 'Clean gray style' },
                            { value: 'playful', label: 'Playful', desc: 'Vibrant colors' },
                            { value: 'minimal', label: 'Minimal', desc: 'Simple design' }
                        ].map(style => (
                            <button
                                key={style.value}
                                type="button"
                                onClick={() => handleAvatarStyleChange(style.value)}
                                className={`p-3 rounded-lg border text-left transition-all ${
                                    settings.dashboard_layout.ai_avatar_style === style.value
                                        ? 'border-blue-500 bg-blue-50 text-blue-900'
                                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                                <div className="font-medium text-sm">{style.label}</div>
                                <div className="text-xs text-gray-500 mt-1">{style.desc}</div>
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="text-sm font-medium mb-3 block">AI Voice Personality</label>
                    <Select value={settings.dashboard_layout.ai_voice_preference} onValueChange={handleVoicePreferenceChange}>
                        <SelectTrigger>
                            <SelectValue placeholder="Choose voice style" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="warm">Warm & Encouraging</SelectItem>
                            <SelectItem value="energetic">Energetic & Upbeat</SelectItem>
                            <SelectItem value="calm">Calm & Focused</SelectItem>
                            <SelectItem value="confident">Confident & Direct</SelectItem>
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">This will affect future voice features and response tone.</p>
                </div>

                {user.subscription_tier !== 'free' && (
                <div>
                    <Label className="text-base font-medium">Custom Brand Colors</Label>
                    <p className="text-sm text-slate-500 mb-4">Set your own brand colors for a personalized experience.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <Label>Primary Color</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    type="color"
                                    value={settings.custom_colors.primary}
                                    onChange={(e) => setSettings(s => ({
                                        ...s,
                                        custom_colors: { ...s.custom_colors, primary: e.target.value }
                                    }))}
                                    className="p-1 h-10 w-14"
                                />
                                <Input
                                    type="text"
                                    value={settings.custom_colors.primary}
                                    onChange={(e) => setSettings(s => ({
                                        ...s,
                                        custom_colors: { ...s.custom_colors, primary: e.target.value }
                                    }))}
                                    className="flex-1"
                                />
                            </div>
                            <div className="w-full h-8 rounded" style={{ backgroundColor: settings.custom_colors.primary }}/>
                        </div>
                        <div className="space-y-3">
                            <Label>Secondary Color</Label>
                             <div className="flex items-center gap-2">
                                <Input
                                    type="color"
                                    value={settings.custom_colors.secondary}
                                    onChange={(e) => setSettings(s => ({
                                        ...s,
                                        custom_colors: { ...s.custom_colors, secondary: e.target.value }
                                    }))}
                                    className="p-1 h-10 w-14"
                                />
                                <Input
                                    type="text"
                                    value={settings.custom_colors.secondary}
                                    onChange={(e) => setSettings(s => ({
                                        ...s,
                                        custom_colors: { ...s.custom_colors, secondary: e.target.value }
                                    }))}
                                    className="flex-1"
                                />
                            </div>
                            <div className="w-full h-8 rounded" style={{ backgroundColor: settings.custom_colors.secondary }}/>
                        </div>
                    </div>
                     <Button 
                        size="sm"
                        variant="outline"
                        className="mt-4"
                        onClick={() => setSettings(s => ({
                            ...s,
                            dashboard_layout: { ...s.dashboard_layout, theme: 'custom' }
                        }))}
                    >
                        Apply Custom Colors
                    </Button>
                </div>
                )}

            </CardContent>
            <CardFooter className="border-t px-6 py-4">
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : 'Save Changes'}
                </Button>
            </CardFooter>
        </Card>
    );
}