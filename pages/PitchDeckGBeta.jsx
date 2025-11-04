import React from 'react';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

export default function PitchDeckGBeta() {
  return (
    <>
      <style>{`
        @media print {
          /* Hide navigation and UI elements */
          nav, header, aside, footer, button, .no-print {
            display: none !important;
          }
          
          /* Reset page margins */
          @page {
            margin: 0;
            size: letter portrait;
          }
          
          /* Make sure body takes full page */
          body, html {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
          }
          
          /* Each slide is a page */
          .slide {
            page-break-after: always;
            page-break-inside: avoid;
            min-height: 100vh;
            width: 100%;
            padding: 2rem;
            display: flex;
            flex-direction: column;
            justify-content: center;
            box-sizing: border-box;
          }
          
          .slide:last-child {
            page-break-after: auto;
          }
          
          /* Ensure colors print */
          * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
      
      <div className="bg-white">
        <div className="no-print mb-6">
          <Button onClick={() => window.print()} className="bg-green-600 hover:bg-green-700">
            <Printer className="w-4 h-4 mr-2" />
            Print / Save as PDF
          </Button>
        </div>

        {/* Slide 1: Cover */}
        <div className="slide min-h-screen flex items-center justify-center bg-gradient-to-br from-green-600 to-emerald-700 text-white p-12">
          <div className="text-center">
            <h1 className="text-7xl font-bold mb-6">Tandril</h1>
            <p className="text-4xl mb-12">AI-Powered E-Commerce Automation</p>
            <p className="text-2xl">gBETA Madison Application</p>
          </div>
        </div>

        {/* Slide 2: The Problem */}
        <div className="slide min-h-screen p-12 bg-gradient-to-br from-red-50 to-orange-50">
          <h2 className="text-5xl font-bold text-red-900 mb-8">The Problem</h2>
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-lg border-l-8 border-red-500">
              <h3 className="text-2xl font-bold text-slate-900 mb-3">E-commerce Sellers Are Drowning in Manual Work</h3>
              <ul className="space-y-3 text-lg text-slate-700">
                <li>• Managing inventory, pricing, and listings across multiple platforms (Shopify, Etsy, Amazon) takes 20+ hours/week</li>
                <li>• SEO optimization and product description updates are tedious and time-consuming</li>
                <li>• Responding to customer messages, tracking orders, and managing ad campaigns adds even more overhead</li>
              </ul>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg border-l-8 border-orange-500">
              <h3 className="text-2xl font-bold text-slate-900 mb-3">Existing Tools Fall Short</h3>
              <ul className="space-y-3 text-lg text-slate-700">
                <li>• Channel management tools (Sellbrite, Listing Mirror) require manual updates and lack intelligence</li>
                <li>• Analytics platforms show data but don't take action</li>
                <li>• No tool combines AI assistance with actual task execution across platforms</li>
              </ul>
            </div>

            <div className="text-2xl font-bold text-red-600 p-6 bg-red-100 rounded-lg">
              Result: Sellers spend more time managing tools than growing their business
            </div>
          </div>
        </div>

        {/* Slide 3: The Solution */}
        <div className="slide min-h-screen p-12 bg-gradient-to-br from-green-50 to-emerald-50">
          <h2 className="text-5xl font-bold text-green-900 mb-8">The Solution: Tandril</h2>
          <p className="text-2xl text-slate-700 mb-8">
            An AI business partner that <span className="font-bold text-green-700">understands, advises, and executes</span> - all through natural language
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <div className="text-4xl mb-4">🤖</div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Natural Language Commands</h3>
              <p className="text-slate-700">"Update SEO for my top 10 products" → Orion analyzes, plans, and executes instantly</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg">
              <div className="text-4xl mb-4">🔄</div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Multi-Platform Automation</h3>
              <p className="text-slate-700">Sync inventory, pricing, and listings across Shopify, Etsy, Amazon, and more from one place</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg">
              <div className="text-4xl mb-4">💡</div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Proactive Insights</h3>
              <p className="text-slate-700">AI detects low inventory, pricing opportunities, and trending products - then suggests actions</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Business Advisor</h3>
              <p className="text-slate-700">Chat with Orion about strategy, get growth recommendations, and make data-driven decisions</p>
            </div>
          </div>

          <div className="mt-8 p-6 bg-green-100 rounded-lg border-2 border-green-300">
            <p className="text-xl font-bold text-green-900">
              "Tandril is like having a business analyst, VA, and technical expert - all in one AI assistant"
            </p>
          </div>
        </div>

        {/* Slide 4: How It Works */}
        <div className="slide min-h-screen p-12 bg-white">
          <h2 className="text-5xl font-bold text-slate-900 mb-12">How It Works</h2>
          
          <div className="space-y-8">
            <div className="flex items-start gap-6 bg-blue-50 p-8 rounded-xl">
              <div className="text-5xl font-bold text-blue-600">1</div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Connect Your Platforms</h3>
                <p className="text-lg text-slate-700">Securely link Shopify, Etsy, Amazon, Printful, and advertising accounts</p>
              </div>
            </div>

            <div className="flex items-start gap-6 bg-purple-50 p-8 rounded-xl">
              <div className="text-5xl font-bold text-purple-600">2</div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Tell Orion What You Need</h3>
                <p className="text-lg text-slate-700">Use natural language: "Check my inventory and alert me to low stock items"</p>
              </div>
            </div>

            <div className="flex items-start gap-6 bg-green-50 p-8 rounded-xl">
              <div className="text-5xl font-bold text-green-600">3</div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Review & Approve</h3>
                <p className="text-lg text-slate-700">Orion shows exactly what it will do before taking action</p>
              </div>
            </div>

            <div className="flex items-start gap-6 bg-orange-50 p-8 rounded-xl">
              <div className="text-5xl font-bold text-orange-600">4</div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Orion Executes & Reports</h3>
                <p className="text-lg text-slate-700">Task completed across all your platforms, with a full activity log</p>
              </div>
            </div>
          </div>
        </div>

        {/* Slide 5: Market Opportunity */}
        <div className="slide min-h-screen p-12 bg-gradient-to-br from-indigo-50 to-blue-50">
          <h2 className="text-5xl font-bold text-indigo-900 mb-8">Market Opportunity</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl shadow-lg text-center">
              <div className="text-4xl font-bold text-indigo-600 mb-2">$6.3T</div>
              <p className="text-lg text-slate-700">Global E-commerce Market (2024)</p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-lg text-center">
              <div className="text-4xl font-bold text-indigo-600 mb-2">24M+</div>
              <p className="text-lg text-slate-700">E-commerce Businesses Worldwide</p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-lg text-center">
              <div className="text-4xl font-bold text-indigo-600 mb-2">$50B+</div>
              <p className="text-lg text-slate-700">E-commerce SaaS Market</p>
            </div>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-lg">
            <h3 className="text-2xl font-bold text-slate-900 mb-4">Target Market</h3>
            <ul className="space-y-3 text-lg text-slate-700">
              <li>• <strong>Primary:</strong> SMB e-commerce sellers managing 2+ platforms ($100K-$5M revenue)</li>
              <li>• <strong>Secondary:</strong> Solo entrepreneurs and side-hustlers scaling their businesses</li>
              <li>• <strong>Future:</strong> E-commerce agencies managing multiple clients</li>
            </ul>
          </div>

          <div className="mt-8 bg-indigo-100 p-6 rounded-lg border-2 border-indigo-300">
            <p className="text-xl font-bold text-indigo-900">
              Serviceable Market: ~2M businesses selling on 2+ platforms = $2B+ TAM at $100/mo average
            </p>
          </div>
        </div>

        {/* Slide 6: Business Model */}
        <div className="slide min-h-screen p-12 bg-white">
          <h2 className="text-5xl font-bold text-slate-900 mb-8">Business Model</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-8 rounded-xl shadow-lg border-2 border-blue-200">
              <h3 className="text-3xl font-bold text-blue-900 mb-4">Pro</h3>
              <div className="text-5xl font-bold text-blue-600 mb-4">$49<span className="text-2xl text-slate-600">/mo</span></div>
              <ul className="space-y-3 text-lg text-slate-700">
                <li>✓ Connect 2 platforms</li>
                <li>✓ 100 AI commands/month</li>
                <li>✓ Basic analytics</li>
                <li>✓ Email support</li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-8 rounded-xl shadow-lg border-2 border-purple-300 relative">
              <div className="absolute -top-3 right-8 bg-purple-600 text-white px-4 py-1 rounded-full text-sm font-bold">MOST POPULAR</div>
              <h3 className="text-3xl font-bold text-purple-900 mb-4">Business</h3>
              <div className="text-5xl font-bold text-purple-600 mb-4">$299<span className="text-2xl text-slate-600">/mo</span></div>
              <ul className="space-y-3 text-lg text-slate-700">
                <li>✓ Unlimited platforms</li>
                <li>✓ Unlimited AI commands</li>
                <li>✓ Advanced analytics & reporting</li>
                <li>✓ Priority support</li>
                <li>✓ Custom workflows</li>
              </ul>
            </div>
          </div>

          <div className="bg-slate-50 p-8 rounded-xl shadow-lg">
            <h3 className="text-2xl font-bold text-slate-900 mb-4">Revenue Projections (Year 1)</h3>
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-3xl font-bold text-blue-600 mb-2">Month 6</div>
                <p className="text-lg text-slate-700">50 customers</p>
                <p className="text-xl font-bold text-slate-900">$7.5K MRR</p>
              </div>
              <div>
                <div className="text-3xl font-bold text-purple-600 mb-2">Month 9</div>
                <p className="text-lg text-slate-700">150 customers</p>
                <p className="text-xl font-bold text-slate-900">$22.5K MRR</p>
              </div>
              <div>
                <div className="text-3xl font-bold text-green-600 mb-2">Month 12</div>
                <p className="text-lg text-slate-700">300 customers</p>
                <p className="text-xl font-bold text-slate-900">$45K MRR</p>
              </div>
            </div>
          </div>
        </div>

        {/* Slide 7: Current Status & Traction */}
        <div className="slide min-h-screen p-12 bg-gradient-to-br from-green-50 to-teal-50">
          <h2 className="text-5xl font-bold text-green-900 mb-8">Current Status & Traction</h2>
          
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <h3 className="text-2xl font-bold text-slate-900 mb-4">✅ Product Development</h3>
              <ul className="space-y-2 text-lg text-slate-700">
                <li>• <strong>Functional MVP launched</strong> with Shopify integration</li>
                <li>• Core AI command execution working (SEO updates, inventory scans, bulk edits)</li>
                <li>• Orion AI Advisor with conversational interface complete</li>
                <li>• Demo mode for testing without live store impact</li>
              </ul>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg">
              <h3 className="text-2xl font-bold text-slate-900 mb-4">🎯 Beta Testing (Starting Now)</h3>
              <ul className="space-y-2 text-lg text-slate-700">
                <li>• Ready to begin recruiting beta testers</li>
                <li>• Working on seller outreach to validate product-market fit</li>
                <li>• Goal: <strong>15-20 active beta users</strong> by end of Q1 2025</li>
                <li>• <strong>Wisconsin Connection:</strong> Hoping to recruit early beta testers from Madison/Milwaukee area e-commerce community</li>
              </ul>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg">
              <h3 className="text-2xl font-bold text-slate-900 mb-4">📊 Early Validation</h3>
              <ul className="space-y-2 text-lg text-slate-700">
                <li>• Platform successfully executes real Shopify commands</li>
                <li>• Technical infrastructure proven and scalable</li>
                <li>• Ready for real-world testing with e-commerce sellers</li>
              </ul>
            </div>

            <div className="bg-green-100 p-6 rounded-lg border-2 border-green-300">
              <p className="text-xl font-bold text-green-900">
                Next 90 Days: Complete beta, gather testimonials, validate pricing, and prepare for public launch
              </p>
            </div>
          </div>
        </div>

        {/* Slide 8: Competition */}
        <div className="slide min-h-screen p-12 bg-white">
          <h2 className="text-5xl font-bold text-slate-900 mb-8">Competition</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border p-4 text-left text-lg font-bold">Feature</th>
                  <th className="border p-4 text-center text-lg font-bold text-indigo-600">Tandril</th>
                  <th className="border p-4 text-center text-lg font-bold">Sellbrite</th>
                  <th className="border p-4 text-center text-lg font-bold">Listing Mirror</th>
                  <th className="border p-4 text-center text-lg font-bold">ChatGPT</th>
                </tr>
              </thead>
              <tbody className="text-lg">
                <tr>
                  <td className="border p-4 font-semibold">Natural Language Commands</td>
                  <td className="border p-4 text-center text-green-600 text-2xl">✓</td>
                  <td className="border p-4 text-center text-red-500 text-2xl">✗</td>
                  <td className="border p-4 text-center text-red-500 text-2xl">✗</td>
                  <td className="border p-4 text-center text-yellow-500">~</td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="border p-4 font-semibold">AI Task Execution</td>
                  <td className="border p-4 text-center text-green-600 text-2xl">✓</td>
                  <td className="border p-4 text-center text-red-500 text-2xl">✗</td>
                  <td className="border p-4 text-center text-red-500 text-2xl">✗</td>
                  <td className="border p-4 text-center text-red-500 text-2xl">✗</td>
                </tr>
                <tr>
                  <td className="border p-4 font-semibold">Multi-Platform Sync</td>
                  <td className="border p-4 text-center text-green-600 text-2xl">✓</td>
                  <td className="border p-4 text-center text-green-600 text-2xl">✓</td>
                  <td className="border p-4 text-center text-green-600 text-2xl">✓</td>
                  <td className="border p-4 text-center text-red-500 text-2xl">✗</td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="border p-4 font-semibold">Business Strategy Advisor</td>
                  <td className="border p-4 text-center text-green-600 text-2xl">✓</td>
                  <td className="border p-4 text-center text-red-500 text-2xl">✗</td>
                  <td className="border p-4 text-center text-red-500 text-2xl">✗</td>
                  <td className="border p-4 text-center text-yellow-500">~</td>
                </tr>
                <tr>
                  <td className="border p-4 font-semibold">Proactive Insights</td>
                  <td className="border p-4 text-center text-green-600 text-2xl">✓</td>
                  <td className="border p-4 text-center text-red-500 text-2xl">✗</td>
                  <td className="border p-4 text-center text-red-500 text-2xl">✗</td>
                  <td className="border p-4 text-center text-red-500 text-2xl">✗</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-8 bg-indigo-50 p-6 rounded-lg border-2 border-indigo-200">
            <p className="text-xl font-bold text-indigo-900">
              <strong>Our Advantage:</strong> Tandril is the only platform that combines AI understanding, strategic advice, AND task execution in one unified experience
            </p>
          </div>
        </div>

        {/* Slide 9: Team */}
        <div className="slide min-h-screen p-12 bg-slate-50">
          <h2 className="text-5xl font-bold text-slate-900 mb-8">The Team</h2>
          <div className="space-y-8">
            <div className="bg-white p-8 rounded-xl shadow-lg">
              <h3 className="text-3xl font-bold text-slate-900 mb-2">Sarah Evenson, Founder & CEO</h3>
              <div className="text-lg text-slate-700 space-y-3">
                <p>• E-commerce entrepreneur with firsthand experience in the pain points Tandril solves</p>
                <p>• Technical background with AI/ML expertise</p>
                <p>• Deep understanding of multi-platform selling challenges from managing own business</p>
                <p>• Based in Wisconsin, connected to local e-commerce and startup community</p>
              </div>
            </div>

            <div className="bg-blue-50 p-6 rounded-lg border-2 border-blue-200">
              <h3 className="text-2xl font-bold text-blue-900 mb-4">Why I'm Building This</h3>
              <p className="text-lg text-slate-700">
                After spending countless hours managing my own e-commerce business across multiple platforms, I realized the tools available were built for a pre-AI era. Sellers need an AI partner that can actually execute - not just analyze. That's Tandril.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-xl font-bold text-slate-900 mb-3">Seeking</h3>
              <p className="text-lg text-slate-700">
                • Technical co-founder or senior engineer passionate about AI and e-commerce<br/>
                • Early team members with experience in SaaS, e-commerce, or AI/ML
              </p>
            </div>
          </div>
        </div>

        {/* Slide 10: Why gBETA */}
        <div className="slide min-h-screen p-12 bg-gradient-to-br from-purple-50 to-indigo-50">
          <h2 className="text-5xl font-bold text-purple-900 mb-8">Why gBETA Wisconsin?</h2>
          
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-xl shadow-lg">
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Perfect Timing & Fit</h3>
              <ul className="space-y-3 text-lg text-slate-700">
                <li>• <strong>Stage:</strong> We're at the ideal gBETA stage - functional MVP, ready for intensive customer validation</li>
                <li>• <strong>Market:</strong> Wisconsin has a strong e-commerce community that we want to tap for beta testing</li>
                <li>• <strong>Growth:</strong> gBETA's mentorship will accelerate our path from beta to paying customers</li>
              </ul>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-lg">
              <h3 className="text-2xl font-bold text-slate-900 mb-4">What We Need From gBETA</h3>
              <ul className="space-y-3 text-lg text-slate-700">
                <li>• <strong>Customer Development:</strong> Help refining our positioning and validating product-market fit</li>
                <li>• <strong>Network:</strong> Introductions to Wisconsin e-commerce sellers for beta testing</li>
                <li>• <strong>Mentorship:</strong> Guidance on fundraising strategy and early-stage go-to-market</li>
                <li>• <strong>Community:</strong> Connection to the Madison/Milwaukee startup ecosystem</li>
              </ul>
            </div>

            <div className="bg-purple-100 p-6 rounded-lg border-2 border-purple-300">
              <p className="text-xl font-bold text-purple-900">
                Goal: Complete gBETA with 20+ active beta users, validated pricing, and clear path to $10K MRR
              </p>
            </div>
          </div>
        </div>

        {/* Slide 11: The Ask */}
        <div className="slide min-h-screen p-12 bg-gradient-to-br from-blue-600 to-purple-800 text-white flex items-center">
          <div>
            <h2 className="text-5xl font-bold mb-8">The Ask</h2>
            
            <div className="bg-white/10 backdrop-blur p-8 rounded-xl mb-8">
              <h3 className="text-3xl font-bold mb-4">Seeking Acceptance to gBETA Wisconsin</h3>
              <p className="text-xl mb-6">
                Tandril is ready to accelerate. With gBETA's support, we'll validate our product-market fit, build a strong early customer base in Wisconsin, and position ourselves for a successful seed round.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur p-8 rounded-xl">
              <h3 className="text-2xl font-bold mb-4">Next 3 Months (If Accepted)</h3>
              <ul className="space-y-3 text-lg">
                <li>• Complete beta program with 15-20 active Wisconsin-based users</li>
                <li>• Validate pricing and iterate based on feedback</li>
                <li>• Build case studies and testimonials</li>
                <li>• Prepare for public launch Q2 2025</li>
                <li>• Begin seed fundraise conversations</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Slide 12: Contact */}
        <div className="slide min-h-screen p-12 flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
          <div className="text-center">
            <h2 className="text-6xl font-bold text-purple-900 mb-6">Let's Build the Future of E-Commerce Together</h2>
            <div className="text-2xl text-slate-700 space-y-4">
              <p className="font-semibold">Sarah Evenson</p>
              <p>Founder & CEO, Tandril</p>
              <p className="mt-4">omamahills@gmail.com</p>
              <p>tandril.com</p>
            </div>
            <div className="mt-12 text-xl text-slate-600">
              <p>Thank you for considering Tandril for gBETA Wisconsin 🚀</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}