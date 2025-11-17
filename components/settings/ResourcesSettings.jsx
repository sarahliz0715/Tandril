import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Scaling, FileText, ArrowRight, Loader2, Trash2, Presentation } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function ResourcesSettings({ user }) {
  const [isClearing, setIsClearing] = useState(false);
  const { toast } = useToast();

  const handleClearDemoData = async () => {
    if (!confirm('Are you sure you want to clear all demo data? This will delete all fake orders, products, alerts, and other demo records. This cannot be undone.')) {
      return;
    }

    setIsClearing(true);
    try {
      const { clearDemoData } = await import('@/api/functions');
      const response = await clearDemoData({});

      if (response.data.success) {
        toast({
          title: 'Success!',
          description: `Cleared ${response.data.message}`,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Failed to clear some demo data',
          description: 'Check console for details',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to clear demo data',
        description: error.message,
      });
    } finally {
      setIsClearing(false);
    }
  };

  const handleClearOrders = async () => {
    if (!confirm('Are you sure you want to clear all demo orders? This cannot be undone.')) {
      return;
    }

    setIsClearing(true);
    try {
      const { clearDemoData } = await import('@/api/functions');
      const response = await clearDemoData({
        entity_types: ['Order', 'OrderItem']
      });

      if (response.data.success) {
        toast({
          title: 'Success!',
          description: 'Demo orders cleared successfully',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Failed to clear demo orders',
          description: response.data.message || 'An unexpected error occurred.',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to clear demo orders',
        description: error.message,
      });
    } finally {
      setIsClearing(false);
    }
  };

  const pitchDecks = [
    {
      name: 'Afore VC FIR Program',
      description: 'Pitch deck tailored for Afore Capital\'s Founder-in-Residence program',
      href: 'PitchDeckAfore',
      color: 'purple'
    },
    {
      name: 'Y Combinator',
      description: 'YC-style pitch deck focusing on traction and growth metrics',
      href: 'PitchDeckYC',
      color: 'orange'
    },
    {
      name: 'gBETA',
      description: 'Pitch deck for gBETA accelerator program',
      href: 'PitchDeckGBeta',
      color: 'green'
    },
    {
      name: 'Antler',
      description: 'Pitch deck for Antler\'s early-stage investment program',
      href: 'PitchDeckAntler',
      color: 'blue'
    },
    {
      name: 'Andreessen Horowitz (a16z)',
      description: 'Comprehensive pitch deck for a16z\'s investment committee',
      href: 'PitchDeckA16z',
      color: 'red'
    }
  ];

  const getColorClasses = (color) => {
    const colors = {
      purple: 'text-purple-600 bg-purple-50 hover:bg-purple-100',
      orange: 'text-orange-600 bg-orange-50 hover:bg-orange-100',
      green: 'text-green-600 bg-green-50 hover:bg-green-100',
      blue: 'text-blue-600 bg-blue-50 hover:bg-blue-100',
      red: 'text-red-600 bg-red-50 hover:bg-red-100',
      indigo: 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'
    };
    return colors[color] || colors.indigo;
  };

  return (
    <div className="space-y-6">
      {user?.user_mode === 'demo' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-600" />
              Demo Data Management
            </CardTitle>
            <CardDescription>
                Manage and clear your demo data.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start justify-between p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex-1">
                <h4 className="font-semibold text-amber-900 mb-1">Clear Demo Orders</h4>
                <p className="text-sm text-amber-700">
                  Remove all fake orders and order items from your account.
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleClearOrders}
                disabled={isClearing}
              >
                {isClearing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Clearing...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear Orders
                  </>
                )}
              </Button>
            </div>

            <div className="flex items-start justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex-1">
                <h4 className="font-semibold text-red-900 mb-1">Clear All Demo Data</h4>
                <p className="text-sm text-red-700">
                  Remove all demo data including orders, products, alerts, recommendations, and platforms. This cannot be undone.
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleClearDemoData}
                disabled={isClearing}
              >
                {isClearing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Clearing...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear All
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Presentation className="w-5 h-5 text-purple-600" />
            Pitch Decks
          </CardTitle>
          <CardDescription>
            Investor pitch decks tailored for different VCs and accelerator programs.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {pitchDecks.map((deck) => (
            <Link key={deck.href} to={createPageUrl(deck.href)}>
              <div className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${getColorClasses(deck.color)}`}>
                <div className="flex items-center gap-4">
                  <Presentation className="w-6 h-6" />
                  <div>
                    <h3 className="font-semibold text-slate-800">{deck.name}</h3>
                    <p className="text-sm text-slate-600">{deck.description}</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400" />
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resources & Guides</CardTitle>
          <CardDescription>
            Explore guides and comparisons to get the most out of Tandril.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Link to={createPageUrl('SellbriteComparison')}>
            <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-4">
                <Scaling className="w-6 h-6 text-indigo-500" />
                <div>
                  <h3 className="font-semibold text-slate-800">Tandril vs. Sellbrite</h3>
                  <p className="text-sm text-slate-500">See how we compare to traditional tools.</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400" />
            </div>
          </Link>
          <Link to={createPageUrl('Capabilities')}>
            <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-4">
                <FileText className="w-6 h-6 text-green-500" />
                <div>
                  <h3 className="font-semibold text-slate-800">Capabilities Guide</h3>
                  <p className="text-sm text-slate-500">A deep dive into what Tandril's AI can do.</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400" />
            </div>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}