
import React from 'react';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

export default function PitchDeckAfore() {
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
          .lg\\:pl-72 {
            padding-left: 0 !important;
          }
          main {
            padding: 0 !important;
          }
          .slide {
            page-break-after: always;
            min-height: 100vh;
            padding: 3rem !important;
          }
        }
      `}</style>
      
      <div className="bg-white">
        <div className="no-print fixed top-4 right-4 z-50">
          <Button onClick={() => window.print()} className="bg-purple-600 hover:bg-purple-700">
            <Printer className="w-4 h-4 mr-2" />
            Print / Save as PDF
          </Button>
        </div>

        {/* Slide 1: Cover */}
        <div className="slide min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-indigo-800 text-white p-12">
          <div className="text-center">
            <h1 className="text-6xl font-bold mb-6">Tandril</h1>
            <p className="text-3xl mb-8">The AI Business Partner for E-Commerce Sellers</p>
            <div className="text-xl opacity-90">
              <p>Afore Capital - Founder-in-Residence Program</p>
              <p className="mt-2">December 2024</p>
            </div>
          </div>
        </div>

        {/* Slide 2: The Problem */}
        <div className="slide min-h-screen p-12">
          <h2 className="text-5xl font-bold text-purple-900 mb-8">The Problem</h2>
          <div className="space-y-6 text-xl">
            <div className="bg-red-50 p-6 rounded-lg border-l-4 border-red-500">
              <h3 className="text-2xl font-bold text-red-900 mb-3">E-commerce sellers are drowning in operational tasks</h3>
              <ul className="space-y-3 text-slate-700">
                <li>• Manually updating 100s of product listings across multiple platforms</li>
                <li>• Spending hours checking inventory, adjusting prices, and optimizing SEO</li>
                <li>• Missing sales opportunities because they can't keep up</li>
              </ul>
            </div>
            <div className="bg-amber-50 p-6 rounded-lg border-l-4 border-amber-500">
              <h3 className="text-2xl font-bold text-amber-900 mb-3">Existing tools are not enough</h3>
              <ul className="space-y-3 text-slate-700">
                <li>• Traditional multichannel tools (Sellbrite, ChannelAdvisor) require manual work</li>
                <li>• They centralize data but don't execute actions</li>
                <li>• Sellers still spend 15-20 hours/week on repetitive tasks</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Slide 3: The Solution */}
        <div className="slide min-h-screen p-12 bg-gradient-to-br from-indigo-50 to-purple-50">
          <h2 className="text-5xl font-bold text-purple-900 mb-8">The Solution</h2>
          <div className="space-y-6 text-xl">
            <div className="bg-white p-8 rounded-xl shadow-lg">
              <h3 className="text-3xl font-bold text-indigo-900 mb-4">Tandril: Your AI Employee</h3>
              <p className="text-slate-700 text-2xl mb-6">
                An autonomous AI agent that <strong>understands</strong>, <strong>executes</strong>, and <strong>optimizes</strong> your e-commerce operations.
              </p>
            </div>
            
            <div className="grid grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="text-4xl mb-3">💬</div>
                <h4 className="font-bold text-lg mb-2 text-slate-900">Natural Language Commands</h4>
                <p className="text-slate-600 text-base">"Update SEO for my top 50 products" → Done in minutes</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="text-4xl mb-3">🤖</div>
                <h4 className="font-bold text-lg mb-2 text-slate-900">Autonomous Execution</h4>
                <p className="text-slate-600 text-base">Directly integrates with Shopify, Etsy, Amazon to take action</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="text-4xl mb-3">📊</div>
                <h4 className="font-bold text-lg mb-2 text-slate-900">Proactive Intelligence</h4>
                <p className="text-slate-600 text-base">Suggests optimizations and identifies opportunities</p>
              </div>
            </div>
          </div>
        </div>

        {/* Slide 4: Market Opportunity */}
        <div className="slide min-h-screen p-12">
          <h2 className="text-5xl font-bold text-purple-900 mb-8">Market Opportunity</h2>
          <div className="space-y-8">
            <div className="bg-purple-50 p-8 rounded-xl border-2 border-purple-200">
              <h3 className="text-3xl font-bold text-purple-900 mb-4">$6.3 Trillion E-Commerce Market (2024)</h3>
              <p className="text-xl text-slate-700">Growing at 10-12% annually, increasingly complex with multi-platform selling</p>
            </div>

            <div className="grid grid-cols-2 gap-6 text-xl">
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <h4 className="font-bold text-2xl mb-3 text-indigo-900">TAM</h4>
                <p className="text-4xl font-bold text-indigo-600 mb-2">$8.5B</p>
                <p className="text-slate-600">E-commerce automation & management software market</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <h4 className="font-bold text-2xl mb-3 text-indigo-900">SAM</h4>
                <p className="text-4xl font-bold text-indigo-600 mb-2">$2.1B</p>
                <p className="text-slate-600">Multi-channel sellers with $100K-$10M in annual revenue</p>
              </div>
            </div>

            <div className="bg-green-50 p-6 rounded-lg border-l-4 border-green-500">
              <h4 className="font-bold text-xl mb-2 text-green-900">Target Customer</h4>
              <p className="text-slate-700">E-commerce entrepreneurs selling on 2+ platforms, generating $250K-$5M annually, spending 15-25 hours/week on operational tasks</p>
            </div>
          </div>
        </div>

        {/* Slide 5: Product Demo / How It Works */}
        <div className="slide min-h-screen p-12 bg-slate-50">
          <h2 className="text-5xl font-bold text-purple-900 mb-8">How It Works</h2>
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-purple-500">
              <div className="flex items-center gap-4 mb-3">
                <div className="bg-purple-100 rounded-full w-12 h-12 flex items-center justify-center text-purple-900 font-bold text-xl">1</div>
                <h3 className="text-2xl font-bold text-slate-900">Connect Your Platforms</h3>
              </div>
              <p className="text-lg text-slate-600 ml-16">Shopify, Etsy, Amazon, Printful - one-time secure OAuth connection</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-indigo-500">
              <div className="flex items-center gap-4 mb-3">
                <div className="bg-indigo-100 rounded-full w-12 h-12 flex items-center justify-center text-indigo-900 font-bold text-xl">2</div>
                <h3 className="text-2xl font-bold text-slate-900">Talk to Orion (Your AI Agent)</h3>
              </div>
              <p className="text-lg text-slate-600 ml-16">Natural language: "Find products with low stock" or "Optimize SEO for my winter collection"</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-green-500">
              <div className="flex items-center gap-4 mb-3">
                <div className="bg-green-100 rounded-full w-12 h-12 flex items-center justify-center text-green-900 font-bold text-xl">3</div>
                <h3 className="text-2xl font-bold text-slate-900">AI Executes & Reports</h3>
              </div>
              <p className="text-lg text-slate-600 ml-16">Orion shows a plan, you confirm, it executes across all platforms, then reports results</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-blue-500">
              <div className="flex items-center gap-4 mb-3">
                <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center text-blue-900 font-bold text-xl">4</div>
                <h3 className="text-2xl font-bold text-slate-900">Automate Recurring Tasks</h3>
              </div>
              <p className="text-lg text-slate-600 ml-16">Set up workflows: "Every Monday, check inventory and alert me"</p>
            </div>
          </div>
        </div>

        {/* Slide 6: Traction & Validation */}
        <div className="slide min-h-screen p-12">
          <h2 className="text-5xl font-bold text-purple-900 mb-8">Traction & Validation</h2>
          <div className="grid grid-cols-2 gap-8">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-8 rounded-xl shadow-lg">
              <h3 className="text-2xl font-bold text-green-900 mb-4">Beta Program Launch</h3>
              <ul className="space-y-3 text-lg text-slate-700">
                <li>✅ Shopify integration complete</li>
                <li>✅ Core AI command system functional</li>
                <li>✅ First beta testers onboarding</li>
                <li>✅ Active development with weekly releases</li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-8 rounded-xl shadow-lg">
              <h3 className="text-2xl font-bold text-blue-900 mb-4">Early Validation</h3>
              <ul className="space-y-3 text-lg text-slate-700">
                <li>💬 20+ seller interviews conducted</li>
                <li>🎯 Strong product-market fit signals</li>
                <li>📊 Average 15-20 hrs/week spent on tasks we automate</li>
                <li>💰 Sellers willing to pay $99-299/mo</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 bg-purple-50 p-6 rounded-lg border-2 border-purple-200">
            <h3 className="text-xl font-bold text-purple-900 mb-3">Next 90 Days</h3>
            <ul className="text-lg text-slate-700 space-y-2">
              <li>• 10-15 active beta users generating feedback</li>
              <li>• Expand integrations (Etsy, Amazon)</li>
              <li>• Validate pricing and iterate on core workflows</li>
              <li>• Prepare for public launch Q2 2025</li>
            </ul>
          </div>
        </div>

        {/* Slide 7: Business Model */}
        <div className="slide min-h-screen p-12 bg-gradient-to-br from-purple-50 to-indigo-50">
          <h2 className="text-5xl font-bold text-purple-900 mb-8">Business Model</h2>
          
          <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <h3 className="text-xl font-bold text-slate-900 mb-3">Professional</h3>
              <p className="text-4xl font-bold text-indigo-600 mb-4">$149/mo</p>
              <ul className="text-slate-700 space-y-2">
                <li>• Up to 3 platforms</li>
                <li>• Unlimited AI commands</li>
                <li>• Standard support</li>
              </ul>
            </div>
            
            <div className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white p-6 rounded-xl shadow-xl">
              <div className="text-sm font-bold mb-2">MOST POPULAR</div>
              <h3 className="text-xl font-bold mb-3">Business</h3>
              <p className="text-4xl font-bold mb-4">$299/mo</p>
              <ul className="space-y-2">
                <li>• Up to 10 platforms</li>
                <li>• Advanced AI features</li>
                <li>• Priority support</li>
              </ul>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <h3 className="text-xl font-bold text-slate-900 mb-3">Enterprise</h3>
              <p className="text-4xl font-bold text-indigo-600 mb-4">Custom</p>
              <ul className="text-slate-700 space-y-2">
                <li>• Unlimited platforms</li>
                <li>• Custom integrations</li>
                <li>• Dedicated support</li>
              </ul>
            </div>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-lg">
            <h3 className="text-2xl font-bold text-slate-900 mb-4">Revenue Projections (Conservative)</h3>
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <p className="text-sm text-slate-600 mb-1">Year 1</p>
                <p className="text-3xl font-bold text-indigo-600">$180K</p>
                <p className="text-sm text-slate-500">100 customers @ $149 avg</p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">Year 2</p>
                <p className="text-3xl font-bold text-indigo-600">$1.2M</p>
                <p className="text-sm text-slate-500">500 customers @ $199 avg</p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">Year 3</p>
                <p className="text-3xl font-bold text-indigo-600">$5.4M</p>
                <p className="text-sm text-slate-500">2,000 customers @ $225 avg</p>
              </div>
            </div>
          </div>
        </div>

        {/* Slide 8: Competitive Advantage */}
        <div className="slide min-h-screen p-12">
          <h2 className="text-5xl font-bold text-purple-900 mb-8">Why We'll Win</h2>
          
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-purple-100 to-indigo-100 p-6 rounded-xl border-2 border-purple-300">
              <h3 className="text-2xl font-bold text-purple-900 mb-3">🚀 First-Mover Advantage in AI-Native E-Commerce Automation</h3>
              <p className="text-lg text-slate-700">We're not adapting old software to use AI - we're built AI-first from the ground up</p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <h4 className="font-bold text-xl mb-3 text-slate-900">Autonomous Execution</h4>
                <p className="text-slate-700">Competitors show you data. We take action. Massive time savings.</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <h4 className="font-bold text-xl mb-3 text-slate-900">Natural Language Interface</h4>
                <p className="text-slate-700">No training needed. Talk to Orion like you'd talk to an employee.</p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-lg">
                <h4 className="font-bold text-xl mb-3 text-slate-900">Deep Platform Integration</h4>
                <p className="text-slate-700">Direct API execution across Shopify, Etsy, Amazon, and more.</p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-lg">
                <h4 className="font-bold text-xl mb-3 text-slate-900">Proactive Intelligence</h4>
                <p className="text-slate-700">AI identifies opportunities before you ask. True business partner.</p>
              </div>
            </div>

            <div className="bg-green-50 p-6 rounded-lg border-l-4 border-green-500">
              <h4 className="font-bold text-xl mb-2 text-green-900">Network Effects</h4>
              <p className="text-lg text-slate-700">Every user teaches Orion. The more sellers, the smarter the AI becomes.</p>
            </div>
          </div>
        </div>

        {/* Slide 9: Team */}
        <div className="slide min-h-screen p-12 bg-slate-50">
          <h2 className="text-5xl font-bold text-purple-900 mb-8">The Team</h2>
          <div className="space-y-8">
            <div className="bg-white p-8 rounded-xl shadow-lg">
              <h3 className="text-3xl font-bold text-slate-900 mb-2">Sarah Evenson, Founder & CEO</h3>
              <div className="text-lg text-slate-700 space-y-3">
                <p>• E-commerce entrepreneur with firsthand experience in the pain points we solve</p>
                <p>• Technical background with AI/ML expertise</p>
                <p>• Deep understanding of multi-platform selling challenges</p>
              </div>
            </div>

            <div className="bg-purple-50 p-6 rounded-lg border-2 border-purple-200">
              <h3 className="text-2xl font-bold text-purple-900 mb-4">Why I'm Building This</h3>
              <p className="text-lg text-slate-700">
                After spending countless hours managing my own e-commerce business across multiple platforms, I realized the tools available were built for a pre-AI era. Sellers need an AI partner that can actually execute - not just analyze. That's Tandril.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-xl font-bold text-slate-900 mb-3">Seeking</h3>
              <p className="text-lg text-slate-700">
                Experienced technical co-founder and/or early team members passionate about AI and e-commerce
              </p>
            </div>
          </div>
        </div>

        {/* Slide 10: The Ask */}
        <div className="slide min-h-screen p-12 bg-gradient-to-br from-purple-600 to-indigo-800 text-white flex items-center">
          <div>
            <h2 className="text-5xl font-bold mb-8">The Ask</h2>
            
            <div className="bg-white/10 backdrop-blur p-8 rounded-xl mb-8">
              <h3 className="text-3xl font-bold mb-4">Seeking Founder-in-Residence Position at Afore</h3>
              <ul className="space-y-4 text-xl">
                <li>✓ Mentorship from Afore partners with deep AI/SaaS expertise</li>
                <li>✓ Access to Afore's network of advisors and potential hires</li>
                <li>✓ Guidance on fundraising and go-to-market strategy</li>
                <li>✓ Support in finding a technical co-founder</li>
              </ul>
            </div>

            <div className="bg-white/10 backdrop-blur p-8 rounded-xl">
              <h3 className="text-2xl font-bold mb-4">Next 6 Months</h3>
              <ul className="space-y-3 text-lg">
                <li>• Complete beta with 15-20 active users</li>
                <li>• Validate product-market fit and iterate</li>
                <li>• Build initial traction (50-100 paying customers)</li>
                <li>• Raise seed round Q2 2025</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Slide 11: Contact */}
        <div className="slide min-h-screen p-12 flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
          <div className="text-center">
            <h2 className="text-6xl font-bold text-purple-900 mb-6">Let's Build the Future of E-Commerce</h2>
            <div className="text-2xl text-slate-700 space-y-4">
              <p className="font-semibold">Sarah Evenson</p>
              <p>omamahills@gmail.com</p>
              <p>tandril.com</p>
            </div>
            <div className="mt-12 text-xl text-slate-600">
              <p>Thank you for your consideration 🚀</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
