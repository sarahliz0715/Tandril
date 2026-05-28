import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, CheckCircle, Loader2, Shield } from "lucide-react";
import { api } from '@/lib/apiClient';

export default function CheckoutModal({ isOpen, onClose, plan, isAnnual, onSuccess }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const price = isAnnual ? plan.annualPrice : plan.monthlyPrice;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    setError('');

    try {
      const planId = plan.id; // starter, professional, or enterprise
      const result = await api.functions.invoke('shopify-billing', {
        action: 'create',
        planId,
      });

      if (result?.confirmationUrl) {
        // Redirect to Shopify billing confirmation page
        window.location.href = result.confirmationUrl;
      } else {
        throw new Error('No confirmation URL received from Shopify');
      }
    } catch (err) {
      console.error('Billing error:', err);
      setError(err.message || 'Something went wrong. Please try again.');
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

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-slate-500 p-2 bg-slate-50 rounded">
              <Shield className="w-4 h-4" />
              <span>Billed securely through Shopify</span>
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
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Redirecting...
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
