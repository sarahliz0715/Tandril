import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Rocket, LifeBuoy, Printer, Sparkles, Zap, Target, MessageSquare, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const CommandExample = ({ command, description }) => (
    <div className="p-3 my-4 border rounded-lg bg-slate-50 not-prose">
        <code className="text-sm font-semibold text-indigo-700">{command}</code>
        <p className="text-xs text-slate-500 mt-1">{description}</p>
    </div>
);

export default function Capabilities() {
  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <style>
        {`
          @media print {
            body {
              background: white !important;
            }
            .no-print {
              display: none !important;
            }
            .printable-area {
              padding: 0 !important;
              margin: 0 !important;
              max-width: none !important;
              width: 100% !important;
            }
            .printable-area .card {
              box-shadow: none !important;
              border: 1px solid #ddd !important;
            }
            .printable-area * {
              box-shadow: none !important;
              border-color: #eee !important;
              color: black !important;
            }
            .printable-area a {
              text-decoration: none !important;
              color: #333 !important;
            }
            .printable-area code {
               color: #c7254e !important;
               background-color: #f8f8f8 !important;
               padding: 2px 4px !important;
               border-radius: 3px !important;
               font-size: 0.85em !important;
            }
            .printable-area .bg-slate-50 {
              background-color: #f8fafc !important;
            }
            main, .lg\\:pl-72, .p-4.sm\\:p-6.lg\\:p-8 {
              padding: 0 !important;
            }
            h1, h2, h3, h4, h5, h6 {
                color: black !important;
            }
            .prose h2 {
                border-bottom: 1px solid #ddd !important;
            }
          }
        `}
      </style>
      <div className="max-w-4xl mx-auto printable-area">
        <header className="text-center mb-10 relative">
          <Button 
            variant="outline"
            className="absolute top-0 right-0 no-print"
            onClick={() => window.print()}
          >
            <Printer className="w-4 h-4 mr-2" />
            Print / Save as PDF
          </Button>

          <div className="inline-block p-4 bg-indigo-100 rounded-full mb-4 ring-8 ring-indigo-50">
            <Rocket className="w-12 h-12 text-indigo-600" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900">Tandril Capabilities Guide</h1>
          <p className="mt-4 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto">
            Your AI business partner that automates, optimizes, and scales your e-commerce operations
          </p>
          <p className="text-sm text-slate-500 mt-2">Last updated: January 2025</p>
        </header>

        <Card className="bg-white/90 backdrop-blur-sm shadow-xl border-slate-200/60">
          <CardContent className="p-6 sm:p-8 lg:p-10">
            <div className="prose prose-lg max-w-none text-slate-700 prose-headings:text-slate-800 prose-h2:border-b prose-h2:pb-2 prose-h3:text-slate-700 prose-a:text-indigo-600 prose-a:font-semibold hover:prose-a:underline">
              
              {/* AI Command Center */}
              <h2 className="flex items-center gap-2">
                <Zap className="w-6 h-6 text-indigo-600" />
                AI Command Center
              </h2>
              <p>The heart of Tandril - your natural language interface to control your entire e-commerce operation.</p>
              
              <h3>What You Can Do:</h3>
              <ul>
                <li><strong>Bulk Product Management</strong> - Update prices, descriptions, and SEO titles across hundreds of products instantly</li>
                <li><strong>Inventory Intelligence</strong> - Find low-stock items, identify bestsellers, and manage inventory levels automatically</li>
                <li><strong>Content Creation</strong> - Generate marketing campaigns, social media posts, and product descriptions</li>
                <li><strong>Data Analysis</strong> - Get instant reports on sales performance, customer behavior, and market trends</li>
                <li><strong>Multi-Platform Control</strong> - Execute commands across all your connected stores simultaneously</li>
              </ul>

              {/* Orion - AI Business Advisor */}
              <h2 className="flex items-center gap-2">
                <MessageSquare className="w-6 h-6 text-purple-600" />
                Orion - Your AI Business Advisor
              </h2>
              <p>More than just task automation - Orion is your strategic partner for growth.</p>
              
              <h3>Strategic Capabilities:</h3>
              <ul>
                <li><strong>Business Strategy</strong> - Identifies growth opportunities and creates actionable plans</li>
                <li><strong>Performance Analysis</strong> - Analyzes your metrics and provides data-driven recommendations</li>
                <li><strong>Trend Spotting</strong> - Monitors market trends and alerts you to emerging opportunities</li>
                <li><strong>Problem Solving</strong> - Helps troubleshoot business challenges with AI-powered insights</li>
                <li><strong>Long-term Memory</strong> - Remembers your preferences, goals, and business context across conversations</li>
                <li><strong>WhatsApp Integration</strong> - Chat with Orion anywhere, anytime via WhatsApp</li>
              </ul>

              {/* Multi-Platform Management */}
              <h2 className="flex items-center gap-2">
                <Target className="w-6 h-6 text-green-600" />
                Multi-Platform Management
              </h2>
              <p>Centralized control across your entire e-commerce ecosystem.</p>
              
              <h3>Platform Features:</h3>
              <ul>
                <li><strong>Unified Dashboard</strong> - View all stores, orders, and inventory in one place</li>
                <li><strong>Automatic Sync</strong> - Real-time inventory synchronization prevents overselling</li>
                <li><strong>Cross-Platform Commands</strong> - Execute actions on one, some, or all platforms at once</li>
                <li><strong>Aggregated Analytics</strong> - See total business performance across all channels</li>
                <li><strong>Smart Alerts</strong> - Get notified about critical events on any platform</li>
              </ul>

              <h3>Supported Platforms:</h3>
              <ul>
                <li>Shopify (Full Integration)</li>
                <li>Etsy (Coming Soon)</li>
                <li>Amazon Seller Central (Planned)</li>
                <li>Print-on-Demand Services (Printful, TeePublic, Redbubble)</li>
                <li>Facebook Shop & Instagram Shop (Planned)</li>
              </ul>

              {/* Smart Automation */}
              <h2 className="flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-blue-600" />
                Intelligent Automation
              </h2>
              <p>Set it and forget it - let AI handle routine tasks while you focus on growth.</p>
              
              <h3>Automation Capabilities:</h3>
              <ul>
                <li><strong>Scheduled Workflows</strong> - Run commands automatically on a schedule (daily, weekly, monthly)</li>
                <li><strong>Event-Triggered Actions</strong> - Respond to business events (low stock, new orders, price changes)</li>
                <li><strong>Smart Recommendations</strong> - AI proactively suggests optimizations based on your data</li>
                <li><strong>Vacation Mode</strong> - AI autopilot manages your business while you're away</li>
                <li><strong>Performance Monitoring</strong> - Continuously tracks and optimizes key metrics</li>
              </ul>

              {/* Command Examples */}
              <h2 className="flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-amber-600" />
                Popular Command Examples
              </h2>
              <p>
                Try these in the <Link to={createPageUrl('Commands')}>Commands</Link> page to see the AI in action.
              </p>
              
              <h3>Inventory & Product Management</h3>
              <CommandExample 
                  command="Find all products with less than 10 units in stock"
                  description="Quickly identify items that need reordering across all platforms"
              />
              <CommandExample 
                  command="Update SEO titles for all products in the 'Winter 2025' collection"
                  description="Bulk SEO optimization for seasonal campaigns"
              />
              <CommandExample 
                  command="Show me my top 20 best-selling products from last month"
                  description="Get quick sales insights without complex reports"
              />

              <h3>Pricing & Sales</h3>
              <CommandExample 
                  command="Put all clearance items on sale for 30% off on Shopify"
                  description="Manage promotions and sales across specific platforms"
              />
              <CommandExample 
                  command="Increase prices by 10% for products with 'premium' tag"
                  description="Dynamic pricing adjustments based on product attributes"
              />

              <h3>Marketing & Content</h3>
               <CommandExample 
                  command="Generate 5 Instagram posts about my new spring collection"
                  description="AI-powered social media content creation"
              />
              <CommandExample 
                  command="Create Facebook ads for my best-selling hoodies"
                  description="Automated ad campaign generation with AI copy"
              />
              <CommandExample 
                  command="Write product descriptions for all items without descriptions"
                  description="Fill content gaps with AI-generated descriptions"
              />

              <h3>Business Intelligence</h3>
              <CommandExample 
                  command="What trends should I watch for my t-shirt business?"
                  description="Market intelligence and trend forecasting"
              />
              <CommandExample 
                  command="Analyze my profit margins by product category"
                  description="Deep business analytics in plain English"
              />
              <CommandExample 
                  command="Which products are trending up in sales this month?"
                  description="Identify growth opportunities in real-time"
              />

              {/* Safety & Security */}
              <h2>Safety & Control</h2>
              <p>We take security seriously. Here's how we protect your business:</p>
              
              <ul>
                <li><strong>Risk Assessment</strong> - Every command is analyzed for potential impact (low/medium/high risk)</li>
                <li><strong>Confirmation Steps</strong> - High-risk actions require explicit confirmation before execution</li>
                <li><strong>Audit Trail</strong> - Complete history of all AI actions with detailed logs</li>
                <li><strong>Undo Capability</strong> - Revert certain actions if something goes wrong</li>
                <li><strong>Dry Run Mode</strong> - Preview changes before applying them to live products</li>
                <li><strong>Platform Permissions</strong> - Granular control over what AI can access on each platform</li>
              </ul>

              {/* Getting Started */}
              <h2>Getting Started</h2>
              
              <h3>Step 1: Connect Your Platforms</h3>
              <ul>
                <li>Visit the <Link to={createPageUrl('Platforms')}>Platforms</Link> page</li>
                <li>Connect your Shopify store (or other supported platforms)</li>
                <li>Grant necessary permissions for AI access</li>
              </ul>

              <h3>Step 2: Try Your First Command</h3>
              <ul>
                <li>Go to the <Link to={createPageUrl('Commands')}>Commands</Link> page</li>
                <li>Type a simple request like "Show me my inventory"</li>
                <li>Watch Orion analyze and execute your command</li>
              </ul>

              <h3>Step 3: Explore AI Advisor</h3>
              <ul>
                <li>Chat with Orion in the <Link to={createPageUrl('AIAdvisor')}>AI Advisor</Link></li>
                <li>Ask for business advice, strategy recommendations, or market insights</li>
                <li>Let Orion learn your business and build long-term context</li>
              </ul>

              {/* Support Section */}
              <div className="mt-12 not-prose">
                <Card className="bg-blue-50 border-blue-200">
                    <CardHeader className="flex flex-row items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                            <LifeBuoy className="w-7 h-7 text-blue-600" />
                        </div>
                        <CardTitle className="text-xl font-bold text-slate-800">Support & Feedback</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-blue-800 mb-4">
                            We're constantly improving Tandril and your feedback is invaluable. Whether you have questions, need help, or want to suggest a feature - we're here for you.
                        </p>
                        <div className="space-y-2">
                            <div className="text-blue-800">
                                <strong>📧 Email:</strong> support@tandril.com
                            </div>
                            <div className="text-blue-800">
                                <strong>💬 Chat:</strong> Use the AI Advisor for quick help
                            </div>
                            <div className="text-blue-800">
                                <strong>📝 Feedback Form:</strong>{' '}
                                <a href="https://forms.gle/U9f2h1CEvGg3rE626" target="_blank" rel="noopener noreferrer" className="underline">
                                    Submit feedback or feature requests
                                </a>
                            </div>
                        </div>
                    </CardContent>
                </Card>
              </div>

            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}