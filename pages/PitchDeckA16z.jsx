import React from 'react';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

export default function PitchDeckA16z() {
  return (
    <>
      <style>{`
        @media print {
          body > div:first-child > div > .hidden.lg\\:flex,
          body > div:first-child > div > .relative.z-50,
          body > div:first-child > div > .lg\\:pl-72 > .sticky,
          body > div:first-child > div > .lg\\:pl-72 > .py-6,
          .no-print {
            display: none !important;
          }
          .lg\\:pl-72 { padding-left: 0 !important; }
          main { padding: 0 !important; }
          .slide { page-break-after: always; min-height: 100vh; padding: 3rem !important; }
        }
      `}</style>
      
      <div className="bg-white">
        <div className="no-print fixed top-4 right-4 z-50">
          <Button onClick={() => window.print()} className="bg-red-600 hover:bg-red-700">
            <Printer className="w-4 h-4 mr-2" />
            Print / Save as PDF
          </Button>
        </div>

        {/* Cover - a16z style */}
        <div className="slide min-h-screen flex items-center justify-center bg-gradient-to-br from-red-600 to-rose-700 text-white p-12">
          <div className="text-center">
            <h1 className="text-7xl font-bold mb-6">Tandril</h1>
            <p className="text-4xl mb-12">The Autonomous AI Layer for E-Commerce</p>
            <p className="text-2xl opacity-90">Andreessen Horowitz Pitch</p>
          </div>
        </div>

        {/* Big Idea - a16z loves this */}
        <div className="slide min-h-screen p-12 bg-slate-50">
          <h2 className="text-5xl font-bold text-red-900 mb-8">The Big Idea</h2>
          <div className="bg-white p-12 rounded-2xl shadow-2xl border-l-8 border-red-600">
            <p className="text-4xl text-slate-800 font-bold mb-6">
              E-commerce is ready for autonomous AI agents
            </p>
            <p className="text-2xl text-slate-600">
              We're building the first truly autonomous AI employee for e-commerce sellers - one that understands, executes, and optimizes across all platforms without human intervention.
            </p>
          </div>
          <div className="mt-8 bg-gradient-to-r from-red-50 to-rose-50 p-8 rounded-xl">
            <p className="text-xl text-slate-700">
              <strong>The shift:</strong> From "AI as a co-pilot" to "AI as an autonomous employee" - this is the future of work, starting with e-commerce.
            </p>
          </div>
        </div>

        {/* Placeholder for comprehensive a16z deck */}
        <div className="slide min-h-screen flex items-center justify-center p-12">
          <div className="text-center">
            <h2 className="text-5xl font-bold text-red-900 mb-6">Comprehensive Deck In Development</h2>
            <p className="text-2xl text-slate-600">a16z-style deep dive coming soon</p>
          </div>
        </div>
      </div>
    </>
  );
}