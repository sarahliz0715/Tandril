import React from 'react';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

export default function PitchDeckYC() {
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
          <Button onClick={() => window.print()} className="bg-orange-600 hover:bg-orange-700">
            <Printer className="w-4 h-4 mr-2" />
            Print / Save as PDF
          </Button>
        </div>

        {/* Slide 1: Cover - YC Style */}
        <div className="slide min-h-screen flex items-center justify-center bg-orange-500 text-white p-12">
          <div className="text-center">
            <h1 className="text-7xl font-bold mb-4">Tandril</h1>
            <p className="text-4xl mb-12">AI Employee for E-Commerce Sellers</p>
            <div className="text-2xl">
              <p>YC W25 Application</p>
            </div>
          </div>
        </div>

        {/* Slide 2: One-Line Description */}
        <div className="slide min-h-screen flex items-center justify-center p-12">
          <div className="text-center max-w-4xl">
            <h2 className="text-6xl font-bold text-slate-900 mb-8">Tandril is Zapier meets ChatGPT for e-commerce sellers</h2>
            <p className="text-3xl text-slate-600">
              Talk to your AI assistant in plain English, and it executes tasks across Shopify, Amazon, Etsy automatically
            </p>
          </div>
        </div>

        {/* Slide 3: Problem - YC format emphasizes clarity */}
        <div className="slide min-h-screen p-12">
          <h2 className="text-6xl font-bold text-slate-900 mb-12">Problem</h2>
          <div className="space-y-8 text-2xl text-slate-700">
            <p className="bg-red-50 p-8 rounded-lg border-l-8 border-red-500">
              <strong>E-commerce sellers waste 15-20 hours/week</strong> manually updating listings, checking inventory, and optimizing SEO across multiple platforms
            </p>
            <p className="bg-amber-50 p-8 rounded-lg border-l-8 border-amber-500">
              Existing tools (Sellbrite, ChannelAdvisor) <strong>centralize data but don't execute actions</strong>
            </p>
            <p className="bg-orange-50 p-8 rounded-lg border-l-8 border-orange-500">
              Sellers still do everything manually - they need an <strong>AI employee, not another dashboard</strong>
            </p>
          </div>
        </div>

        {/* Slide 4: Solution */}
        <div className="slide min-h-screen p-12 bg-gradient-to-br from-orange-50 to-amber-50">
          <h2 className="text-6xl font-bold text-slate-900 mb-12">Solution</h2>
          <div className="bg-white p-12 rounded-2xl shadow-2xl">
            <h3 className="text-4xl font-bold text-orange-600 mb-8">Orion: Your AI Business Partner</h3>
            <div className="space-y-6 text-2xl text-slate-700">
              <p>✅ <strong>Natural language commands:</strong> "Update SEO for my top 50 products"</p>
              <p>✅ <strong>Autonomous execution:</strong> Directly modifies Shopify, Etsy, Amazon via APIs</p>
              <p>✅ <strong>Proactive suggestions:</strong> "Your winter hoodies are trending - want to boost their SEO?"</p>
              <p>✅ <strong>Recurring automations:</strong> "Every Monday, check inventory and alert low stock"</p>
            </div>
          </div>
        </div>

        {/* Slide 5: Traction - YC loves metrics */}
        <div className="slide min-h-screen p-12">
          <h2 className="text-6xl font-bold text-slate-900 mb-12">Traction</h2>
          <div className="grid grid-cols-2 gap-8">
            <div className="bg-green-50 p-8 rounded-xl border-2 border-green-300">
              <p className="text-7xl font-bold text-green-600 mb-4">15</p>
              <p className="text-2xl text-slate-700">Beta users onboarding this month</p>
            </div>
            <div className="bg-blue-50 p-8 rounded-xl border-2 border-blue-300">
              <p className="text-7xl font-bold text-blue-600 mb-4">20+</p>
              <p className="text-2xl text-slate-700">Seller interviews validating PMF</p>
            </div>
            <div className="bg-purple-50 p-8 rounded-xl border-2 border-purple-300">
              <p className="text-7xl font-bold text-purple-600 mb-4">100%</p>
              <p className="text-2xl text-slate-700">Shopify integration complete</p>
            </div>
            <div className="bg-orange-50 p-8 rounded-xl border-2 border-orange-300">
              <p className="text-7xl font-bold text-orange-600 mb-4">$149</p>
              <p className="text-2xl text-slate-700">Target MRR per customer</p>
            </div>
          </div>
        </div>

        {/* Slide 6: Market Size */}
        <div className="slide min-h-screen p-12 bg-slate-50">
          <h2 className="text-6xl font-bold text-slate-900 mb-12">Market</h2>
          <div className="space-y-8">
            <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white p-10 rounded-xl">
              <h3 className="text-3xl font-bold mb-4">$6.3 Trillion Global E-Commerce (2024)</h3>
              <p className="text-2xl">Growing 10-12% annually</p>
            </div>
            <div className="grid grid-cols-3 gap-6">
              <div className="bg-white p-8 rounded-xl shadow-lg text-center">
                <p className="text-sm text-slate-600 mb-2">TAM</p>
                <p className="text-5xl font-bold text-orange-600 mb-2">$8.5B</p>
                <p className="text-slate-600">E-commerce software market</p>
              </div>
              <div className="bg-white p-8 rounded-xl shadow-lg text-center">
                <p className="text-sm text-slate-600 mb-2">SAM</p>
                <p className="text-5xl font-bold text-orange-600 mb-2">$2.1B</p>
                <p className="text-slate-600">Multi-channel sellers</p>
              </div>
              <div className="bg-white p-8 rounded-xl shadow-lg text-center">
                <p className="text-sm text-slate-600 mb-2">SOM (Y3)</p>
                <p className="text-5xl font-bold text-orange-600 mb-2">$5.4M</p>
                <p className="text-slate-600">2,000 customers</p>
              </div>
            </div>
          </div>
        </div>

        {/* Slide 7: Business Model */}
        <div className="slide min-h-screen p-12">
          <h2 className="text-6xl font-bold text-slate-900 mb-12">Business Model</h2>
          <div className="grid grid-cols-3 gap-8 mb-12">
            <div className="bg-white p-8 rounded-xl shadow-xl text-center">
              <h3 className="text-2xl font-bold mb-4">Professional</h3>
              <p className="text-6xl font-bold text-orange-600 mb-6">$149</p>
              <p className="text-slate-600">per month</p>
            </div>
            <div className="bg-gradient-to-br from-orange-500 to-red-600 text-white p-8 rounded-xl shadow-2xl text-center">
              <h3 className="text-2xl font-bold mb-4">Business</h3>
              <p className="text-6xl font-bold mb-6">$299</p>
              <p>per month</p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-xl text-center">
              <h3 className="text-2xl font-bold mb-4">Enterprise</h3>
              <p className="text-6xl font-bold text-orange-600 mb-6">Custom</p>
              <p className="text-slate-600">pricing</p>
            </div>
          </div>
          <div className="bg-green-50 p-8 rounded-xl border-2 border-green-300">
            <h3 className="text-3xl font-bold text-green-900 mb-4">Unit Economics</h3>
            <div className="grid grid-cols-3 gap-6 text-xl">
              <div>
                <p className="text-slate-600">CAC</p>
                <p className="text-4xl font-bold text-slate-900">$180</p>
              </div>
              <div>
                <p className="text-slate-600">LTV</p>
                <p className="text-4xl font-bold text-slate-900">$5,364</p>
              </div>
              <div>
                <p className="text-slate-600">LTV:CAC</p>
                <p className="text-4xl font-bold text-green-600">30:1</p>
              </div>
            </div>
          </div>
        </div>

        {/* Slide 8: Why Now */}
        <div className="slide min-h-screen p-12 bg-gradient-to-br from-orange-50 to-amber-50">
          <h2 className="text-6xl font-bold text-slate-900 mb-12">Why Now?</h2>
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-xl shadow-lg border-l-8 border-orange-500">
              <h3 className="text-3xl font-bold text-slate-900 mb-3">🤖 LLMs are finally good enough</h3>
              <p className="text-2xl text-slate-700">GPT-4 and Claude 3.5 can reliably understand intent and execute multi-step tasks</p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-lg border-l-8 border-red-500">
              <h3 className="text-3xl font-bold text-slate-900 mb-3">📈 E-commerce complexity exploding</h3>
              <p className="text-2xl text-slate-700">Average seller now on 3.2 platforms (up from 1.8 in 2020)</p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-lg border-l-8 border-amber-500">
              <h3 className="text-3xl font-bold text-slate-900 mb-3">🔧 APIs are ready</h3>
              <p className="text-2xl text-slate-700">Shopify, Amazon, Etsy all have robust APIs for programmatic control</p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-lg border-l-8 border-yellow-500">
              <h3 className="text-3xl font-bold text-slate-900 mb-3">💸 Sellers are desperate</h3>
              <p className="text-2xl text-slate-700">Time-starved entrepreneurs will pay premium for true automation</p>
            </div>
          </div>
        </div>

        {/* Slide 9: Team */}
        <div className="slide min-h-screen p-12">
          <h2 className="text-6xl font-bold text-slate-900 mb-12">Team</h2>
          <div className="bg-white p-12 rounded-2xl shadow-2xl">
            <h3 className="text-4xl font-bold text-slate-900 mb-6">Sarah Omama - Founder</h3>
            <div className="text-2xl text-slate-700 space-y-4">
              <p>✓ E-commerce seller with firsthand pain experience</p>
              <p>✓ AI/ML technical background</p>
              <p>✓ Built MVP in 3 months</p>
              <p>✓ Secured first 15 beta users</p>
            </div>
          </div>
          <div className="mt-8 bg-orange-50 p-8 rounded-xl border-2 border-orange-300">
            <h3 className="text-3xl font-bold text-orange-900 mb-4">Looking for:</h3>
            <p className="text-2xl text-slate-700">Technical co-founder with AI/backend expertise</p>
          </div>
        </div>

        {/* Slide 10: The Ask - YC style */}
        <div className="slide min-h-screen flex items-center justify-center bg-orange-500 text-white p-12">
          <div className="text-center">
            <h2 className="text-7xl font-bold mb-12">The Ask</h2>
            <div className="bg-white/10 backdrop-blur p-12 rounded-2xl text-3xl space-y-6">
              <p>Join YC W25 batch</p>
              <p>$500K on standard terms</p>
              <p>Help us find a technical co-founder</p>
              <p>Access to YC network & mentorship</p>
            </div>
            <div className="mt-16 text-2xl">
              <p className="font-bold mb-4">Sarah Omama</p>
              <p>omamahills@gmail.com</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}