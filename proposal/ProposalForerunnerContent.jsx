
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Users, Target, BarChart3, Bot, Sparkles, DollarSign, ArrowRight } from 'lucide-react';
import TandrilLogo from '../logos/TandrilLogo';

const Slide = ({ title, children, slideNumber }) => (
    <Card className="bg-white/90 backdrop-blur-lg shadow-2xl w-full mx-auto border-slate-200/80 overflow-hidden mb-12">
        <CardContent className="p-8 md:p-12 min-h-[500px] flex flex-col justify-center">
            {title && <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-6 text-center">{title}</h2>}
            <div className="prose prose-lg max-w-none text-slate-700">
                {children}
            </div>
        </CardContent>
        <div className="bg-slate-50 px-8 py-2 text-right text-sm text-slate-500 font-medium border-t">
            {slideNumber}
        </div>
    </Card>
);

const TitleSlide = () => (
     <Card className="bg-gradient-to-br from-indigo-600 to-purple-700 shadow-2xl w-full mx-auto border-none overflow-hidden mb-12">
        <CardContent className="p-12 md:p-16 min-h-[500px] flex flex-col justify-center items-center text-center text-white">
            <TandrilLogo className="h-20 w-20 mb-6" />
            <h1 className="text-4xl md:text-6xl font-bold leading-tight">Tandril</h1>
            <p className="mt-4 text-xl md:text-2xl opacity-90 max-w-3xl">
                The AI-Native Operating System for the Modern E-Commerce Entrepreneur
            </p>
            <p className="mt-8 text-lg font-medium">A Proposal for Forerunner Ventures</p>
        </CardContent>
        <div className="bg-black/20 px-8 py-2 text-right text-sm text-white/80 font-medium">
            1
        </div>
    </Card>
);

export default function ProposalForerunnerContent() {

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-4 sm:p-6 md:p-10">
            <div className="max-w-4xl mx-auto">
                <TitleSlide />

                <Slide title="The Modern E-Commerce Landscape is Fragmented" slideNumber="2">
                    <div className="grid md:grid-cols-2 gap-8 items-center">
                        <div>
                            <p>Today's entrepreneur isn't just a seller; they are a marketer, inventory manager, customer service agent, and financial analyst, juggling dozens of tools across multiple platforms.</p>
                            <p className="font-bold text-red-600 text-xl mt-4">This complexity is the single biggest barrier to profitable scale.</p>
                        </div>
                         <div className="space-y-4">
                            <Card className="bg-red-50 border-red-200 p-4"><p className="font-semibold text-red-800">Siloed data leads to missed opportunities and costly errors.</p></Card>
                            <Card className="bg-amber-50 border-amber-200 p-4"><p className="font-semibold text-amber-800">Repetitive, manual tasks consume over 40% of an entrepreneur's time.</p></Card>
                            <Card className="bg-blue-50 border-blue-200 p-4"><p className="font-semibold text-blue-800">Scaling ad spend or product lines exponentially increases operational drag.</p></Card>
                        </div>
                    </div>
                </Slide>

                <Slide title="The Solution: Tandril, The AI Co-Founder" slideNumber="3">
                     <div className="text-center">
                        <Bot className="mx-auto h-16 w-16 text-indigo-500 mb-4" />
                        <p className="text-xl">Tandril is the AI-native operating system that centralizes command and automates execution for e-commerce.</p>
                        <p className="mt-4">It's not another dashboard. It's an active, intelligent partner that turns natural language into action, allowing a single founder to operate with the leverage of a full team.</p>
                    </div>
                </Slide>
                
                <Slide title="A Compounding Business Model" slideNumber="4">
                    <p className="text-center">Tandril is structurally advantaged. The model gets stronger and the competitive moat deepens as it grows.</p>
                    <div className="mt-8 grid md:grid-cols-3 gap-6 text-center">
                        <div className="p-4 bg-slate-50 rounded-lg border">
                             <BarChart3 className="mx-auto h-10 w-10 text-blue-500 mb-2" />
                            <h4 className="font-bold text-lg">Proprietary Data</h4>
                            <p className="text-sm">Every command and outcome enriches the core AI, creating an unparalleled dataset on e-commerce strategy and execution that no competitor can replicate.</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-lg border">
                            <Sparkles className="mx-auto h-10 w-10 text-purple-500 mb-2" />
                            <h4 className="font-bold text-lg">Data Network Effects</h4>
                            <p className="text-sm">As more entrepreneurs use Tandril, the AI gets smarter for everyone. Trend analysis becomes more accurate and strategic recommendations become more potent.</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-lg border">
                            <Bot className="mx-auto h-10 w-10 text-green-500 mb-2" />
                            <h4 className="font-bold text-lg">Deep Ecosystem Integration</h4>
                            <p className="text-sm">By becoming the central nervous system connected to Shopify, Amazon, Ads platforms, and more, Tandril creates high switching costs and becomes embedded in daily operations.</p>
                        </div>
                    </div>
                </Slide>
                
                <Slide title="The Technology: Built for Execution" slideNumber="5">
                    <p className="text-center">This isn't theory; it's execution. The core infrastructure to interpret intent and execute complex actions reliably across multiple systems is already built.</p>
                     <div className="mt-8 p-6 bg-slate-100 rounded-lg">
                        <ul className="space-y-4">
                            <li className="flex items-center gap-4">
                                <div className="font-bold text-indigo-600 text-lg">1.</div>
                                <div>
                                    <h4 className="font-semibold text-lg m-0">Language Interpretation Engine</h4>
                                    <p className="m-0 text-sm">Translates natural language commands into structured, machine-readable action plans.</p>
                                </div>
                            </li>
                             <li className="flex items-center gap-4">
                                <div className="font-bold text-indigo-600 text-lg">2.</div>
                                <div>
                                    <h4 className="font-semibold text-lg m-0">Multi-Platform Adapter Framework</h4>
                                    <p className="m-0 text-sm">A scalable architecture that allows for rapid integration of new e-commerce platforms and APIs (Shopify, Amazon, Etsy, etc.).</p>
                                </div>
                            </li>
                             <li className="flex items-center gap-4">
                                <div className="font-bold text-indigo-600 text-lg">3.</div>
                                <div>
                                    <h4 className="font-semibold text-lg m-0">Secure Execution Engine</h4>
                                    <p className="m-0 text-sm">Manages authentication, permissions, and the secure execution of tasks like updating product listings or launching ad campaigns.</p>
                                </div>
                            </li>
                        </ul>
                    </div>
                </Slide>
                
                <Slide title="Why Now? The Unbundling of E-commerce Operations" slideNumber="6">
                     <p className="text-center">Tandril is built on the conviction that a fundamental shift is happening. The creator economy has empowered individuals to build brands, but the operational tools haven't kept up.</p>
                    <div className="mt-8 grid md:grid-cols-2 gap-8">
                        <div>
                            <h4 className="font-bold text-xl mb-2">The Rise of the Solopreneur</h4>
                            <p>Millions of highly-motivated entrepreneurs are building significant businesses single-handedly. They need leverage, not more SaaS subscriptions.</p>
                        </div>
                        <div>
                            <h4 className="font-bold text-xl mb-2">AI as a Utility</h4>
                            <p>For the first time, AI is capable of not just analyzing, but acting. This makes it possible to build a true "co-founder" that can execute complex, multi-step tasks.</p>
                        </div>
                    </div>
                </Slide>

                <Slide title="The Ask" slideNumber="7">
                    <div className="text-center">
                        <DollarSign className="mx-auto h-16 w-16 text-green-500 mb-6" />
                        <p className="text-2xl font-bold">I am seeking a $1.5M seed investment.</p>
                        <p className="mt-4 text-xl">This capital will be used to achieve three primary goals over the next 18 months:</p>
                        <ul className="mt-6 text-left inline-block space-y-3">
                            <li className="flex items-center gap-3"><CheckCircle className="h-6 w-6 text-green-500" /><span>Expand the engineering team to accelerate product velocity.</span></li>
                            <li className="flex items-center gap-3"><CheckCircle className="h-6 w-6 text-green-500" /><span>Secure 100 paying customers to validate product-market fit.</span></li>
                            <li className="flex items-center gap-3"><CheckCircle className="h-6 w-6 text-green-500" /><span>Deepen integrations with key ad platforms and marketplaces.</span></li>
                        </ul>
                    </div>
                </Slide>

                <Slide title="Why Forerunner?" slideNumber="8">
                    <div className="text-center">
                        <p className="text-xl">Forerunner has an unparalleled track record of identifying and supporting the iconic brands that define the future of commerce.</p>
                        <p className="mt-4">I am compelled by your thesis on the modern consumer and the infrastructure that serves them. I see a partner who understands that Tandril isn't just a B2B SaaS tool; it's a foundational platform for the next generation of entrepreneurs.</p>
                        <p className="font-bold mt-6 text-xl text-indigo-700">This is more than a request for capital; it's a request for a partner with the expertise and conviction to help build a category-defining company.</p>
                    </div>
                </Slide>
            </div>
        </div>
    );
}
