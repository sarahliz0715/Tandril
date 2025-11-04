import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowRight, Sparkles, TrendingUp } from 'lucide-react';

export default function PricingActionModal({ isOpen, onClose, pricingResult, onAction }) {
    const [customPrice, setCustomPrice] = useState('');

    if (!isOpen || !pricingResult || !pricingResult.pricing_data) return null;

    const {
        product_name,
        current_price,
        suggested_price,
        reason,
        competitor_average,
        market_position
    } = pricingResult.pricing_data;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>AI Pricing Recommendation</DialogTitle>
                    <DialogDescription>Take action on the AI's suggestion for "{product_name}".</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-6">
                    <div className="flex items-center justify-around gap-4 text-center p-4 bg-slate-50 rounded-lg">
                        <div>
                            <p className="text-sm text-slate-500">Current Price</p>
                            <p className="text-2xl font-bold text-slate-700">${current_price.toFixed(2)}</p>
                        </div>
                        <ArrowRight className="w-6 h-6 text-slate-400" />
                        <div className="relative">
                            <span className="absolute -top-2 -right-3">
                                <Sparkles className="w-5 h-5 text-yellow-400 fill-yellow-300" />
                            </span>
                            <p className="text-sm text-indigo-600">Suggested Price</p>
                            <p className="text-2xl font-bold text-indigo-700">${suggested_price.toFixed(2)}</p>
                        </div>
                    </div>

                    <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
                        <h4 className="font-semibold text-blue-900 mb-2">AI's Reasoning:</h4>
                        <p className="text-sm text-blue-800">{reason}</p>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                            <div className="bg-white p-2 rounded">
                                <p className="text-xs text-slate-500">Competitor Avg.</p>
                                <p className="font-medium text-slate-800">${competitor_average.toFixed(2)}</p>
                            </div>
                             <div className="bg-white p-2 rounded">
                                <p className="text-xs text-slate-500">Market Position</p>
                                <p className="font-medium text-slate-800 capitalize">{market_position}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <Label htmlFor="custom-price">Or, set your own price:</Label>
                        <Input
                            id="custom-price"
                            type="number"
                            placeholder="e.g., 22.50"
                            value={customPrice}
                            onChange={(e) => setCustomPrice(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter className="grid grid-cols-3 gap-2">
                    <Button variant="outline" onClick={() => { onAction('ignore'); onClose(); }}>Ignore</Button>
                    <Button disabled={!customPrice} onClick={() => { onAction('apply_custom', parseFloat(customPrice)); onClose(); }}>Apply Custom</Button>
                    <Button onClick={() => { onAction('apply_suggested', suggested_price); onClose(); }}>
                        <TrendingUp className="w-4 h-4 mr-2" />
                        Apply Suggestion
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}