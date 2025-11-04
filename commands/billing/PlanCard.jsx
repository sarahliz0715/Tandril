
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Zap, Crown, Building2 } from 'lucide-react';

export default function PlanCard({ plan, isCurrentPlan, onSelectPlan, isLoading }) {
    const getIcon = () => {
        switch (plan.id) {
            case 'free': return <Zap className="w-5 h-5" />;
            case 'professional': return <Crown className="w-5 h-5" />;
            case 'enterprise': return <Building2 className="w-5 h-5" />;
            default: return <Zap className="w-5 h-5" />;
        }
    };

    const getButtonText = () => {
        if (isCurrentPlan) return 'Current Plan';
        if (plan.id === 'free') return 'Get Started Free'; // NO credit card required!
        return 'Upgrade Now';
    };

    return (
        <Card className={`relative h-full ${plan.featured ? 'ring-2 ring-indigo-500 shadow-lg' : ''}`}>
            {plan.featured && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-4 py-1">
                    Most Popular
                </Badge>
            )}
            
            <CardHeader className="text-center pb-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                    {getIcon()}
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                </div>
                
                <div className="space-y-2">
                    <div className="text-3xl font-bold">
                        {plan.price === 0 ? 'Free' : `$${plan.price}`}
                        {plan.price > 0 && <span className="text-lg font-normal text-slate-600">/month</span>}
                    </div>
                    
                    {/* Ethical pricing messaging */}
                    {plan.id === 'free' && (
                        <p className="text-sm text-green-600 font-medium">
                            ✅ No Credit Card Required
                        </p>
                    )}
                    
                    <p className="text-slate-600">{plan.description}</p>
                </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
                <ul className="space-y-3">
                    {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2">
                            <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{feature}</span>
                        </li>
                    ))}
                </ul>
                
                <Button
                    variant={plan.featured ? 'default' : 'outline'}
                    className="w-full"
                    onClick={() => onSelectPlan(plan)}
                    disabled={isCurrentPlan || isLoading}
                >
                    {getButtonText()}
                </Button>
                
                {plan.id === 'free' && (
                    <p className="text-xs text-center text-slate-500">
                        Just free. Upgrade anytime you're ready.
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
