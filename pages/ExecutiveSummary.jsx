import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Users, Zap, Target, DollarSign, Rocket, Bot, RefreshCw } from 'lucide-react';

export default function ExecutiveSummary() {
    return (
        <div className="max-w-6xl mx-auto p-8 space-y-8">
            <div className="text-center mb-12">
                <h1 className="text-5xl font-bold text-slate-900 mb-4">Tandril</h1>
                <p className="text-2xl text-indigo-600 font-semibold mb-2">The AI Operating System for E-Commerce</p>
                <p className="text-lg text-slate-600">Empowering online sellers to automate, optimize, and scale across multiple platforms</p>
            </div>

            <Card className="bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-200">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-2xl">
                        <Target className="w-6 h-6 text-indigo-600" />
                        The Opportunity
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700 leading-relaxed">
                    <p className="text-lg">
                        <strong>30+ million e-commerce sellers worldwide</strong> are drowning in complexity. Managing multiple platforms, optimizing listings, 
                        tracking inventory, running ads, and handling customer service requires expertise across dozens of tools and countless hours per week.
                    </p>
                    <p className="text-lg">
                        The average seller spends <strong>20-30 hours weekly</strong> on repetitive operational tasks that could be automated. 
                        Meanwhile, they lack the data-driven insights needed to compete effectively against larger sellers with dedicated teams.
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-2xl">
                        <Zap className="w-6 h-6 text-yellow-600" />
                        The Solution: Tandril
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <p className="text-lg text-slate-700 leading-relaxed">
                        Tandril is the first <strong>AI-powered operating system</strong> designed specifically for e-commerce sellers. 
                        We consolidate the complexity of online selling into one intelligent platform powered by Orion, 
                        an AI business partner that understands your business and executes on your behalf.
                    </p>

                    <div className="grid md:grid-cols-2 gap-6 mt-6">
                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                                <Bot className="w-5 h-5 text-purple-600" />
                                AI Command Center
                            </h3>
                            <ul className="space-y-2 text-slate-700">
                                <li>• Natural language commands to manage your business</li>
                                <li>• Orion AI interprets requests and executes complex workflows</li>
                                <li>• Multi-step operations handled automatically</li>
                                <li>• Smart confirmations for high-risk actions</li>
                            </ul>
                        </div>

                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                                <RefreshCw className="w-5 h-5 text-blue-600" />
                                Intelligent Automation
                            </h3>
                            <ul className="space-y-2 text-slate-700">
                                <li>• Visual workflow builder with drag-and-drop</li>
                                <li>• 16+ trigger types (inventory, orders, schedule, etc.)</li>
                                <li>• 18+ action types (email, update, AI commands, etc.)</li>
                                <li>• Conditional branching and error recovery</li>
                            </ul>
                        </div>

                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                                <Users className="w-5 h-5 text-green-600" />
                                Multi-Platform Management
                            </h3>
                            <ul className="space-y-2 text-slate-700">
                                <li>• Unified dashboard for Shopify, Etsy, eBay, Amazon</li>
                                <li>• Sync inventory, orders, and listings automatically</li>
                                <li>• Bulk operations across all platforms</li>
                                <li>• Real-time performance tracking</li>
                            </ul>
                        </div>

                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-indigo-600" />
                                Growth Intelligence
                            </h3>
                            <ul className="space-y-2 text-slate-700">
                                <li>• AI-powered market insights and trend analysis</li>
                                <li>• Automated SEO optimization</li>
                                <li>• Smart ad campaign generation and management</li>
                                <li>• Predictive inventory and demand forecasting</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-2xl">
                        <DollarSign className="w-6 h-6 text-green-600" />
                        Business Model
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-lg text-slate-700">
                        <strong>SaaS subscription model</strong> with three tiers designed to grow with sellers:
                    </p>
                    <div className="grid md:grid-cols-3 gap-4 mt-6">
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                            <h4 className="font-bold text-lg mb-2">Free Tier</h4>
                            <p className="text-2xl font-bold text-slate-900 mb-2">$0/mo</p>
                            <ul className="text-sm text-slate-600 space-y-1">
                                <li>• 50 AI commands/month</li>
                                <li>• 2 platform connections</li>
                                <li>• Basic automations</li>
                                <li>• Community support</li>
                            </ul>
                        </div>
                        <div className="p-4 bg-indigo-50 rounded-lg border-2 border-indigo-500">
                            <h4 className="font-bold text-lg mb-2">Professional</h4>
                            <p className="text-2xl font-bold text-indigo-600 mb-2">$49/mo</p>
                            <ul className="text-sm text-slate-700 space-y-1">
                                <li>• 1,000 AI commands/month</li>
                                <li>• Unlimited platforms</li>
                                <li>• Advanced automations</li>
                                <li>• Priority support</li>
                                <li>• Analytics & insights</li>
                            </ul>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                            <h4 className="font-bold text-lg mb-2">Enterprise</h4>
                            <p className="text-2xl font-bold text-slate-900 mb-2">$199/mo</p>
                            <ul className="text-sm text-slate-600 space-y-1">
                                <li>• Unlimited commands</li>
                                <li>• White-label options</li>
                                <li>• Custom integrations</li>
                                <li>• Dedicated support</li>
                                <li>• API access</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-2xl">
                        <Rocket className="w-6 h-6 text-red-600" />
                        Market Traction
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                    <p className="text-lg">
                        Currently in <strong>private beta</strong> with select Shopify sellers, validating core workflows and gathering feedback 
                        to refine the product-market fit.
                    </p>
                    <div className="grid md:grid-cols-3 gap-6 mt-6">
                        <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
                            <p className="text-4xl font-bold text-indigo-600 mb-2">30M+</p>
                            <p className="text-sm text-slate-600">Addressable sellers worldwide</p>
                        </div>
                        <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg">
                            <p className="text-4xl font-bold text-green-600 mb-2">$400B</p>
                            <p className="text-sm text-slate-600">Global e-commerce tools market</p>
                        </div>
                        <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg">
                            <p className="text-4xl font-bold text-purple-600 mb-2">67%</p>
                            <p className="text-sm text-slate-600">Sellers using 5+ tools currently</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white">
                <CardContent className="p-8">
                    <h2 className="text-3xl font-bold mb-4">The Vision</h2>
                    <p className="text-xl leading-relaxed">
                        Tandril will become the <strong>operating system for e-commerce</strong> - the single platform where 
                        sellers manage their entire business. By combining AI automation, multi-platform integration, and intelligent 
                        insights, we're enabling solo sellers to compete at the level of established brands with full teams.
                    </p>
                    <p className="text-lg mt-4 opacity-90">
                        We're not just building tools. We're building the future of independent commerce.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}