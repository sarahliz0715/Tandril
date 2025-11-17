import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, Target, Info } from 'lucide-react';
import { toast } from 'sonner';

export default function CreateCampaignModal({ isOpen, onClose, onSave }) {
    const [campaignData, setCampaignData] = useState({
        name: '',
        objective: 'LINK_CLICKS',
        budget: { daily_amount: 20 },
        targeting: {
            locations: { countries: ['US'] },
            age_min: 25,
            age_max: 65,
            interests: []
        },
        creatives: {
            headline: '',
            primary_text: ''
        }
    });
    const [adAccountId, setAdAccountId] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleChange = (path, value) => {
        setCampaignData(prev => {
            const keys = path.split('.');
            const new_data = { ...prev };
            let current = new_data;
            for (let i = 0; i < keys.length - 1; i++) {
                current = current[keys[i]];
            }
            current[keys[keys.length - 1]] = value;
            return new_data;
        });
    };

    const handleSave = async () => {
        if (!adAccountId) {
            toast.error("Ad Account ID is required.");
            return;
        }
        if (!campaignData.name) {
            toast.error("Campaign Name is required.");
            return;
        }
        setIsSaving(true);
        await onSave({ ...campaignData, adAccountId });
        setIsSaving(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] grid-rows-[auto,1fr,auto]">
                 <DialogHeader>
                    <DialogTitle className="text-2xl">Launch New Ad Campaign</DialogTitle>
                    <DialogDescription>
                        Configure your campaign details. Tandril will create and optimize it on Facebook.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4 overflow-y-auto px-6 max-h-[70vh]">
                    <div className="space-y-2">
                        <Label htmlFor="ad-account-id" className="text-base font-semibold">Ad Account ID</Label>
                        <Input 
                            id="ad-account-id" 
                            value={adAccountId} 
                            onChange={(e) => setAdAccountId(e.target.value)} 
                            placeholder="e.g., 123456789012345" 
                        />
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                            <Info className="w-3 h-3" />
                            Find this in your Facebook Ads Manager URL (act=...).
                        </p>
                    </div>

                    <div className="h-px bg-slate-200" />

                    <div className="space-y-2">
                        <Label htmlFor="name" className="text-base font-semibold">Campaign Name</Label>
                        <Input id="name" value={campaignData.name} onChange={(e) => handleChange('name', e.target.value)} placeholder="e.g., Summer Sale 2024" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="objective" className="text-base font-semibold">Objective</Label>
                            <Select value={campaignData.objective} onValueChange={(value) => handleChange('objective', value)}>
                                <SelectTrigger id="objective">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="LINK_CLICKS">Traffic (Link Clicks)</SelectItem>
                                    <SelectItem value="CONVERSIONS">Conversions</SelectItem>
                                    <SelectItem value="REACH">Brand Awareness (Reach)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="budget" className="text-base font-semibold">Daily Budget</Label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input 
                                    id="budget"
                                    type="number"
                                    className="pl-8"
                                    value={campaignData.budget.daily_amount}
                                    onChange={(e) => handleChange('budget.daily_amount', parseFloat(e.target.value))}
                                />
                            </div>
                        </div>
                    </div>
                    
                    <div className="h-px bg-slate-200" />

                    <div>
                        <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                            <Target className="w-5 h-5 text-indigo-500" />
                            Ad Creative
                        </h3>
                        <div className="space-y-4 rounded-lg border bg-slate-50 p-4">
                            <div className="space-y-2">
                                <Label htmlFor="headline">Headline</Label>
                                <Input id="headline" value={campaignData.creatives.headline} onChange={(e) => handleChange('creatives.headline', e.target.value)} placeholder="e.g., Get 50% Off Today!" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="primary_text">Primary Text</Label>
                                <Textarea id="primary_text" value={campaignData.creatives.primary_text} onChange={(e) => handleChange('creatives.primary_text', e.target.value)} placeholder="Describe your offer and product..." />
                            </div>
                        </div>
                    </div>

                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? 'Launching...' : 'Launch Campaign'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}