import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Save } from 'lucide-react';
import { toast } from 'sonner';
import { User } from '@/api/entities';

export default function AutoResponseSettings({ user, onUpdate }) {
    const [settings, setSettings] = useState({
        auto_response_enabled: user?.support_settings?.auto_response_enabled || false,
        auto_respond_to_reviews: user?.support_settings?.auto_respond_to_reviews || false,
        auto_respond_to_messages: user?.support_settings?.auto_respond_to_messages || false,
        response_tone: user?.support_settings?.response_tone || 'friendly',
        custom_instructions: user?.support_settings?.custom_instructions || '',
        auto_resolve_simple_tickets: user?.support_settings?.auto_resolve_simple_tickets || false
    });

    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await User.updateMyUserData({
                support_settings: settings
            });
            toast.success('Settings saved successfully!');
            onUpdate();
        } catch (error) {
            console.error('Error saving settings:', error);
            toast.error('Failed to save settings');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-600" />
                        AI Auto-Response Settings
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Master Toggle */}
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
                        <div>
                            <Label htmlFor="auto_response" className="text-base font-semibold text-slate-900">
                                Enable AI Auto-Response
                            </Label>
                            <p className="text-sm text-slate-600 mt-1">
                                Let AI automatically respond to customer inquiries
                            </p>
                        </div>
                        <Switch
                            id="auto_response"
                            checked={settings.auto_response_enabled}
                            onCheckedChange={(checked) => 
                                setSettings({ ...settings, auto_response_enabled: checked })
                            }
                        />
                    </div>

                    {/* Individual Settings */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <Label htmlFor="auto_reviews" className="font-medium">
                                    Auto-Respond to Reviews
                                </Label>
                                <p className="text-sm text-slate-600">
                                    Automatically post AI-generated responses to customer reviews
                                </p>
                            </div>
                            <Switch
                                id="auto_reviews"
                                checked={settings.auto_respond_to_reviews}
                                onCheckedChange={(checked) => 
                                    setSettings({ ...settings, auto_respond_to_reviews: checked })
                                }
                                disabled={!settings.auto_response_enabled}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <Label htmlFor="auto_messages" className="font-medium">
                                    Auto-Respond to Messages
                                </Label>
                                <p className="text-sm text-slate-600">
                                    Automatically reply to customer messages with AI-generated responses
                                </p>
                            </div>
                            <Switch
                                id="auto_messages"
                                checked={settings.auto_respond_to_messages}
                                onCheckedChange={(checked) => 
                                    setSettings({ ...settings, auto_respond_to_messages: checked })
                                }
                                disabled={!settings.auto_response_enabled}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <Label htmlFor="auto_resolve" className="font-medium">
                                    Auto-Resolve Simple Tickets
                                </Label>
                                <p className="text-sm text-slate-600">
                                    Let AI automatically resolve straightforward support tickets
                                </p>
                            </div>
                            <Switch
                                id="auto_resolve"
                                checked={settings.auto_resolve_simple_tickets}
                                onCheckedChange={(checked) => 
                                    setSettings({ ...settings, auto_resolve_simple_tickets: checked })
                                }
                                disabled={!settings.auto_response_enabled}
                            />
                        </div>
                    </div>

                    {/* Response Tone */}
                    <div className="space-y-2">
                        <Label htmlFor="tone">Response Tone</Label>
                        <select
                            id="tone"
                            value={settings.response_tone}
                            onChange={(e) => setSettings({ ...settings, response_tone: e.target.value })}
                            className="w-full border rounded-md px-3 py-2"
                            disabled={!settings.auto_response_enabled}
                        >
                            <option value="friendly">Friendly & Warm</option>
                            <option value="professional">Professional</option>
                            <option value="casual">Casual & Conversational</option>
                            <option value="empathetic">Empathetic & Understanding</option>
                            <option value="concise">Concise & Direct</option>
                        </select>
                        <p className="text-xs text-slate-500">
                            Choose how AI should communicate with your customers
                        </p>
                    </div>

                    {/* Custom Instructions */}
                    <div className="space-y-2">
                        <Label htmlFor="instructions">Custom Instructions (Optional)</Label>
                        <Textarea
                            id="instructions"
                            value={settings.custom_instructions}
                            onChange={(e) => setSettings({ ...settings, custom_instructions: e.target.value })}
                            placeholder="E.g., Always mention our 30-day return policy, use British spelling, refer customers to FAQ for shipping questions..."
                            className="min-h-[100px]"
                            disabled={!settings.auto_response_enabled}
                        />
                        <p className="text-xs text-slate-500">
                            Add specific guidelines for AI to follow when responding to customers
                        </p>
                    </div>

                    <Button 
                        onClick={handleSave} 
                        disabled={isSaving}
                        className="w-full bg-indigo-600 hover:bg-indigo-700"
                    >
                        <Save className="w-4 h-4 mr-2" />
                        {isSaving ? 'Saving...' : 'Save Settings'}
                    </Button>
                </CardContent>
            </Card>

            {/* Preview Examples */}
            <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
                <CardHeader>
                    <CardTitle className="text-lg">How AI Auto-Response Works</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-3">
                        <div className="p-3 bg-white rounded-lg border border-slate-200">
                            <p className="text-sm font-semibold text-slate-900 mb-1">1. Customer Inquiry Detected</p>
                            <p className="text-xs text-slate-600">
                                AI analyzes the message for sentiment, urgency, and category
                            </p>
                        </div>

                        <div className="p-3 bg-white rounded-lg border border-slate-200">
                            <p className="text-sm font-semibold text-slate-900 mb-1">2. Context Gathering</p>
                            <p className="text-xs text-slate-600">
                                AI checks order history, past interactions, and product details
                            </p>
                        </div>

                        <div className="p-3 bg-white rounded-lg border border-slate-200">
                            <p className="text-sm font-semibold text-slate-900 mb-1">3. Response Generation</p>
                            <p className="text-xs text-slate-600">
                                AI crafts personalized response using your tone and custom instructions
                            </p>
                        </div>

                        <div className="p-3 bg-white rounded-lg border border-slate-200">
                            <p className="text-sm font-semibold text-slate-900 mb-1">4. Quality Check & Send</p>
                            <p className="text-xs text-slate-600">
                                Response is verified for accuracy and appropriateness, then sent or queued for review
                            </p>
                        </div>
                    </div>

                    <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                        <p className="text-sm font-semibold text-amber-900 mb-1">💡 Pro Tip</p>
                        <p className="text-xs text-amber-800">
                            Start with auto-response disabled and review AI suggestions. Once confident in the quality, 
                            enable auto-response for low-risk categories like "general inquiry" and "product question".
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}