
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
        .proposal-alert-red { background: #fef2f2; border-left: 4px solid #dc2626; color: #dc2626; }
        .proposal-alert-blue { background: #eff6ff; border-left: 4px solid #2563eb; color: #2563eb; }
        .proposal-alert-green { background: #f0fdf4; border-left: 4px solid #16a34a; color: #16a34a; }
        .proposal-alert-yellow { background: #fffbeb; border-left: 4px solid #f59e0b; color: #f59e0b; }
        .proposal-alert h3 { color: inherit; margin: 0 0 0.5rem 0; }
        .proposal-alert p { color: inherit; margin: 0 0 0.5rem 0; }
        .proposal-alert p:last-child { margin-bottom: 0; }
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
        .proposal-page-break { page-break-before: always; }
        @media print {
            .no-print { display: none !important; }
            body, .proposal-container { margin: 0; padding: 0; box-shadow: none; border: none; background: white; }
            .proposal-card { box-shadow: none; border: 1px solid #e2e8f0; }
            .proposal-page-break { page-break-before: always; }
        }
    `;

    return (
        <div style={{backgroundColor: '#f8fafc'}}>
            <style>{styles}</style>
            <div className="proposal-container">
                <div className="proposal-print-header no-print">
                    <h1 style={{ fontSize: '2rem' }}>Tandril Co-Investment Opportunity for NVNG</h1>
                    <div>
                        <button onClick={() => window.print()} className="proposal-print-btn">Print/Save PDF</button>
                        <p style={{fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem', textAlign: 'center'}}>On desktop, choose "Save as PDF". On mobile, use the "Share" option in the print preview to save.</p>
                    </div>
                </div>

                {/* Investment Summary */}
                <div className="proposal-card">
                    <div className="proposal-card-header proposal-text-center">
                        <div className="proposal-logo-container">
                            <div className="proposal-logo-box"><div className="proposal-logo-img"></div></div>
                            <div>
                                <h1 className="proposal-h1">Tandril</h1>
                                <p className="proposal-subtitle">AI-Powered E-commerce Automation Platform</p>
                            </div>
                        </div>
                        <div className="proposal-meta-info">
                            <span>🏢 Seed Stage SaaS</span>
                            <span>📍 Sharon, Wisconsin</span>
                            <span>💰 Seeking Co-Investment</span>
                        </div>
                    </div>
                    <div className="proposal-card-content">
                        <div className="proposal-alert proposal-alert-blue">
                            <h3 className="proposal-h3">🎯 Co-Investment Opportunity</h3>
                            <p className="proposal-p">Tandril is raising <strong>$250,000 - $500,000</strong> for <strong>15-20% equity</strong> in our Seed round. We are seeking NVNG as a co-investor alongside our lead investor to leverage your Wisconsin network and institutional expertise.</p>
                        </div>

                        <div className="proposal-alert proposal-alert-green">
                            <h3 className="proposal-h3">✅ NVNG Portfolio Fit</h3>
                            <p className="proposal-p"><strong>Perfect alignment with NVNG criteria:</strong> Seed-stage Wisconsin SaaS company with 100% employees based in-state, seeking sub-$20M round, with clear path to recurring revenue model targeting the $23.5B e-commerce automation market.</p>
                        </div>
                    </div>
                </div>

                {/* Investment Thesis */}
                <div className="proposal-card">
                    <div className="proposal-card-header">
                        <h2 className="proposal-h2">💡 Investment Thesis: First-Mover in Autonomous E-commerce AI</h2>
                    </div>
                    <div className="proposal-card-content">
                        <h3 className="proposal-h3">Market Timing & Competitive Advantage:</h3>
                        <p className="proposal-p">E-commerce sellers manage operations across 4-7 platforms manually, creating a $23.5B total addressable market for automation. While competitors offer "if-this-then-that" tools, Tandril is the first platform offering true autonomous execution—sellers give natural language commands and walk away while AI handles the work 24/7.</p>

                        <div className="proposal-grid-3">
                            <div className="proposal-stat-box">
                                <div className="proposal-stat-number">$23.5B</div>
                                <div className="proposal-stat-label">Total Addressable Market</div>
                            </div>
                            <div className="proposal-stat-box">
                                <div className="proposal-stat-number">2.4M</div>
                                <div className="proposal-stat-label">Target SME Sellers</div>
                            </div>
                            <div className="proposal-stat-box">
                                <div className="proposal-stat-number">18mo</div>
                                <div className="proposal-stat-label">First-Mover Window</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Financial Projections & Returns */}
                <div className="proposal-card">
                    <div className="proposal-card-header">
                        <h2 className="proposal-h2">📊 Financial Projections & Return Analysis</h2>
                    </div>
                    <div className="proposal-card-content">
                        <div className="proposal-alert proposal-alert-green">
                            <h3 className="proposal-h3">💰 Projected Returns (5-Year Hold)</h3>
                            <p className="proposal-p">Based on comparable SaaS exits and our conservative growth model, targeting <strong>25-40x return</strong> for Seed investors through Series B exit or strategic acquisition by Shopify/Amazon at 8-12x revenue multiple.</p>
                        </div>

                        <h3 className="proposal-h3">Revenue Model & Unit Economics:</h3>
                        <table className="proposal-table">
                            <thead>
                                <tr>
                                    <th className="proposal-th">Metric</th>
                                    <th className="proposal-th">Year 1</th>
                                    <th className="proposal-th">Year 2</th>
                                    <th className="proposal-th">Year 3</th>
                                    <th className="proposal-th">Year 5</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="proposal-td">Monthly ARR</td>
                                    <td className="proposal-td">$37K</td>
                                    <td className="proposal-td">$265K</td>
                                    <td className="proposal-td">$1.2M</td>
                                    <td className="proposal-td">$2.3M</td>
                                </tr>
                                <tr>
                                    <td className="proposal-td">Customers</td>
                                    <td className="proposal-td">150</td>
                                    <td className="proposal-td">850</td>
                                    <td className="proposal-td">3,400</td>
                                    <td className="proposal-td">6,800</td>
                                </tr>
                                <tr>
                                    <td className="proposal-td">ARPU</td>
                                    <td className="proposal-td">$247</td>
                                    <td className="proposal-td">$312</td>
                                    <td className="proposal-td">$347</td>
                                    <td className="proposal-td">$347</td>
                                </tr>
                                <tr>
                                    <td className="proposal-td">Annual Churn</td>
                                    <td className="proposal-td">12%</td>
                                    <td className="proposal-td">8%</td>
                                    <td className="proposal-td">6%</td>
                                    <td className="proposal-td">5%</td>
                                </tr>
                            </tbody>
                        </table>

                        <div className="proposal-grid">
                            <div className="proposal-stat-box">
                                <div className="proposal-stat-number">$89</div>
                                <div className="proposal-stat-label">Customer Acquisition Cost</div>
                            </div>
                            <div className="proposal-stat-box">
                                <div className="proposal-stat-number">3.9x</div>
                                <div className="proposal-stat-label">LTV:CAC Ratio</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Wisconsin Advantage & Team */}
                <div className="proposal-card">
                    <div className="proposal-card-header">
                        <h2 className="proposal-h2">🏡 Wisconsin Competitive Advantage</h2>
                    </div>
                    <div className="proposal-card-content">
                        <h3 className="proposal-h3">Why Wisconsin Works for SaaS:</h3>
                        <ul className="proposal-ul">
                            <li className="proposal-li"><strong>Cost Efficiency:</strong> 60% lower operating costs vs. Silicon Valley, extending runway and improving unit economics</li>
                            <li className="proposal-li"><strong>Talent Pool:</strong> Access to UW-Madison computer science graduates at competitive salaries</li>
                            <li className="proposal-li"><strong>Market Proximity:</strong> Target customers are Midwest small business owners, not Silicon Valley tech companies</li>
                            <li className="proposal-li"><strong>Regulatory Stability:</strong> Business-friendly environment with predictable tax structure</li>
                        </ul>

                        <div className="proposal-alert proposal-alert-blue">
                            <h3 className="proposal-h3">👩‍💼 Founder Profile</h3>
                            <p className="proposal-p"><strong>Sarah Evenson</strong> - Janesville native with deep domain expertise as an active multi-platform e-commerce seller. Built the functional prototype herself, proving both technical capability and intimate understanding of customer pain points. Committed to building and scaling in Wisconsin.</p>
                        </div>

                        <div className="proposal-grid">
                            <div className="proposal-stat-box">
                                <div className="proposal-stat-number">100%</div>
                                <div className="proposal-stat-label">WI Employee Base</div>
                            </div>
                            <div className="proposal-stat-box">
                                <div className="proposal-stat-number">25+</div>
                                <div className="proposal-stat-label">Projected WI Jobs by Yr 3</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Use of Investment */}
                <div className="proposal-card">
                    <div className="proposal-card-header">
                        <h2 className="proposal-h2">💸 Use of Investment Capital</h2>
                    </div>
                    <div className="proposal-card-content">
                        <h3 className="proposal-h3">Capital Allocation (24-Month Runway):</h3>
                        <table className="proposal-table">
                            <thead>
                                <tr>
                                    <th className="proposal-th">Category</th>
                                    <th className="proposal-th">Amount</th>
                                    <th className="proposal-th">% of Total</th>
                                    <th className="proposal-th">Key Milestones</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="proposal-td">Product Development</td>
                                    <td className="proposal-td">$175,000</td>
                                    <td className="proposal-td">35%</td>
                                    <td className="proposal-td">Mobile app, advanced AI features</td>
                                </tr>
                                <tr>
                                    <td className="proposal-td">Team Expansion</td>
                                    <td className="proposal-td">$150,000</td>
                                    <td className="proposal-td">30%</td>
                                    <td className="proposal-td">2 senior engineers, 1 product manager</td>
                                </tr>
                                <tr>
                                    <td className="proposal-td">Customer Acquisition</td>
                                    <td className="proposal-td">$125,000</td>
                                    <td className="proposal-td">25%</td>
                                    <td className="proposal-td">Digital marketing, partnerships</td>
                                </tr>
                                <tr>
                                    <td className="proposal-td">Operations & Legal</td>
                                    <td className="proposal-td">$50,000</td>
                                    <td className="proposal-td">10%</td>
                                    <td className="proposal-td">Infrastructure, IP protection</td>
                                </tr>
                            </tbody>
                        </table>

                        <div className="proposal-alert proposal-alert-yellow">
                            <h3 className="proposal-h3">🎯 Key Milestones for Series A</h3>
                            <p className="proposal-p">Target $2M ARR with 40% gross margins and proven multi-platform integrations to support $8-12M Series A at $40-60M pre-money valuation within 18-24 months.</p>
                        </div>
                    </div>
                </div>

                {/* Market Validation & Traction */}
                <div className="proposal-card">
                    <div className="proposal-card-header">
                        <h2 className="proposal-h2">📈 Early Traction & Market Validation</h2>
                    </div>
                    <div className="proposal-card-content">
                        <h3 className="proposal-h3">Product-Market Fit Indicators:</h3>
                        <ul className="proposal-ul">
                            <li className="proposal-li"><strong>Founder-Problem Fit:</strong> Built from personal pain point as struggling multi-platform seller</li>
                            <li className="proposal-li"><strong>Technical Feasibility:</strong> Working prototype demonstrates core AI automation capabilities</li>
                            <li className="proposal-li"><strong>Market Timing:</strong> Platform proliferation creating urgent need for unified automation</li>
                            <li className="proposal-li"><strong>Competitive Moat:</strong> First-mover advantage in autonomous execution vs. manual workflow tools</li>
                        </ul>

                        <div className="proposal-grid-3">
                            <div className="proposal-stat-box">
                                <div className="proposal-stat-number">24/7</div>
                                <div className="proposal-stat-label">Autonomous Operation</div>
                            </div>
                            <div className="proposal-stat-box">
                                <div className="proposal-stat-number">5+</div>
                                <div className="proposal-stat-label">Platform Integrations</div>
                            </div>
                            <div className="proposal-stat-box">
                                <div className="proposal-stat-number">0</div>
                                <div className="proposal-stat-label">Direct Competitors</div>
                            </div>
                        </div>

                        <div className="proposal-alert proposal-alert-green">
                            <h3 className="proposal-h3">🚀 Acquisition Potential</h3>
                            <p className="proposal-p">Strategic value to platforms like Shopify ($80B market cap) or Amazon who need multi-platform solutions. Recent comps: Klaviyo IPO at $9.2B (30x revenue), Gorgias acquired by Helpdesk+ for $300M (15x revenue).</p>
                        </div>
                    </div>
                </div>

                {/* Co-Investment Benefits */}
                <div className="proposal-card">
                    <div className="proposal-card-header">
                        <h2 className="proposal-h2">🤝 NVNG Co-Investment Value Add</h2>
                    </div>
                    <div className="proposal-card-content">
                        <h3 className="proposal-h3">Why NVNG as Strategic Co-Investor:</h3>
                        <ul className="proposal-ul">
                            <li className="proposal-li"><strong>Wisconsin Network:</strong> Access to NVNG's extensive Wisconsin business network for customer development and partnerships</li>
                            <li className="proposal-li"><strong>Institutional Expertise:</strong> Carrie's experience managing $3B+ portfolios brings sophisticated growth strategy and operational guidance</li>
                            <li className="proposal-li"><strong>Follow-On Capital:</strong> NVNG's ability to lead or participate in Series A round ensures aligned growth trajectory</li>
                            <li className="proposal-li"><strong>Exit Facilitation:</strong> Deep relationships with strategic acquirers and institutional buyers in technology sector</li>
                        </ul>

                        <div className="proposal-alert proposal-alert-blue">
                            <h3 className="proposal-h3">🎯 Perfect Portfolio Fit</h3>
                            <p className="proposal-p">Tandril fits NVNG's sweet spot: Wisconsin-based, technology-forward, scalable business model with clear path to institutional growth capital and eventual strategic exit.</p>
                        </div>
                    </div>
                </div>

                {/* Next Steps */}
                <div className="proposal-card">
                    <div className="proposal-card-header proposal-text-center">
                        <h2 className="proposal-h2">🚀 Next Steps</h2>
                    </div>
                    <div className="proposal-card-content">
                        <h3 className="proposal-h3">Investment Process:</h3>
                        <ol className="proposal-ul" style={{listStyleType: 'decimal', paddingLeft: '1.5rem'}}>
                            <li className="proposal-li"><strong>Initial Discussion:</strong> 30-minute call to discuss investment thesis and NVNG portfolio fit</li>
                            <li className="proposal-li"><strong>Product Demo:</strong> Live demonstration of Tandril's autonomous AI capabilities</li>
                            <li className="proposal-li"><strong>Due Diligence:</strong> Financial model review, technical architecture, and market validation</li>
                            <li className="proposal-li"><strong>Term Sheet:</strong> Finalize co-investment terms alongside lead investor</li>
                            <li className="proposal-li"><strong>Portfolio Integration:</strong> Leverage NVNG network for growth acceleration</li>
                        </ol>

                        <div style={{ textAlign: 'center', padding: '2rem', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', borderRadius: '12px', color: 'white', marginTop: '2rem' }}>
                            <h3 style={{ color: 'white', marginBottom: '1rem', fontSize: '1.5rem' }}>Ready to Discuss Co-Investment Opportunity?</h3>
                            <p style={{ color: 'white', fontSize: '1.25rem', fontWeight: 'bold' }}>Sarah Evenson, Founder & CEO</p>
                            <p style={{ color: 'white', fontSize: '1.125rem', marginTop: '0.5rem' }}>608-931-1923 | omamahills@gmail.com</p>
                        </div>
                    </div>
                </div>

                <div className="proposal-footer">
                    <p className="proposal-p"><strong>Tandril - AI-Powered E-commerce Automation</strong></p>
                    <p className="proposal-p">Co-Investment Opportunity • Prepared for NVNG Investment Advisors • 2025</p>
                </div>
            </div>
        </div>
    );
}
