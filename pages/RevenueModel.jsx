import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, Users, Zap, Target, Package } from 'lucide-react';

export default function RevenueModel() {
    return (
        <div className="max-w-6xl mx-auto p-8 space-y-8">
            <div className="text-center mb-12">
                <h1 className="text-5xl font-bold text-slate-900 mb-4">Revenue Model</h1>
                <p className="text-xl text-slate-600">Sustainable, scalable, and aligned with customer success</p>
            </div>

            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-2xl">
                        <DollarSign className="w-6 h-6 text-green-600" />
                        Primary Revenue Stream: SaaS Subscriptions
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <p className="text-lg text-slate-700">
                        Three-tier subscription model designed to capture value at every stage of seller growth:
                    </p>

                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-lg border-2 border-slate-200 hover:border-slate-300 transition-all">
                            <div className="text-center mb-4">
                                <h3 className="text-2xl font-bold text-slate-900">Free</h3>
                                <p className="text-4xl font-bold text-slate-900 my-2">$0</p>
                                <p className="text-sm text-slate-600">per month</p>
                            </div>
                            <div className="space-y-2 text-sm">
                                <div className="flex items-start gap-2">
                                    <span className="text-green-600">✓</span>
                                    <span>50 AI commands/month</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="text-green-600">✓</span>
                                    <span>2 platform connections</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="text-green-600">✓</span>
                                    <span>Basic automations (3 active)</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="text-green-600">✓</span>
                                    <span>Inventory management</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="text-green-600">✓</span>
                                    <span>Order tracking</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="text-green-600">✓</span>
                                    <span>Community support</span>
                                </div>
                            </div>
                            <div className="mt-4 pt-4 border-t">
                                <p className="text-xs text-slate-600"><strong>Target:</strong> New sellers, side hustlers</p>
                                <p className="text-xs text-slate-600 mt-1"><strong>Conversion Strategy:</strong> Freemium hook to build trust</p>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-6 rounded-lg border-2 border-indigo-500 shadow-lg relative">
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                <span className="bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full">MOST POPULAR</span>
                            </div>
                            <div className="text-center mb-4">
                                <h3 className="text-2xl font-bold text-indigo-900">Professional</h3>
                                <p className="text-4xl font-bold text-indigo-600 my-2">$49</p>
                                <p className="text-sm text-slate-600">per month</p>
                            </div>
                            <div className="space-y-2 text-sm">
                                <div className="flex items-start gap-2">
                                    <span className="text-indigo-600">✓</span>
                                    <span className="font-semibold">1,000 AI commands/month</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="text-indigo-600">✓</span>
                                    <span className="font-semibold">Unlimited platform connections</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="text-indigo-600">✓</span>
                                    <span className="font-semibold">Unlimited automations</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="text-indigo-600">✓</span>
                                    <span>Advanced AI insights</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="text-indigo-600">✓</span>
                                    <span>Smart ad campaigns</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="text-indigo-600">✓</span>
                                    <span>Market intelligence</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="text-indigo-600">✓</span>
                                    <span>Priority support</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="text-indigo-600">✓</span>
                                    <span>Advanced analytics</span>
                                </div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-indigo-200">
                                <p className="text-xs text-slate-700"><strong>Target:</strong> Growing sellers ($5k-50k/mo)</p>
                                <p className="text-xs text-slate-700 mt-1"><strong>Value Prop:</strong> 20+ hours saved/week</p>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-lg border-2 border-purple-300 hover:border-purple-400 transition-all">
                            <div className="text-center mb-4">
                                <h3 className="text-2xl font-bold text-purple-900">Enterprise</h3>
                                <p className="text-4xl font-bold text-purple-600 my-2">$199</p>
                                <p className="text-sm text-slate-600">per month</p>
                            </div>
                            <div className="space-y-2 text-sm">
                                <div className="flex items-start gap-2">
                                    <span className="text-purple-600">✓</span>
                                    <span className="font-semibold">Unlimited everything</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="text-purple-600">✓</span>
                                    <span>Custom integrations</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="text-purple-600">✓</span>
                                    <span>White-label options</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="text-purple-600">✓</span>
                                    <span>API access</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="text-purple-600">✓</span>
                                    <span>Dedicated account manager</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="text-purple-600">✓</span>
                                    <span>Custom AI model training</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="text-purple-600">✓</span>
                                    <span>SLA guarantees</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="text-purple-600">✓</span>
                                    <span>Team collaboration features</span>
                                </div>
                            </div>
                            <div className="mt-4 pt-4 border-t">
                                <p className="text-xs text-slate-600"><strong>Target:</strong> Established brands, agencies</p>
                                <p className="text-xs text-slate-600 mt-1"><strong>Value Prop:</strong> Replace entire tech stack</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-2xl">
                        <TrendingUp className="w-6 h-6 text-blue-600" />
                        Revenue Projections
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="text-center p-6 bg-blue-50 rounded-lg">
                            <p className="text-sm text-slate-600 mb-2">Year 1 Target</p>
                            <p className="text-3xl font-bold text-blue-600">$120K</p>
                            <p className="text-xs text-slate-500 mt-2">1,000 free + 200 paid users</p>
                        </div>
                        <div className="text-center p-6 bg-indigo-50 rounded-lg">
                            <p className="text-sm text-slate-600 mb-2">Year 2 Target</p>
                            <p className="text-3xl font-bold text-indigo-600">$1.2M</p>
                            <p className="text-xs text-slate-500 mt-2">5,000 free + 2,000 paid users</p>
                        </div>
                        <div className="text-center p-6 bg-purple-50 rounded-lg">
                            <p className="text-sm text-slate-600 mb-2">Year 3 Target</p>
                            <p className="text-3xl font-bold text-purple-600">$6M</p>
                            <p className="text-xs text-slate-500 mt-2">20,000 free + 10,000 paid users</p>
                        </div>
                    </div>

                    <div className="mt-8">
                        <h3 className="font-bold text-lg mb-4">Assumptions:</h3>
                        <ul className="space-y-2 text-slate-700">
                            <li>• <strong>5:1 free-to-paid conversion ratio</strong> - Industry standard for quality SaaS</li>
                            <li>• <strong>$60 average revenue per paid user</strong> - Mix of Professional ($49) and Enterprise ($199)</li>
                            <li>• <strong>85% Professional tier adoption</strong> - Primary target market</li>
                            <li>• <strong>15% Enterprise tier adoption</strong> - High-value accounts</li>
                            <li>• <strong>8% monthly churn</strong> - Better than industry average due to automation lock-in</li>
                        </ul>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-2xl">
                        <Zap className="w-6 h-6 text-yellow-600" />
                        Secondary Revenue Opportunities
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="p-6 bg-gradient-to-br from-amber-50 to-yellow-50 rounded-lg border border-amber-200">
                            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                                <Package className="w-5 h-5 text-amber-600" />
                                Platform Partnerships
                            </h3>
                            <p className="text-sm text-slate-700 mb-3">
                                Revenue share agreements with platforms we integrate with (Shopify, Etsy, etc.) for driving new sellers to their platforms.
                            </p>
                            <p className="text-xs text-slate-600"><strong>Potential:</strong> $50-200K annually once scaled</p>
                        </div>

                        <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                                <Target className="w-5 h-5 text-blue-600" />
                                Premium Templates & Automations
                            </h3>
                            <p className="text-sm text-slate-700 mb-3">
                                Marketplace for advanced automation templates built by us or third-party creators. Take 30% commission.
                            </p>
                            <p className="text-xs text-slate-600"><strong>Potential:</strong> $100-500K annually once scaled</p>
                        </div>

                        <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
                            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                                <Users className="w-5 h-5 text-green-600" />
                                Agency Services
                            </h3>
                            <p className="text-sm text-slate-700 mb-3">
                                Done-for-you setup and optimization services for Enterprise customers who want expert configuration.
                            </p>
                            <p className="text-xs text-slate-600"><strong>Potential:</strong> $200K-1M annually with dedicated team</p>
                        </div>

                        <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                                <DollarSign className="w-5 h-5 text-purple-600" />
                                Data Insights Products
                            </h3>
                            <p className="text-sm text-slate-700 mb-3">
                                Anonymized market intelligence reports and trend data for agencies, brands, and investors researching e-commerce.
                            </p>
                            <p className="text-xs text-slate-600"><strong>Potential:</strong> $50-300K annually</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-slate-800 to-slate-900 text-white">
                <CardContent className="p-8">
                    <h2 className="text-2xl font-bold mb-4">Unit Economics</h2>
                    <div className="grid md:grid-cols-4 gap-6">
                        <div>
                            <p className="text-sm opacity-80 mb-1">Customer Acquisition Cost</p>
                            <p className="text-3xl font-bold">$35</p>
                            <p className="text-xs opacity-60 mt-1">Through content marketing</p>
                        </div>
                        <div>
                            <p className="text-sm opacity-80 mb-1">Avg Revenue/User/Year</p>
                            <p className="text-3xl font-bold">$720</p>
                            <p className="text-xs opacity-60 mt-1">Blended average</p>
                        </div>
                        <div>
                            <p className="text-sm opacity-80 mb-1">LTV:CAC Ratio</p>
                            <p className="text-3xl font-bold text-green-400">20:1</p>
                            <p className="text-xs opacity-60 mt-1">Exceptional for SaaS</p>
                        </div>
                        <div>
                            <p className="text-sm opacity-80 mb-1">Payback Period</p>
                            <p className="text-3xl font-bold">0.6mo</p>
                            <p className="text-xs opacity-60 mt-1">Under 1 month</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}