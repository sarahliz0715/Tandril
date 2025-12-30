import React, { useState, useEffect } from 'react';
import { api } from '@/api/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Sparkles, Plus, X } from 'lucide-react';

export default function ProfileSettings() {
    const [user, setUser] = useState(null);
    const [fullName, setFullName] = useState('');
    const [businessNiches, setBusinessNiches] = useState([]);
    const [newNiche, setNewNiche] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [memoryItems, setMemoryItems] = useState([]);

    useEffect(() => {
        const loadUser = async () => {
            try {
                const currentUser = await api.auth.me();
                setUser(currentUser);
                setFullName(currentUser?.full_name || '');
                
                // Migration: Support both old single niche and new niches array
                const niches = currentUser?.business_info?.niches || [];
                const legacyNiche = currentUser?.business_info?.niche;
                
                if (niches.length === 0 && legacyNiche) {
                    setBusinessNiches([legacyNiche]);
                } else {
                    setBusinessNiches(niches);
                }
                
                if (currentUser?.ai_memory) {
                    setMemoryItems(currentUser.ai_memory);
                }
            } catch (error) {
                console.error('Error loading user:', error);
                toast.error('Failed to load profile data.');
            } finally {
                setIsLoading(false);
            }
        };
        loadUser();
    }, []);

    const handleAddNiche = () => {
        const trimmedNiche = newNiche.trim();
        if (!trimmedNiche) {
            toast.error("Please enter a niche");
            return;
        }
        
        if (businessNiches.includes(trimmedNiche)) {
            toast.error("This niche is already added");
            return;
        }
        
        setBusinessNiches([...businessNiches, trimmedNiche]);
        setNewNiche('');
        toast.success("Niche added! Don't forget to save changes.");
    };

    const handleRemoveNiche = (nicheToRemove) => {
        setBusinessNiches(businessNiches.filter(niche => niche !== nicheToRemove));
        toast.success("Niche removed! Don't forget to save changes.");
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await api.auth.updateMe({ 
                full_name: fullName,
                business_info: {
                    ...user?.business_info,
                    niches: businessNiches,
                    niche: businessNiches[0] || '' // Keep first niche as legacy field
                }
            });
            const updatedUser = await api.auth.me();
            setUser(updatedUser);
            toast.success('Profile updated successfully!');
        } catch (error) {
            toast.error('Failed to update profile.');
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleMemoryDismiss = async (index) => {
        try {
            const updatedMemory = [...memoryItems];
            if (updatedMemory[index]) {
                updatedMemory[index].is_dismissed = true;
            }
            
            await api.auth.updateMe({ ai_memory: updatedMemory });
            setMemoryItems(updatedMemory);
            toast.success('Memory item dismissed');
        } catch (error) {
            console.error('Error dismissing memory item:', error);
            toast.error('Failed to dismiss memory item');
        }
    };

    const handleMemoryDelete = async (index) => {
        try {
            const updatedMemory = memoryItems.filter((_, i) => i !== index);
            
            await api.auth.updateMe({ ai_memory: updatedMemory });
            setMemoryItems(updatedMemory);
            toast.success('Memory item deleted');
        } catch (error) {
            console.error('Error deleting memory item:', error);
            toast.error('Failed to delete memory item');
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
                <CardTitle>Profile</CardTitle>
                <CardDescription>Manage your personal information and business details.</CardDescription>
            </CardHeader>
            <form onSubmit={handleSave}>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="fullName">Full Name</Label>
                        <Input
                            id="fullName"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Your full name"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            value={user?.email || ''}
                            disabled
                            className="bg-slate-100"
                        />
                        <p className="text-xs text-slate-500">Your email address is used for logging in and cannot be changed.</p>
                    </div>

                    {/* Business Niches Field */}
                    <div className="space-y-3 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-indigo-600" />
                            <Label className="font-semibold text-indigo-900">
                                Business Niches / Product Categories
                            </Label>
                        </div>
                        
                        <p className="text-xs text-indigo-700">
                            Add all the niches or product categories you work with. This helps AI personalize market intelligence and insights.
                        </p>

                        {/* Current Niches */}
                        {businessNiches.length > 0 && (
                            <div className="flex flex-wrap gap-2 p-3 bg-white/60 rounded-md">
                                {businessNiches.map((niche, index) => (
                                    <Badge 
                                        key={index} 
                                        variant="secondary"
                                        className="px-3 py-1 text-sm flex items-center gap-2"
                                    >
                                        {niche}
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveNiche(niche)}
                                            className="hover:text-red-600 transition-colors"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                        )}

                        {/* Add New Niche */}
                        <div className="flex gap-2">
                            <Input
                                placeholder="e.g., print on demand, custom mugs, tech accessories..."
                                value={newNiche}
                                onChange={(e) => setNewNiche(e.target.value)}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddNiche();
                                    }
                                }}
                                className="flex-1"
                            />
                            <Button 
                                type="button"
                                onClick={handleAddNiche}
                                variant="outline"
                                size="sm"
                            >
                                <Plus className="w-4 h-4 mr-1" />
                                Add
                            </Button>
                        </div>

                        {businessNiches.length === 0 && (
                            <p className="text-xs text-slate-500 italic">
                                No niches added yet. Add your first niche to get started!
                            </p>
                        )}
                    </div>

                    {/* AI Memory Section */}
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-lg font-medium">AI Memory</h3>
                            <p className="text-sm text-slate-600">
                                Personal facts, preferences, and reminders that Orion remembers about you.
                            </p>
                        </div>

                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {memoryItems.filter(item => !item.is_dismissed).map((item, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                    <div className="flex-1 pr-4">
                                        <p className="text-sm font-medium capitalize">{item.type}</p>
                                        <p className="text-sm text-slate-600">{item.content}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button 
                                            type="button"
                                            variant="ghost" 
                                            size="sm"
                                            onClick={() => handleMemoryDismiss(index)}
                                        >
                                            Dismiss
                                        </Button>
                                        <Button 
                                            type="button"
                                            variant="ghost" 
                                            size="sm" 
                                            className="text-red-600"
                                            onClick={() => handleMemoryDelete(index)}
                                        >
                                            Delete
                                        </Button>
                                    </div>
                                </div>
                            ))}
                            
                            {memoryItems.filter(item => !item.is_dismissed).length === 0 && (
                                <p className="text-sm text-slate-500 italic">
                                    No memories stored yet. Chat with Orion to start building your personal AI memory.
                                </p>
                            )}
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="border-t px-6 py-4">
                    <Button type="submit" disabled={isSaving}>
                        {isSaving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            'Save Changes'
                        )}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}