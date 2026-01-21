import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import TandrilVineLogoLarge from '../components/logos/TandrilVineLogoLarge';
import { Bot, Hand, GitCompareArrows, BrainCircuit, TrendingUp, Zap, Database, Printer } from 'lucide-react';
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
    },
  },
  {
    icon: Hand,
    feature: 'User Interaction',
    sellbrite: { text: 'Manual point-and-click interface. Requires user to perform all actions.' },
    tandril: {
      text: 'Natural language commands. "List new products," "Run a flash sale."',
    },
  },
  {
    icon: Database,
    feature: 'Inventory Sync',
    sellbrite: { text: 'Syncs inventory quantities across channels to prevent overselling.' },
    tandril: {
      text: 'Proactively identifies trends, suggests purchase orders, and flags slow-moving stock.',
    },
  },
  {
    icon: TrendingUp,
    feature: 'Pricing',
    sellbrite: { text: 'Manually update prices or set basic rules.' },
    tandril: {
      text: 'Dynamic AI-driven pricing based on sales velocity, competitor data, and profit goals.',
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
    },
  },
  {
    icon: Zap,
    feature: 'Automation',
    sellbrite: { text: 'Limited to basic if-this-then-that rules.' },
    tandril: {
      text: 'Executes complex, multi-step workflows autonomously across all platforms.',
    },
  },
];

export default function PrintableComparison() {
  return (
    <>
      <style>{`
        @media print {
          /* Hide the app's layout and the page's own buttons */
          body > div:first-child > div > .hidden.lg\\:flex, /* Desktop sidebar */
          body > div:first-child > div > .relative.z-50, /* Mobile sidebar */
          body > div:first-child > div > .lg\\:pl-72 > .sticky, /* Header bar */
          body > div:first-child > div > .lg\\:pl-72 > .py-6, /* Welcome header */
          .no-print {
            display: none !important;
          }
          /* Ensure main content uses full width */
          .lg\\:pl-72 {
            padding-left: 0 !important;
          }
          main {
            padding: 2rem !important;
          }
        }
      `}</style>
      <div className="bg-white p-8 max-w-4xl mx-auto font-sans">
        <div className="no-print mb-8 flex justify-end gap-4">
            <Link to={createPageUrl('SellbriteComparison')}>
                <Button variant="outline">Back to Web Version</Button>
            </Link>
            <Button onClick={() => window.print()}>
                <Printer className="w-4 h-4 mr-2" />
                Print this page
            </Button>
        </div>

        <header className="flex items-center justify-between pb-8 border-b mb-8">
            <div>
                <h1 className="text-4xl font-bold text-slate-900">Tandril vs. Sellbrite</h1>
                <p className="text-lg text-slate-600 mt-1">From Manual Control to Autonomous Operation</p>
            </div>
            <TandrilVineLogoLarge className="w-20 h-20" />
        </header>

        <section className="mb-10">
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">The Bottom Line</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-lg">
                <div className="bg-slate-50 p-6 rounded-lg">
                    <h3 className="font-bold flex items-center gap-2"><Hand className="w-6 h-6 text-slate-500" /> Sellbrite</h3>
                    <p className="mt-2 text-slate-700">Helps you manage your e-commerce workload more efficiently.</p>
                </div>
                <div className="bg-green-50 p-6 rounded-lg">
                    <h3 className="font-bold flex items-center gap-2 text-green-900"><Bot className="w-6 h-6 text-green-600" /> Tandril</h3>
                    <p className="mt-2 text-green-800">Aims to eliminate that workload entirely, freeing you to focus on strategy and growth.</p>
                </div>
            </div>
        </section>

        <section>
            <h2 className="text-2xl font-semibold text-slate-800 mb-6">Feature Philosophy Comparison</h2>
            <div className="space-y-1 border-t">
              {comparisonData.map((item, index) => (
                <div key={index} className="grid grid-cols-10 gap-x-6 py-5 border-b">
                  <div className="col-span-10 md:col-span-3 font-semibold text-slate-800 flex items-center gap-3 mb-2 md:mb-0">
                      <item.icon className="w-5 h-5 text-slate-500 flex-shrink-0"/>
                      <span>{item.feature}</span>
                  </div>
                  <div className="col-span-10 md:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                          <p className="text-sm font-medium text-slate-500 mb-1">Sellbrite</p>
                          <p className="text-sm text-slate-700">{item.sellbrite.text}</p>
                      </div>
                      <div className="bg-green-50 p-3 rounded-md">
                           <p className="text-sm font-semibold text-green-800 mb-1">Tandril</p>
                           <p className="text-sm text-green-900">{item.tandril.text}</p>
                      </div>
                  </div>
                </div>
              ))}
            </div>
        </section>
        
        <footer className="text-center mt-12 pt-6 border-t">
            <p className="text-sm text-slate-500">Tandril - The Autonomous AI Employee for E-commerce</p>
        </footer>
      </div>
    </>
  );
}