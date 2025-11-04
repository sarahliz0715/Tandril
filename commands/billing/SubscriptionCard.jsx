import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Calendar, CreditCard, AlertCircle } from "lucide-react";
import { format } from "date-fns";

export default function SubscriptionCard({ subscription, onManage, onUpgrade }) {
  const getStatusColor = (status) => {
    const colors = {
      active: "bg-green-100 text-green-800 border-green-200",
      past_due: "bg-red-100 text-red-800 border-red-200", 
      canceled: "bg-gray-100 text-gray-800 border-gray-200",
      trialing: "bg-blue-100 text-blue-800 border-blue-200"
    };
    return colors[status] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getPlanDisplayName = (planId) => {
    const names = {
      free: "Free",
      professional: "Professional", 
      enterprise: "Enterprise",
      agency: "Agency"
    };
    return names[planId] || planId;
  };

  if (!subscription) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Crown className="w-5 h-5 text-purple-600" />
            No Active Subscription
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-600 mb-4">
            You don't have an active subscription yet. Choose a plan to get started with AI automation.
          </p>
          <Button onClick={onUpgrade} className="bg-indigo-600 hover:bg-indigo-700">
            View Plans
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <Crown className="w-5 h-5 text-purple-600" />
          Current Subscription
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-slate-900 text-lg">
              {getPlanDisplayName(subscription.plan_id)}
            </h4>
            <p className="text-slate-600">
              ${subscription.price}/{subscription.billing_cycle === 'annual' ? 'year' : 'month'}
            </p>
          </div>
          <Badge className={getStatusColor(subscription.status)}>
            {subscription.status}
          </Badge>
        </div>

        {subscription.trial_end && new Date(subscription.trial_end) > new Date() && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-blue-900 font-medium">Trial Period</p>
              <p className="text-blue-700 text-sm">
                Your trial ends on {format(new Date(subscription.trial_end), 'MMM d, yyyy')}
              </p>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-500" />
            <div>
              <p className="text-sm font-medium text-slate-900">Next Billing</p>
              <p className="text-sm text-slate-600">
                {format(new Date(subscription.current_period_end), 'MMM d, yyyy')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-slate-500" />
            <div>
              <p className="text-sm font-medium text-slate-900">Billing Cycle</p>
              <p className="text-sm text-slate-600 capitalize">
                {subscription.billing_cycle}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 rounded-lg p-4">
          <h5 className="font-medium text-slate-900 mb-2">Usage This Month</h5>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>AI Commands</span>
              <span>
                {subscription.usage_limits?.commands_used_this_month || 0} / {subscription.features?.max_commands_per_month === -1 ? '∞' : subscription.features?.max_commands_per_month}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Platform Connections</span>
              <span>
                {subscription.usage_limits?.platforms_connected || 0} / {subscription.features?.max_platforms === -1 ? '∞' : subscription.features?.max_platforms}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onManage} className="flex-1">
            Manage Billing
          </Button>
          {subscription.plan_id !== 'enterprise' && subscription.plan_id !== 'agency' && (
            <Button onClick={onUpgrade} className="flex-1 bg-indigo-600 hover:bg-indigo-700">
              Upgrade Plan
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}