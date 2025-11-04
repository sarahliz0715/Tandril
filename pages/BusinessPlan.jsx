import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target, Users, Zap, TrendingUp, Shield, Rocket, Bot, RefreshCw, Package, BarChart3 } from 'lucide-react';

export default function BusinessPlan() {
    return (
        <div className="max-w-6xl mx-auto p-8 space-y-8">
            <div className="text-center mb-12">
                <h1 className="text-5xl font-bold text-slate-900 mb-4">Tandril Business Plan</h1>
                <p className="text-xl text-slate-600">The AI Operating System for E-Commerce</p>
                <p className="text-lg text-indigo-600 font-semibold mt-2">2025-2027 Strategic Roadmap</p>
            </div>

            {/* Executive Summary */}
            <Card className="bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-200">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-2xl">
                        <Target className="w-6 h-6 text-indigo-600" />
                        Executive Summary
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700 leading-relaxed">
                    <p className="text-lg">
                        Tandril is building the <strong>AI operating system for e-commerce</strong> - a unified platform that enables 
                        online sellers to automate operations, optimize performance, and scale across multiple platforms using natural language and intelligent automation.
                    </p>
                    <p>
                        We're targeting the <strong>30+ million e-commerce sellers worldwide</strong> who currently juggle 5-10 different tools, 
                        spend 20-30 hours per week on repetitive tasks, and lack the technical expertise to compete effectively.
                    </p>
                    <div className="grid md:grid-cols-3 gap-4 mt-6">
                        <div className="p-4 bg-white rounded-lg border border-indigo-200">
                            <p className="text-sm text-slate-600 mb-1">Target Market</p>
                            <p className="text-2xl font-bold text-indigo-600">30M+</p>
                            <p className="text-xs text-slate-600">Global sellers</p>
                        </div>
                        <div className="p-4 bg-white rounded-lg border border-indigo-200">
                            <p className="text-sm text-slate-600 mb-1">Market Size</p>
                            <p className="text-2xl font-bold text-indigo-600">$400B</p>
                            <p className="text-xs text-slate-600">E-commerce tools TAM</p>
                        </div>
                        <div className="p-4 bg-white rounded-lg border border-indigo-200">
                            <p className="text-sm text-slate-600 mb-1">Revenue Target Y3</p>
                            <p className="text-2xl font-bold text-indigo-600">$6M</p>
                            <p className="text-xs text-slate-600">10,000 paid users</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Problem & Solution */}
            <div className="grid md:grid-cols-2 gap-6">
                <Card className="bg-red-50 border-red-200">
                    <CardHeader>
                        <CardTitle className="text-xl text-red-900">The Problem</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-slate-700">
                        <p><strong>Tool Sprawl:</strong> Average seller uses 7+ different tools (inventory, listing, analytics, shipping, ads, email, etc.)</p>
                        <p><strong>Time Drain:</strong> 20-30 hours per week on repetitive operational tasks that could be automated</p>
                        <p><strong>Technical Barrier:</strong> Advanced features require coding/technical knowledge most sellers don't have</p>
                        <p><strong>Data Silos:</strong> Information scattered across platforms with no unified insights</p>
                        <p><strong>Scaling Challenges:</strong> Growing to multiple platforms exponentially increases complexity</p>
                    </CardContent>
                </Card>

                <Card className="bg-green-50 border-green-200">
                    <CardHeader>
                        <CardTitle className="text-xl text-green-900">Our Solution</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-slate-700">
                        <p><strong>Unified Platform:</strong> One dashboard for all platforms, inventory, orders, ads, and analytics</p>
                        <p><strong>AI Automation:</strong> Natural language commands + visual workflow builder replace manual work</p>
                        <p><strong>Zero Code Required:</strong> Sophisticated automations without technical knowledge</p>
                        <p><strong>Intelligent Insights:</strong> AI-powered recommendations based on cross-platform data</p>
                        <p><strong>Effortless Scaling:</strong> Add platforms and grow revenue without adding operational burden</p>
                    </CardContent>
                </Card>
            </div>

            {/* Product Overview */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-2xl">
                        <Zap className="w-6 h-6 text-yellow-600" />
                        Product Overview
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <Bot className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
                                <div>
                                    <h3 className="font-bold text-lg mb-2">Orion AI Assistant</h3>
                                    <p className="text-sm text-slate-600">
                                        Natural language interface for complex operations. Tell Orion what you want in plain English, 
                                        and it interprets, plans, and executes multi-step workflows across your platforms.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <RefreshCw className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                                <div>
                                    <h3 className="font-bold text-lg mb-2">Visual Automation Builder</h3>
                                    <p className="text-sm text-slate-600">
                                        Drag-and-drop workflow creation with 16+ trigger types and 18+ actions. Build sophisticated 
                                        automations with conditional logic, error recovery, and parallel execution - no coding required.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <Package className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                                <div>
                                    <h3 className="font-bold text-lg mb-2">Multi-Platform Management</h3>
                                    <p className="text-sm text-slate-600">
                                        Connect Shopify, Etsy, eBay, Amazon, and more. Unified inventory, order management, 
                                        and bulk operations across all channels from one dashboard.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <BarChart3 className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-1" />
                                <div>
                                    <h3 className="font-bold text-lg mb-2">Market Intelligence</h3>
                                    <p className="text-sm text-slate-600">
                                        AI-powered trend analysis, competitor insights, keyword opportunities, and demand forecasting 
                                        to help you stay ahead of the market.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <TrendingUp className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-1" />
                                <div>
                                    <h3 className="font-bold text-lg mb-2">Smart Ad Management</h3>
                                    <p className="text-sm text-slate-600">
                                        AI-generated ad campaigns for Facebook, Instagram, Google, and more. Automated optimization 
                                        and performance tracking across all channels.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <Shield className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                                <div>
                                    <h3 className="font-bold text-lg mb-2">Smart Alerts & Monitoring</h3>
                                    <p className="text-sm text-slate-600">
                                        Proactive monitoring of inventory levels, order issues, platform changes, and growth 
                                        opportunities with intelligent prioritization.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Target Market */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-2xl">
                        <Users className="w-6 h-6 text-blue-600" />
                        Target Market
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                            <h3 className="font-bold text-lg mb-3">Primary: Growing Sellers</h3>
                            <ul className="space-y-2 text-sm text-slate-700">
                                <li>• $5k-$50k monthly revenue</li>
                                <li>• 2-3 sales channels</li>
                                <li>• 100-1,000 SKUs</li>
                                <li>• Solo or small team (1-3 people)</li>
                                <li>• Looking to scale efficiently</li>
                            </ul>
                            <p className="mt-4 text-xs text-slate-600"><strong>Size:</strong> ~5M sellers globally</p>
                        </div>

                        <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                            <h3 className="font-bold text-lg mb-3">Secondary: New Sellers</h3>
                            <ul className="space-y-2 text-sm text-slate-700">
                                <li>• Under $5k monthly revenue</li>
                                <li>• 1-2 sales channels</li>
                                <li>• Under 100 SKUs</li>
                                <li>• Solo operator/side hustle</li>
                                <li>• Need guidance and automation</li>
                            </ul>
                            <p className="mt-4 text-xs text-slate-600"><strong>Size:</strong> ~20M sellers globally</p>
                        </div>

                        <div className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg border border-amber-200">
                            <h3 className="font-bold text-lg mb-3">Tertiary: Established Brands</h3>
                            <ul className="space-y-2 text-sm text-slate-700">
                                <li>• $50k+ monthly revenue</li>
                                <li>• 4+ sales channels</li>
                                <li>• 1,000+ SKUs</li>
                                <li>• Team of 5-20 people</li>
                                <li>• Need enterprise features</li>
                            </ul>
                            <p className="mt-4 text-xs text-slate-600"><strong>Size:</strong> ~500k sellers globally</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Go-to-Market Strategy */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-2xl">
                        <Rocket className="w-6 h-6 text-red-600" />
                        Go-to-Market Strategy
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <h3 className="font-bold text-lg mb-3">Phase 1: Shopify Beta (Q1 2025)</h3>
                            <ul className="space-y-2 text-sm text-slate-700">
                                <li>• Launch Shopify-focused MVP</li>
                                <li>• 100 beta testers from existing network</li>
                                <li>• Focus: Core AI commands + automation</li>
                                <li>• Goal: Product-market fit validation</li>
                                <li>• Success metric: 40% weekly active usage</li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="font-bold text-lg mb-3">Phase 2: Multi-Platform (Q2-Q3 2025)</h3>
                            <ul className="space-y-2 text-sm text-slate-700">
                                <li>• Add Etsy, eBay, Amazon integrations</li>
                                <li>• Launch freemium model publicly</li>
                                <li>• Target: 1,000 users (200 paid)</li>
                                <li>• Content marketing + SEO</li>
                                <li>• Success metric: $10k MRR</li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="font-bold text-lg mb-3">Phase 3: Scale & Monetize (Q4 2025)</h3>
                            <ul className="space-y-2 text-sm text-slate-700">
                                <li>• Paid advertising campaigns</li>
                                <li>• Platform partnerships</li>
                                <li>• Target: 5,000 users (1,000 paid)</li>
                                <li>• Launch marketplace for templates</li>
                                <li>• Success metric: $50k MRR</li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="font-bold text-lg mb-3">Phase 4: Enterprise (2026)</h3>
                            <ul className="space-y-2 text-sm text-slate-700">
                                <li>• Launch Enterprise tier features</li>
                                <li>• Sales team for high-value accounts</li>
                                <li>• Custom integrations & API</li>
                                <li>• White-label options</li>
                                <li>• Success metric: $100k+ MRR</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Competitive Advantage */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">Competitive Advantage</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
                            <h3 className="font-bold mb-2">🎯 Unified Platform vs. Tool Sprawl</h3>
                            <p className="text-sm text-slate-700">
                                Competitors solve individual problems. We replace 5-10 tools with one platform, creating massive lock-in value.
                            </p>
                        </div>

                        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                            <h3 className="font-bold mb-2">🤖 AI-First Architecture</h3>
                            <p className="text-sm text-slate-700">
                                Built from the ground up for AI automation. Legacy tools are bolting on AI - we're AI-native.
                            </p>
                        </div>

                        <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                            <h3 className="font-bold mb-2">⚡ No-Code Sophistication</h3>
                            <p className="text-sm text-slate-700">
                                Enterprise-grade automation accessible to non-technical sellers through natural language and visual builders.
                            </p>
                        </div>

                        <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                            <h3 className="font-bold mb-2">📊 Cross-Platform Intelligence</h3>
                            <p className="text-sm text-slate-700">
                                Insights and optimization based on unified data across all platforms - impossible for single-platform tools.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Financial Projections */}
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                <CardHeader>
                    <CardTitle className="text-2xl">3-Year Financial Projections</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b-2 border-green-300">
                                    <th className="text-left p-3">Metric</th>
                                    <th className="text-right p-3">Year 1 (2025)</th>
                                    <th className="text-right p-3">Year 2 (2026)</th>
                                    <th className="text-right p-3">Year 3 (2027)</th>
                                </tr>
                            </thead>
                            <tbody className="text-slate-700">
                                <tr className="border-b border-green-200">
                                    <td className="p-3 font-semibold">Total Users</td>
                                    <td className="text-right p-3">1,200</td>
                                    <td className="text-right p-3">7,000</td>
                                    <td className="text-right p-3">30,000</td>
                                </tr>
                                <tr className="border-b border-green-200">
                                    <td className="p-3 font-semibold">Paid Users</td>
                                    <td className="text-right p-3">200</td>
                                    <td className="text-right p-3">2,000</td>
                                    <td className="text-right p-3">10,000</td>
                                </tr>
                                <tr className="border-b border-green-200">
                                    <td className="p-3 font-semibold">Monthly Revenue</td>
                                    <td className="text-right p-3">$10k</td>
                                    <td className="text-right p-3">$100k</td>
                                    <td className="text-right p-3">$500k</td>
                                </tr>
                                <tr className="border-b border-green-200 bg-green-100">
                                    <td className="p-3 font-bold">Annual Revenue</td>
                                    <td className="text-right p-3 font-bold">$120k</td>
                                    <td className="text-right p-3 font-bold">$1.2M</td>
                                    <td className="text-right p-3 font-bold">$6M</td>
                                </tr>
                                <tr className="border-b border-green-200">
                                    <td className="p-3 font-semibold">Operating Costs</td>
                                    <td className="text-right p-3">$180k</td>
                                    <td className="text-right p-3">$600k</td>
                                    <td className="text-right p-3">$2.4M</td>
                                </tr>
                                <tr className="bg-green-100">
                                    <td className="p-3 font-bold">Net Profit/(Loss)</td>
                                    <td className="text-right p-3 font-bold text-red-600">($60k)</td>
                                    <td className="text-right p-3 font-bold text-green-700">$600k</td>
                                    <td className="text-right p-3 font-bold text-green-700">$3.6M</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Team & Execution */}
            <Card className="bg-gradient-to-br from-slate-800 to-slate-900 text-white">
                <CardContent className="p-8">
                    <h2 className="text-2xl font-bold mb-6">Investment Ask & Use of Funds</h2>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div>
                            <h3 className="text-xl font-bold mb-4">Seeking: $250k Seed Round</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center p-3 bg-white/10 rounded">
                                    <span>Product Development</span>
                                    <span className="font-bold">$100k (40%)</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-white/10 rounded">
                                    <span>Marketing & Growth</span>
                                    <span className="font-bold">$80k (32%)</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-white/10 rounded">
                                    <span>Operations & Infrastructure</span>
                                    <span className="font-bold">$40k (16%)</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-white/10 rounded">
                                    <span>Legal & Admin</span>
                                    <span className="font-bold">$30k (12%)</span>
                                </div>
                            </div>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold mb-4">18-Month Runway to:</h3>
                            <ul className="space-y-2 text-lg">
                                <li>✓ Launch full multi-platform product</li>
                                <li>✓ Acquire 5,000+ users (1,000 paid)</li>
                                <li>✓ Reach $50k MRR ($600k ARR)</li>
                                <li>✓ Validate enterprise tier</li>
                                <li>✓ Position for Series A</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}