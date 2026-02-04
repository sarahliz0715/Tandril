import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CreditCard, 
  CheckCircle, 
  Loader2,
  Shield,
  AlertCircle
} from "lucide-react";
import { Subscription } from '@/lib/entities';
import { User } from '@/lib/entities';

export default function CheckoutModal({ isOpen, onClose, plan, isAnnual, onSuccess }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const price = isAnnual ? plan.annualPrice : plan.monthlyPrice;
  const billingCycle = isAnnual ? 'annual' : 'monthly';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    setError('');

    try {
      const user = await User.me();
      
      await Subscription.create({
        plan_id: plan.id,
        status: 'trialing',
        billing_cycle: billingCycle,
        price: price,
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + (isAnnual ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString(),
        trial_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        stripe_subscription_id: 'sub_demo_' + Date.now(),
        features: {
          max_platforms: plan.id === 'free' ? 1 : plan.id === 'professional' ? 5 : 999,
          max_commands_per_month: plan.id === 'free' ? 10 : plan.id === 'professional' ? 500 : 9999,
          ai_model_access: plan.id === 'enterprise' ? 'advanced' : 'standard',
          priority_support: plan.id !== 'free',
          custom_integrations: plan.id === 'enterprise'
        }
      });

      await User.updateMyUserData({
        subscription_tier: plan.id
      });

      onSuccess();
    } catch (error) {
      console.error('Subscription creation error:', error);
      setError('Payment processing failed. Please try again or contact support.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <CreditCard className="w-5 h-5" />
            Subscribe to {plan?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Card className="bg-slate-50 border-slate-200">
            <CardContent className="p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">{plan?.name} Plan</span>
                <span className="font-bold">${price}/{isAnnual ? 'year' : 'month'}</span>
              </div>
              <div className="flex gap-2">
                <Badge className="bg-green-100 text-green-700 text-xs">14-day free trial</Badge>
                {isAnnual && (
                  <Badge className="bg-blue-100 text-blue-700 text-xs">Save 20%</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="text-sm text-amber-800 font-medium">Demo Mode</p>
                <p className="text-xs text-amber-700">This creates a demo subscription. Contact sarah@tandril.com for real billing.</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-slate-500 p-2 bg-slate-50 rounded">
              <Shield className="w-4 h-4" />
              <span>Demo subscription - no payment required</span>
            </div>

            <div className="flex gap-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                className="flex-1"
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Start Trial
                    <CheckCircle className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}