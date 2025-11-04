import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FlaskConical, LifeBuoy, Printer, Sparkles, Zap, MessageSquare, TrendingUp, Rocket, ShoppingBag, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const CommandExample = ({ command, description }) => (
    <div className="p-3 my-4 border rounded-lg bg-slate-50 not-prose">
        <code className="text-sm font-semibold text-indigo-700">{command}</code>
        <p className="text-xs text-slate-500 mt-1">{description}</p>
    </div>
);

export default function BetaCapabilities() {
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

          <div className="inline-block p-4 bg-purple-100 rounded-full mb-4 ring-8 ring-purple-50">
            <FlaskConical className="w-12 h-12 text-purple-600" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900">Tandril Beta - Shopify Focus</h1>
          <p className="mt-4 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto">
            Welcome to the Tandril Beta! You're helping us build the future of AI-powered e-commerce automation.
          </p>
          <p className="text-sm text-slate-500 mt-2">Last updated: January 2025 • Beta Version 1.0</p>
        </header>

        {/* Beta Notice */}
        <Alert className="mb-6 border-purple-200 bg-purple-50">
          <FlaskConical className="h-4 w-4 text-purple-600" />
          <AlertTitle className="text-purple-900">You're a Beta Tester!</AlertTitle>
          <AlertDescription className="text-purple-700">
            This guide covers features available in the current beta. We're focused on perfecting Shopify integration before expanding to other platforms. Your feedback shapes our development priorities!
          </AlertDescription>
        </Alert>

        <Card className="bg-white/90 backdrop-blur-sm shadow-xl border-slate-200/60">
          <CardContent className="p-6 sm:p-8 lg:p-10">
            <div className="prose prose-lg max-w-none text-slate-700 prose-headings:text-slate-800 prose-h2:border-b prose-h2:pb-2 prose-h3:text-slate-700 prose-a:text-indigo-600 prose-a:font-semibold hover:prose-a:underline">
              
              {/* What's Available in Beta */}
              <h2 className="flex items-center gap-2">
                <Rocket className="w-6 h-6 text-green-600" />
                What's Available in Beta
              </h2>
              <p>The beta version focuses on core Shopify automation to ensure rock-solid reliability before expanding.</p>

              <h3>Current Features:</h3>
              <ul>
                <li><strong>Shopify Integration</strong> - Full connection to your Shopify store with secure OAuth authentication</li>
                <li><strong>Product Management</strong> - Bulk update SEO titles, descriptions, prices, and product details</li>
                <li><strong>AI Command Center</strong> - Natural language commands for managing your Shopify store</li>
                <li><strong>Orion AI Advisor</strong> - Strategic business advice and conversational AI with memory</li>
                <li><strong>WhatsApp Access</strong> - Chat with Orion via WhatsApp for on-the-go business management</li>
                <li><strong>Command History</strong> - Track all your AI commands and their results</li>
                <li><strong>Product Inventory View</strong> - See all your Shopify products in one dashboard</li>
              </ul>

              {/* Orion - Your AI Business Partner */}
              <h2 className="flex items-center gap-2">
                <MessageSquare className="w-6 h-6 text-purple-600" />
                Orion - Your AI Business Partner
              </h2>
              <p>Orion is your strategic advisor who knows your business and helps you make better decisions.</p>
              
              <h3>What Orion Can Do:</h3>
              <ul>
                <li><strong>Strategic Advice</strong> - Get personalized recommendations for growing your Shopify business</li>
                <li><strong>Business Analysis</strong> - Ask questions about your products, pricing, and performance</li>
                <li><strong>Long-term Memory</strong> - Orion remembers your preferences, goals, and past conversations</li>
                <li><strong>Problem Solving</strong> - Troubleshoot challenges with AI-powered insights</li>
                <li><strong>Trend Spotting</strong> - Get alerts about market opportunities relevant to your niche</li>
                <li><strong>24/7 Availability</strong> - Access Orion anytime via the web app or WhatsApp</li>
              </ul>

              {/* AI Command Center */}
              <h2 className="flex items-center gap-2">
                <Zap className="w-6 h-6 text-indigo-600" />
                AI Command Center
              </h2>
              <p>Control your Shopify store with natural language commands. No more clicking through endless menus!</p>
              
              <h3>Key Capabilities:</h3>
              <ul>
                <li><strong>Bulk SEO Optimization</strong> - Update titles and descriptions for multiple products at once</li>
                <li><strong>Price Management</strong> - Adjust pricing across product collections with one command</li>
                <li><strong>Product Filters</strong> - Target specific products by type, collection, tags, or price range</li>
                <li><strong>Smart Previews</strong> - See what will change before confirming any action</li>
                <li><strong>Safety First</strong> - Risk assessment and confirmation steps protect your live store</li>
              </ul>

              {/* Shopify-Specific Commands */}
              <h2 className="flex items-center gap-2">
                <ShoppingBag className="w-6 h-6 text-green-600" />
                Shopify Command Examples
              </h2>
              <p>
                Try these commands in the <Link to={createPageUrl('Commands')}>Commands</Link> page:
              </p>
              
              <h3>Product Optimization</h3>
              <CommandExample 
                  command="Optimize SEO titles for my t-shirts collection"
                  description="AI will analyze and improve titles for better search visibility"
              />
              <CommandExample 
                  command="Update descriptions for all products under $30"
                  description="Bulk update product descriptions based on price criteria"
              />
              <CommandExample 
                  command="Show me all products with 'hoodie' in the title"
                  description="Quick product filtering and analysis"
              />

              <h3>Pricing Adjustments</h3>
              <CommandExample 
                  command="Increase prices by 10% for products tagged 'premium'"
                  description="Dynamic pricing based on product attributes"
              />
              <CommandExample 
                  command="Create a 20% sale on all winter collection items"
                  description="Bulk discounting for seasonal promotions"
              />

              <h3>Content Creation</h3>
              <CommandExample 
                  command="Generate 5 Instagram posts about my new spring collection"
                  description="AI-powered social media content for your products"
              />
              <CommandExample 
                  command="Create product descriptions for items without descriptions"
                  description="Fill content gaps automatically"
              />

              <h3>Business Intelligence</h3>
              <CommandExample 
                  command="What should I focus on this week to grow sales?"
                  description="Strategic guidance from Orion"
              />
              <CommandExample 
                  command="Analyze my product pricing compared to market trends"
                  description="Get competitive insights"
              />

              {/* What's Coming Next */}
              <h2 className="flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-blue-600" />
                What's Coming Next
              </h2>
              <p>Based on beta feedback, we're prioritizing these features for future releases:</p>
              
              <h3>Phase 2 (Coming Soon):</h3>
              <ul>
                <li><strong>Advanced Analytics</strong> - Sales trends, profit margins, and performance dashboards</li>
                <li><strong>Inventory Management</strong> - Low stock alerts and automatic reordering</li>
                <li><strong>Order Management</strong> - Track and manage orders through Tandril</li>
                <li><strong>Customer Insights</strong> - AI-powered customer behavior analysis</li>
                <li><strong>Automated Workflows</strong> - Schedule recurring tasks and automations</li>
              </ul>

              <h3>Phase 3 (Planned):</h3>
              <ul>
                <li><strong>Multi-Platform Support</strong> - Etsy, Amazon, WooCommerce integration</li>
                <li><strong>Marketing Automation</strong> - Email campaigns and ad management</li>
                <li><strong>Supplier Management</strong> - Direct integration with dropshipping and POD services</li>
                <li><strong>Advanced AI Features</strong> - Predictive analytics and market intelligence</li>
              </ul>

              {/* Beta Limitations */}
              <h2>Beta Limitations & Expectations</h2>
              <p>As a beta tester, here's what to expect:</p>
              
              <h3>Current Limitations:</h3>
              <ul>
                <li><strong>Single Platform</strong> - Only Shopify is supported in this beta version</li>
                <li><strong>Feature Subset</strong> - Some advanced features are still in development</li>
                <li><strong>Rate Limits</strong> - Command execution may have throttling to protect your store</li>
                <li><strong>Limited Analytics</strong> - Full reporting suite coming in Phase 2</li>
                <li><strong>No Undo (Yet)</strong> - Command reversal feature is in development</li>
              </ul>

              <h3>What We Need From You:</h3>
              <ul>
                <li><strong>Honest Feedback</strong> - Tell us what works and what doesn't</li>
                <li><strong>Bug Reports</strong> - Report any issues you encounter immediately</li>
                <li><strong>Feature Requests</strong> - Share what features would help your business most</li>
                <li><strong>Use Cases</strong> - Describe how you're using Tandril in your workflow</li>
                <li><strong>Patience</strong> - We're iterating quickly based on your input</li>
              </ul>

              {/* Safety & Security */}
              <h2>Safety & Security in Beta</h2>
              <p>Your store's security is our top priority, even in beta.</p>
              
              <ul>
                <li><strong>Secure OAuth</strong> - Industry-standard Shopify authentication</li>
                <li><strong>Risk Assessment</strong> - Every command is evaluated before execution</li>
                <li><strong>Preview Mode</strong> - See changes before they're applied to your live store</li>
                <li><strong>Command History</strong> - Full audit trail of all actions</li>
                <li><strong>Rate Limiting</strong> - Protection against accidental bulk operations</li>
                <li><strong>Encrypted Storage</strong> - All credentials and data are encrypted at rest</li>
              </ul>

              {/* Getting Started */}
              <h2>Getting Started (Beta Version)</h2>
              
              <h3>Step 1: Connect Your Shopify Store</h3>
              <ul>
                <li>Go to <Link to={createPageUrl('Platforms')}>My Shopify Store</Link></li>
                <li>Click "Connect Shopify"</li>
                <li>Authorize Tandril in your Shopify admin</li>
                <li>Wait for initial product sync (usually 1-2 minutes)</li>
              </ul>

              <h3>Step 2: Try Your First Command</h3>
              <ul>
                <li>Navigate to <Link to={createPageUrl('Commands')}>Commands</Link></li>
                <li>Try: "Show me my products" to test the connection</li>
                <li>Review the results and get familiar with the interface</li>
              </ul>

              <h3>Step 3: Meet Orion</h3>
              <ul>
                <li>Visit <Link to={createPageUrl('AIAdvisor')}>AI Advisor</Link></li>
                <li>Introduce yourself and tell Orion about your business</li>
                <li>Ask for strategic advice or growth recommendations</li>
                <li>Connect via WhatsApp for mobile access</li>
              </ul>

              <h3>Step 4: Share Feedback</h3>
              <ul>
                <li>Use the app regularly and note what works well</li>
                <li>Report bugs or issues immediately via the feedback form</li>
                <li>Suggest features that would help your business</li>
                <li>Join our beta community (link in Settings)</li>
              </ul>

              {/* Tips for Beta Testers */}
              <h2>Pro Tips for Beta Testers</h2>
              
              <ul>
                <li><strong>Start Small</strong> - Test commands on a few products before going bulk</li>
                <li><strong>Use Preview Mode</strong> - Always review changes before confirming</li>
                <li><strong>Document Issues</strong> - Take screenshots if something doesn't work as expected</li>
                <li><strong>Be Specific</strong> - Clear, detailed commands get better results</li>
                <li><strong>Explore Orion</strong> - The AI advisor gets smarter the more you interact with it</li>
                <li><strong>Check History</strong> - Review past commands to understand what works best</li>
                <li><strong>Ask Questions</strong> - We're here to help - use the support channels!</li>
              </ul>

              {/* Support & Feedback */}
              <div className="mt-12 not-prose">
                <Card className="bg-purple-50 border-purple-200">
                    <CardHeader className="flex flex-row items-center gap-4">
                        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                            <LifeBuoy className="w-7 h-7 text-purple-600" />
                        </div>
                        <CardTitle className="text-xl font-bold text-slate-800">Beta Support & Feedback</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-purple-800 mb-4">
                            As a beta tester, you have direct access to our development team. Your input is invaluable and directly shapes the product roadmap.
                        </p>
                        <div className="space-y-2">
                            <div className="text-purple-800">
                                <strong>📧 Priority Email:</strong> support@tandril.com (Beta Priority Response)
                            </div>
                            <div className="text-purple-800">
                                <strong>💬 AI Advisor:</strong> Ask Orion for help or troubleshooting
                            </div>
                            <div className="text-purple-800">
                                <strong>📝 Feedback Form:</strong>{' '}
                                <a href="https://forms.gle/U9f2h1CEvGg3rE626" target="_blank" rel="noopener noreferrer" className="underline">
                                    Share detailed feedback here
                                </a>
                            </div>
                            <div className="text-purple-800">
                                <strong>🐛 Bug Reports:</strong> Email with subject line "BUG REPORT" for fastest response
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Alert className="mt-6 border-green-200 bg-green-50">
                    <Sparkles className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-900">Thank You for Being a Beta Tester!</AlertTitle>
                    <AlertDescription className="text-green-700">
                        Your participation helps us build the best AI e-commerce platform in the world. Every bug you report, every feature you request, and every bit of feedback you share makes Tandril better for everyone. We deeply appreciate your trust and partnership.
                    </AlertDescription>
                </Alert>
              </div>

            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}