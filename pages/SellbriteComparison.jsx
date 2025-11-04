
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bot, Check, Database, Hand, GitCompareArrows, BrainCircuit, TrendingUp, Zap, Sparkles, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const comparisonData = [
  {
    icon: GitCompareArrows,
    feature: 'Core Philosophy',
    sellbrite: {
      text: 'Manual Hub: A central dashboard for you to manage all your channels.',
      badge: 'Tool for You to Operate'
    },
    tandril: {
      text: 'Autonomous Agent: An AI employee that you command to do the work for you.',
      badge: 'System That Works For You',
      highlight: true
    },
  },
  {
    icon: Hand,
    feature: 'User Interaction',
    sellbrite: { text: 'Manual point-and-click interface. Requires user to perform all actions.' },
    tandril: {
      text: 'Natural language commands. "List new products," "Run a flash sale."',
      highlight: true
    },
  },
  {
    icon: Database,
    feature: 'Inventory Sync',
    sellbrite: { text: 'Syncs inventory quantities across channels to prevent overselling.' },
    tandril: {
      text: 'Proactively identifies trends, suggests purchase orders, and flags slow-moving stock.',
      highlight: true
    },
  },
  {
    icon: TrendingUp,
    feature: 'Pricing',
    sellbrite: { text: 'Manually update prices or set basic rules.' },
    tandril: {
      text: 'Dynamic AI-driven pricing based on sales velocity, competitor data, and profit goals.',
      highlight: true
    },
  },
  {
    icon: BrainCircuit,
    feature: 'Intelligence',
    sellbrite: {
      text: 'Provides historical sales reports for user analysis.',
      badge: 'Reactive Data'
    },
    tandril: {
      text: 'Delivers actionable insights and can execute on them automatically.',
      badge: 'Proactive Intelligence',
      highlight: true
    },
  },
  {
    icon: Zap,
    feature: 'Automation',
    sellbrite: { text: 'Limited to basic if-this-then-that rules.' },
    tandril: {
      text: 'Executes complex, multi-step workflows autonomously across all platforms.',
      highlight: true
    },
  },
];

export default function SellbriteComparison() {
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="text-center mb-4">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 mb-3">Tandril vs. Sellbrite</h1>
        <p className="text-lg text-slate-600">From Manual Control to Autonomous Operation</p>
      </div>

      <div className="flex justify-center mb-10">
        <Link to={createPageUrl('PrintableComparison')} target="_blank">
            <Button variant="outline">
                <Printer className="w-4 h-4 mr-2"/>
                Printable Version
            </Button>
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-12">
        <Card className="border-2 border-slate-300 bg-slate-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl text-slate-800">
              <Hand className="w-8 h-8 text-slate-600" />
              Sellbrite: The Manual Hub
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-700">
              Sellbrite is a powerful tool for consolidating your sales channels into one place. It requires you to manually manage listings, update inventory, and process orders. It's a better way to do the same work.
            </p>
            <Badge variant="secondary" className="mt-4">You are the operator</Badge>
          </CardContent>
        </Card>
        <Card className="border-2 border-indigo-400 bg-gradient-to-br from-indigo-50 to-purple-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl text-indigo-800">
              <Bot className="w-8 h-8 text-indigo-600" />
              Tandril: The AI Employee
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-indigo-900">
              Tandril is an AI agent that takes commands and executes them for you. It automates complex tasks, provides strategic insights, and operates your e-commerce business autonomously. It's a new way of working.
            </p>
            <Badge className="mt-4 bg-indigo-600 text-white">You are the strategist</Badge>
          </CardContent>
        </Card>
      </div>
      
      <Card className="bg-white/80 backdrop-blur-sm border border-slate-200/60 shadow-lg">
        <CardHeader>
            <CardTitle className="text-xl">Feature Philosophy Comparison</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="space-y-4">
                {comparisonData.map((item, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-lg border border-slate-200">
                        <div className="md:col-span-1 font-semibold text-slate-800 flex items-center gap-3">
                            <item.icon className="w-5 h-5 text-slate-500"/>
                            {item.feature}
                        </div>
                        <div className="md:col-span-1">
                            <p className="text-sm text-slate-600">{item.sellbrite.text}</p>
                            {item.sellbrite.badge && <Badge variant="secondary" className="mt-2 text-xs">{item.sellbrite.badge}</Badge>}
                        </div>
                        <div className={`md:col-span-1 p-3 rounded-md ${item.tandril.highlight ? 'bg-green-50' : ''}`}>
                            <p className={`text-sm ${item.tandril.highlight ? 'font-semibold text-green-900' : 'text-slate-600'}`}>{item.tandril.text}</p>
                            {item.tandril.badge && <Badge className={`mt-2 text-xs ${item.tandril.highlight ? 'bg-green-200 text-green-800' : ''}`}>{item.tandril.badge}</Badge>}
                        </div>
                    </div>
                ))}
            </div>
        </CardContent>
      </Card>

      <Card className="mt-12 bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-8 rounded-2xl">
        <div className="flex flex-col md:flex-row items-center gap-6">
            <Sparkles className="w-16 h-16 text-yellow-300 flex-shrink-0" />
            <div>
                <h3 className="text-2xl font-bold mb-2">The Bottom Line</h3>
                <p className="text-lg opacity-90">
                    Sellbrite helps you manage your e-commerce workload more efficiently. Tandril aims to eliminate that workload entirely, freeing you to focus on strategy and growth, not operations.
                </p>
            </div>
        </div>
      </Card>
    </div>
  );
}
