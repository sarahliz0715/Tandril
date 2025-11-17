
import React from 'react';

export default function ProposalContent() {
    const styles = `
        .proposal-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
            background-color: white;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        .proposal-card {
            background-color: white;
            border-radius: 12px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            border: 1px solid #e2e8f0;
            margin-bottom: 2rem;
            page-break-inside: avoid;
        }
        .proposal-card-header, .proposal-card-content {
            padding: 1.5rem;
        }
        .proposal-card-header {
            border-bottom: 1px solid #f1f5f9;
        }
        .proposal-text-center { text-align: center; }
        .proposal-logo-container { display: flex; align-items: center; justify-content: center; gap: 1rem; margin-bottom: 1rem; }
        .proposal-logo-box { width: 80px; height: 80px; background: #000; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
        .proposal-logo-img { width: 64px; height: 64px; background-image: url(https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/17db83b44_ChatGPTImageAug19202509_14_32AM.png); background-size: 200% 100%; background-position: left center; background-repeat: no-repeat; filter: brightness(1.25) saturate(1.2); }
        .proposal-h1 { font-size: 2.5rem; font-weight: bold; color: #1e293b; margin: 0; }
        .proposal-h2 { font-size: 1.5rem; font-weight: bold; color: #1e293b; margin: 0 0 0.5rem 0; }
        .proposal-h3 { font-weight: bold; margin: 0 0 0.5rem 0; }
        .proposal-p { color: #64748b; line-height: 1.6; margin: 0 0 1rem 0; }
        .proposal-subtitle { font-size: 1.125rem; color: #64748b; margin: 0; }
        .proposal-meta-info { display: flex; align-items: center; justify-content: center; gap: 1.5rem; font-size: 0.875rem; color: #64748b; }
        .proposal-alert { padding: 1.5rem; border-radius: 12px; margin-bottom: 1.5rem; }
        .proposal-alert-blue { background: #eff6ff; border-left: 4px solid #2563eb; color: #2563eb; }
        .proposal-alert-green { background: #f0fdf4; border-left: 4px solid #16a34a; color: #16a34a; }
        .proposal-alert-yellow { background: #fffbeb; border-left: 4px solid #f59e0b; color: #f59e0b; }
        .proposal-alert h3 { color: inherit; margin: 0 0 0.5rem 0; }
        .proposal-alert p { color: inherit; margin: 0 0 0.5rem 0; }
        .proposal-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin: 1rem 0; }
        .proposal-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin: 1rem 0; }
        .proposal-stat-box { background: #f8fafc; padding: 1rem; border-radius: 8px; text-align: center; }
        .proposal-stat-number { font-size: 2rem; font-weight: bold; color: #1e293b; }
        .proposal-stat-label { font-size: 0.875rem; color: #64748b; }
        .proposal-footer { text-align: center; font-size: 0.875rem; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 1.5rem; margin-top: 1.5rem; }
        .proposal-print-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
        .proposal-print-btn { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 0.75rem 1.5rem; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; text-decoration: none; }
        .proposal-ul { margin: 1rem 0; padding-left: 1.5rem; }
        .proposal-li { margin-bottom: 0.5rem; color: #64748b; }
        .proposal-table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
        .proposal-th, .proposal-td { padding: 0.75rem; border: 1px solid #e2e8f0; text-align: left; }
        .proposal-th { background: #f8fafc; font-weight: bold; color: #1e293b; }
        @media print {
            .no-print { display: none !important; }
            body, .proposal-container { margin: 0; padding: 0; box-shadow: none; border: none; background: white; }
            .proposal-card { box-shadow: none; border: 1px solid #e2e8f0; }
        }
    `;

    return (
        <div style={{backgroundColor: '#f8fafc'}}>
            <style>{styles}</style>
            <div className="proposal-container">
                <div className="proposal-print-header no-print">
                    <h1 style={{ fontSize: '2rem' }}>Tandril Investment Deck for gener8tor</h1>
                    <div>
                        <button onClick={() => window.print()} className="proposal-print-btn">Print/Save PDF</button>
                        <p style={{fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem', textAlign: 'center'}}>On desktop, choose "Save as PDF". On mobile, use the "Share" option in the print preview to save.</p>
                    </div>
                </div>

                <div className="proposal-card">
                    <div className="proposal-card-header proposal-text-center">
                        <div className="proposal-logo-container">
                            <div className="proposal-logo-box"><div className="proposal-logo-img"></div></div>
                            <div>
                                <h1 className="proposal-h1">Tandril</h1>
                                <p className="proposal-subtitle">The AI Operating System for E-commerce</p>
                            </div>
                        </div>
                        <div className="proposal-meta-info">
                            <span>🚀 High-Growth SaaS</span>
                            <span>📍 Sharon, Wisconsin</span>
                            <span>💰 Raising $500k Seed</span>
                        </div>
                    </div>
                    <div className="proposal-card-content">
                        <div className="proposal-alert proposal-alert-blue">
                            <h3 className="proposal-h3">🎯 The Ask: Lead Investor for a $500k Seed Round</h3>
                            <p className="proposal-p">Tandril is seeking a lead investor for our $500,000 Seed round to accelerate product development, acquire our first 150 customers, and solidify our first-mover advantage. We believe `gener8tor` is the ideal partner to help us scale.</p>
                        </div>
                        <div className="proposal-alert proposal-alert-green">
                            <h3 className="proposal-h3">✅ Perfect `gener8tor` Candidate</h3>
                            <p className="proposal-p">A Wisconsin-based, venture-scale SaaS company with a strong technical founder, a massive addressable market, and a working prototype. We are ready to leverage the `gener8tor` playbook to achieve explosive growth.</p>
                        </div>
                    </div>
                </div>

                <div className="proposal-card">
                    <div className="proposal-card-header">
                        <h2 className="proposal-h2">🚨 The Problem: E-commerce is Drowning in Manual Work</h2>
                    </div>
                    <div className="proposal-card-content">
                        <p className="proposal-p">Successful e-commerce sellers manage 4-7 platforms, spending 60+ hours per week on repetitive tasks like inventory updates, pricing changes, and customer service. They are trapped in operations, unable to focus on growth. Existing tools like Zapier are brittle, require technical skill, and don't offer true autonomy.</p>
                         <div className="proposal-grid-3">
                            <div className="proposal-stat-box">
                                <div className="proposal-stat-number">60+</div>
                                <div className="proposal-stat-label">Hours/Week on Manual Tasks</div>
                            </div>
                            <div className="proposal-stat-box">
                                <div className="proposal-stat-number">4-7</div>
                                <div className="proposal-stat-label">Platforms per Seller</div>
                            </div>
                            <div className="proposal-stat-box">
                                <div className="proposal-stat-number">$75k+</div>
                                <div className="proposal-stat-label">Opportunity Cost per Seller</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="proposal-card">
                    <div className="proposal-card-header">
                        <h2 className="proposal-h2">🚀 Our Solution: The First Autonomous AI Agent for Commerce</h2>
                    </div>
                    <div className="proposal-card-content">
                        <p className="proposal-p">Tandril is an AI agent that works 24/7 in the background. Sellers give natural language commands—"Update all my winter products to 15% off"—and walk away. Tandril understands the intent, plans the multi-platform execution, and gets the job done without supervision.</p>
                        <h3 className="proposal-h3">Key Capabilities:</h3>
                        <ul className="proposal-ul">
                            <li className="proposal-li"><strong>Autonomous Execution:</strong> Works 24/7 without user supervision.</li>
                            <li className="proposal-li"><strong>Multi-Platform Native:</strong> One command updates Shopify, Etsy, Amazon, and more.</li>
                            <li className="proposal-li"><strong>Natural Language Interface:</strong> No complex "if-this-then-that" setups.</li>
                            <li className="proposal-li"><strong>Proactive Intelligence:</strong> Evolves to suggest optimizations for pricing, inventory, and ads.</li>
                        </ul>
                    </div>
                </div>

                <div className="proposal-card">
                    <div className="proposal-card-header">
                        <h2 className="proposal-h2">📈 Market Opportunity: A $23.5 Billion Blue Ocean</h2>
                    </div>
                    <div className="proposal-card-content">
                         <p className="proposal-p">The market for e-commerce automation is massive and underserved. While competitors focus on single platforms or simple workflows, no one is offering true, cross-platform autonomous execution. This gives us a clear 18-month window to capture the market.</p>
                        <div className="proposal-grid-3">
                            <div className="proposal-stat-box">
                                <div className="proposal-stat-number">$23.5B</div>
                                <div className="proposal-stat-label">Total Addressable Market</div>
                            </div>
                            <div className="proposal-stat-box">
                                <div className="proposal-stat-number">2.4M</div>
                                <div className="proposal-stat-label">Target SME Sellers in US</div>
                            </div>
                            <div className="proposal-stat-box">
                                <div className="proposal-stat-number">0</div>
                                <div className="proposal-stat-label">Direct Competitors</div>
                            </div>
                        </div>
                         <h3 className="proposal-h3" style={{marginTop: '2rem'}}>Go-to-Market Strategy:</h3>
                        <p className="proposal-p">We will acquire our first users through targeted outreach in private e-commerce communities (Facebook Groups, Reddit) where sellers share tools and advice. This is a capital-efficient strategy that relies on product-led growth and peer-to-peer trust.</p>
                    </div>
                </div>

                <div className="proposal-card">
                    <div className="proposal-card-header">
                        <h2 className="proposal-h2">📊 Business Model & Unit Economics</h2>
                    </div>
                    <div className="proposal-card-content">
                        <p className="proposal-p">We use a standard tiered SaaS model. Our projections are based on a blended Average Revenue Per User (ARPU) of $312/month, targeting established sellers who derive significant value from our automation.</p>
                         <table className="proposal-table">
                            <thead>
                                <tr>
                                    <th className="proposal-th">Metric</th>
                                    <th className="proposal-th">Projected Value</th>
                                    <th className="proposal-th">SaaS Industry Benchmark</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="proposal-td">LTV:CAC Ratio</td>
                                    <td className="proposal-td"><strong>3.9x</strong></td>
                                    <td className="proposal-td">&gt; 3x</td>
                                </tr>
                                 <tr>
                                    <td className="proposal-td">CAC Payback Period</td>
                                    <td className="proposal-td"><strong>7 months</strong></td>
                                    <td className="proposal-td">&lt; 12 months</td>
                                </tr>
                                <tr>
                                    <td className="proposal-td">Annual Churn</td>
                                    <td className="proposal-td"><strong>&lt; 8%</strong></td>
                                    <td className="proposal-td">&lt; 10%</td>
                                </tr>
                            </tbody>
                        </table>
                         <div className="proposal-alert proposal-alert-green">
                            <h3 className="proposal-h3">💰 Path to Profitability</h3>
                            <p className="proposal-p">With strong unit economics and a disciplined GTM strategy, we project reaching profitability within 24-30 months, with a clear path to $10M+ ARR in Year 3.</p>
                        </div>
                    </div>
                </div>

                <div className="proposal-card">
                    <div className="proposal-card-header">
                        <h2 className="proposal-h2">👩‍💼 Team: The Right Founder for the Job</h2>
                    </div>
                    <div className="proposal-card-content">
                        <div className="proposal-alert proposal-alert-blue">
                            <h3 className="proposal-h3">Founder-Problem Fit</h3>
                            <p className="proposal-p"><strong>Sarah Evenson (Founder & CEO):</strong> As a multi-platform e-commerce seller myself, I lived this problem daily. I built the prototype for Tandril because I desperately needed it. This deep domain expertise is our greatest unfair advantage—we understand the customer's pain points better than anyone.</p>
                        </div>
                        <h3 className="proposal-h3">Why Me?</h3>
                        <ul className="proposal-ul">
                           <li className="proposal-li"><strong>Technical & Scrappy:</strong> Taught myself to code and built the functional prototype.
                           </li><li className="proposal-li"><strong>Domain Expert:</strong> 10+ years in e-commerce, understands every workflow and pain point.</li>
                           <li className="proposal-li"><strong>Vision & Grit:</strong> Committed to building a category-defining company from Wisconsin.</li>
                           <li className="proposal-li"><strong>Coachable:</strong> Eager to learn from the `gener8tor` network and apply the playbook to scale Tandril.</li>
                        </ul>
                    </div>
                </div>

                <div className="proposal-card">
                    <div className="proposal-card-header">
                        <h2 className="proposal-h2">💸 Use of Funds & Milestones</h2>
                    </div>
                    <div className="proposal-card-content">
                         <p className="proposal-p">This $500k seed round provides an 18-month runway to hit critical milestones for our Series A.</p>
                        <table className="proposal-table">
                            <thead>
                                <tr>
                                    <th className="proposal-th">Allocation</th>
                                    <th className="proposal-th">Amount</th>
                                    <th className="proposal-th">Purpose</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="proposal-td">Product & Engineering</td>
                                    <td className="proposal-td">$225,000 (45%)</td>
                                    <td className="proposal-td">Hire 2 senior engineers to scale the AI core & platform integrations.</td>
                                </tr>
                                <tr>
                                    <td className="proposal-td">Go-to-Market</td>
                                    <td className="proposal-td">$150,000 (30%)</td>
                                    <td className="proposal-td">Execute targeted community marketing and build initial sales funnel.</td>
                                </tr>
                                <tr>
                                    <td className="proposal-td">Founder & Operations</td>
                                    <td className="proposal-td">$125,000 (25%)</td>
                                    <td className="proposal-td">Founder salary, infrastructure, and operational costs.</td>
                                </tr>
                            </tbody>
                        </table>
                         <div className="proposal-alert proposal-alert-yellow" style={{marginTop: '2rem'}}>
                            <h3 className="proposal-h3">🎯 Key 18-Month Milestones for Series A:</h3>
                             <ul className="proposal-ul" style={{paddingLeft: '1rem', margin: '0.5rem 0 0 0'}}>
                               <li className="proposal-li">Achieve <strong>$50k+ Monthly Recurring Revenue (MRR)</strong></li>
                               <li className="proposal-li">Acquire <strong>150+ paying customers</strong></li>
                               <li className="proposal-li">Launch full integrations with Shopify, Amazon, and Etsy</li>
                               <li className="proposal-li">Demonstrate product-market fit with low churn (&lt;8%)</li>
                            </ul>
                        </div>
                    </div>
                </div>
                
                <div className="proposal-card">
                     <div className="proposal-card-header proposal-text-center">
                        <h2 className="proposal-h2">🚀 Let's Build the Future of Commerce Together</h2>
                    </div>
                    <div className="proposal-card-content" style={{textAlign: 'center'}}>
                        <p className="proposal-p" style={{fontSize: '1.1rem'}}>I have the direct experience, technical skill, and market timing to make Tandril a globally-recognized leader in AI and commerce. I believe `gener8tor` is the perfect partner to help me achieve that vision and build the team to scale it.</p>
                         <div style={{ textAlign: 'center', padding: '2rem', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', borderRadius: '12px', color: 'white', marginTop: '2rem' }}>
                            <h3 style={{ color: 'white', marginBottom: '1rem', fontSize: '1.5rem' }}>Ready to Discuss?</h3>
                            <p style={{ color: 'white', fontSize: '1.25rem', fontWeight: 'bold' }}>Sarah Evenson, Founder & CEO</p>
                            <p style={{ color: 'white', fontSize: '1.125rem', marginTop: '0.5rem' }}>608-931-1923 | omamahills@gmail.com</p>
                        </div>
                    </div>
                </div>

                <div className="proposal-footer">
                    <p>Tandril - AI Operating System for E-commerce • Confidential Investment Proposal • 2025</p>
                </div>
            </div>
        </div>
    );
}
