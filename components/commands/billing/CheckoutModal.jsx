import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, Store } from "lucide-react";

export default function CheckoutModal({ isOpen, onClose, plan }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Store className="w-5 h-5" />
            Change Your Plan
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-slate-600">
            To upgrade to <strong>{plan?.name}</strong>, manage your subscription through your Shopify admin.
          </p>
          <ol className="text-sm text-slate-600 space-y-1 list-decimal list-inside">
            <li>Go to your Shopify admin</li>
            <li>Click <strong>Apps</strong> in the sidebar</li>
            <li>Find <strong>Tandril</strong> and click it</li>
            <li>Select your new plan under Billing</li>
          </ol>
          <p className="text-xs text-slate-400">Your plan will update in Tandril automatically after approval.</p>
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            onClick={() => { window.open('https://admin.shopify.com/apps', '_blank'); onClose(); }}
          >
            Open Shopify Admin
            <ExternalLink className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
