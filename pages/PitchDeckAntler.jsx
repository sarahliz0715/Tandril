import React from 'react';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

export default function PitchDeckAntler() {
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
          <Button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700">
            <Printer className="w-4 h-4 mr-2" />
            Print / Save as PDF
          </Button>
        </div>

        {/* Cover - Antler style */}
        <div className="slide min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-indigo-900 text-white p-12">
          <div className="text-center">
            <h1 className="text-7xl font-bold mb-6">Tandril</h1>
            <p className="text-4xl mb-12">AI Agent Platform for E-Commerce Automation</p>
            <p className="text-2xl opacity-90">Antler Application - Early Stage Program</p>
          </div>
        </div>

        {/* Vision & Mission */}
        <div className="slide min-h-screen p-12 bg-blue-50">
          <h2 className="text-5xl font-bold text-blue-900 mb-8">Our Vision</h2>
          <div className="bg-white p-10 rounded-2xl shadow-xl mb-8">
            <p className="text-3xl text-slate-700 font-semibold">
              Empower every e-commerce entrepreneur with an AI business partner that handles operations autonomously, freeing them to focus on strategy and growth.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white p-8 rounded-xl">
              <h3 className="text-2xl font-bold mb-4">🎯 Mission</h3>
              <p className="text-lg">Transform the e-commerce landscape by making AI automation accessible and actionable for sellers of all sizes</p>
            </div>
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-8 rounded-xl">
              <h3 className="text-2xl font-bold mb-4">💡 Core Belief</h3>
              <p className="text-lg">E-commerce sellers shouldn't be operators - they should be strategists with AI doing the execution</p>
            </div>
          </div>
        </div>

        {/* Placeholder for other Antler-specific slides */}
        <div className="slide min-h-screen flex items-center justify-center p-12">
          <div className="text-center">
            <h2 className="text-5xl font-bold text-blue-900 mb-6">Full Deck Coming Soon</h2>
            <p className="text-2xl text-slate-600">Antler-tailored pitch deck in development</p>
          </div>
        </div>
      </div>
    </>
  );
}