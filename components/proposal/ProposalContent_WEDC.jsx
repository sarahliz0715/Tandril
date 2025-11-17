
import React from 'react';

export default function ProposalContent() {
    const styles = `
        .proposal-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
            background-color: white;
            font-family: -apple-system, BlinkMacMacSystemFont, "Segoe UI", Roboto, sans-serif;
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
                    <h1 style={{ fontSize: '2rem' }}>Tandril Investment Proposal for WEDC</h1>
                    <div>
                        <button onClick={() => window.print()} className="proposal-print-btn">Print/Save PDF</button>
                        <p style={{fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem', textAlign: 'center'}}>On desktop, choose "Save as PDF". On mobile, use the "Share" option in the print preview to save.</p>
                    </div>
                </div>

                {/* Investment Overview */}
                <div className="proposal-card">
                    <div className="proposal-card-header proposal-text-center">
                        <div className="proposal-logo-container">
                            <div className="proposal-logo-box"><div className="proposal-logo-img"></div></div>
                            <div>
                                <h1 className="proposal-h1">Tandril</h1>
                                <p className="proposal-subtitle">Building Wisconsin's AI Future</p>
                            </div>
                        </div>
                        <div className="proposal-meta-info">
                            <span>📍 Sharon, Wisconsin</span>
                            <span>🏢 Founded 2025</span>
                            <span>👩‍💼 Sarah Evenson, Founder</span>
                        </div>
                    </div>
                    <div className="proposal-card-content">
                        <div className="proposal-alert proposal-alert-green">
                            <h3 className="proposal-h3">🤝 Alignment with WEDC Mission</h3>
                            <p className="proposal-p">Tandril represents the kind of innovative, high-growth technology company the WEDC was created to support. We are proving that world-class AI companies can be built and scaled right here in small Wisconsin communities—keeping talent, jobs, and tax revenue in-state.</p>
                            <p className="proposal-p"><strong>An investment in Tandril is a direct investment in Wisconsin's economic future.</strong></p>
                        </div>

                        <div className="proposal-alert proposal-alert-blue">
                            <h3 className="proposal-h3">💼 Investment Opportunity</h3>
                            <p className="proposal-p">Tandril is seeking <strong>$250,000 to $500,000</strong> in early-stage funding to accelerate development and capture a first-mover advantage in the e-commerce automation market.</p>
                        </div>
                    </div>
                </div>

                {/* QNBV Certification Alignment */}
                <div className="proposal-card">
                     <div className="proposal-card-header">
                        <h2 className="proposal-h2">✅ QNBV Program Alignment</h2>
                    </div>
                    <div className="proposal-card-content">
                        <p className="proposal-p">Tandril meets the criteria for designation as a Qualified New Business Venture (QNBV), making it an ideal candidate for state-backed investment and support.</p>
                        <table className="proposal-table">
                            <thead>
                                <tr>
                                    <th className="proposal-th">QNBV Criteria</th>
                                    <th className="proposal-th">Tandril's Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="proposal-td">Headquartered in Wisconsin</td>
                                    <td className="proposal-td">✔ Yes, in Sharon, WI</td>
                                </tr>
                                <tr>
                                    <td className="proposal-td">At least 51% of employees/payroll in WI</td>
                                    <td className="proposal-td">✔ Yes, 100% commitment</td>
                                </tr>
                                <tr>
                                    <td className="proposal-td">Fewer than 100 employees</td>
                                    <td className="proposal-td">✔ Yes (Currently 1, projecting 55)</td>
                                </tr>
                                <tr>
                                    <td className="proposal-td">In operation 10 years or less</td>
                                    <td className="proposal-td">✔ Yes, founded in 2025</td>
                                </tr>
                                <tr>
                                    <td className="proposal-td">Significant potential for job creation</td>
                                    <td className="proposal-td">✔ Yes, projecting 55+ high-tech jobs</td>
                                </tr>
                                <tr>
                                    <td className="proposal-td">Less than $10M aggregate private equity</td>
                                    <td className="proposal-td">✔ Yes, this is our seed round ($0 raised)</td>
                                </tr>
                                <tr>
                                    <td className="proposal-td">Focus on technological advancement</td>
                                    <td className="proposal-td">✔ Yes, we are a core AI technology company</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Economic Impact Section */}
                <div className="proposal-card">
                    <div className="proposal-card-header">
                        <h2 className="proposal-h2">📈 Economic Impact & Ecosystem Growth</h2>
                    </div>
                    <div className="proposal-card-content">
                        <h3 className="proposal-h3">Economic Impact Projections:</h3>
                        <div className="proposal-grid">
                            <div className="proposal-stat-box">
                                <div className="proposal-stat-number">55+</div>
                                <div className="proposal-stat-label">Wisconsin Jobs by Year 5</div>
                            </div>
                            <div className="proposal-stat-box">
                                <div className="proposal-stat-number">$5.4M</div>
                                <div className="proposal-stat-label">Annual WI Payroll by Year 5</div>
                            </div>
                        </div>
                        <div className="proposal-grid">
                            <div className="proposal-stat-box">
                                <div className="proposal-stat-number">$400K+</div>
                                <div className="proposal-stat-label">Annual State Tax Revenue by Y3</div>
                            </div>
                            <div className="proposal-stat-box">
                                <div className="proposal-stat-number">100%</div>
                                <div className="proposal-stat-label">Committed to WI HQ</div>
                            </div>
                        </div>

                        <div className="proposal-alert proposal-alert-yellow">
                            <h3 className="proposal-h3">💡 The Wisconsin Tech Ecosystem Story</h3>
                            <p className="proposal-p">Every successful Wisconsin tech company creates a multiplier effect—inspiring other entrepreneurs, creating a talent pool, and proving it can be done here. Tandril wants to be part of that story, not another brain drain statistic.</p>
                        </div>
                    </div>
                </div>

                {/* The Problem */}
                <div className="proposal-card">
                    <div className="proposal-card-header">
                        <h2 className="proposal-h2">🚨 The Problem: Small Businesses Trapped by Operational Burden</h2>
                    </div>
                    <div className="proposal-card-content">
                        <p className="proposal-p">The e-commerce boom created millions of small business opportunities, but also an operational nightmare. Today's multi-platform sellers aren't entrepreneurs—they're full-time data entry clerks.</p>
                        <h3 className="proposal-h3">Daily Pain Points:</h3>
                        <ul className="proposal-ul">
                            <li className="proposal-li"><strong>Multi-Platform Chaos:</strong> Manually updating inventory across Shopify, Etsy, Amazon, eBay, and Facebook Marketplace</li>
                            <li className="proposal-li"><strong>Pricing Wars:</strong> Constantly monitoring competitors and adjusting thousands of listings</li>
                            <li className="proposal-li"><strong>Customer Service Overload:</strong> Responding to messages across different platforms with different requirements</li>
                        </ul>
                    </div>
                </div>

                {/* Our Solution */}
                <div className="proposal-card proposal-page-break">
                    <div className="proposal-card-header">
                        <h2 className="proposal-h2">🚀 Tandril: The AI Employee That Never Sleeps</h2>
                    </div>
                    <div className="proposal-card-content">
                        <div className="proposal-alert proposal-alert-blue">
                            <h3 className="proposal-h3">🎯 Revolutionary Approach: True Autonomous Execution</h3>
                            <p className="proposal-p">Tandril is the first platform that works independently in the background. A user gives a command once, and Tandril handles everything—even while they sleep.</p>
                        </div>

                        <h3 className="proposal-h3">Key Capabilities:</h3>
                        <ul className="proposal-ul">
                            <li className="proposal-li"><strong>24/7 Background Operations:</strong> Works while you're sleeping, on vacation, or focused on other tasks</li>
                            <li className="proposal-li"><strong>Multi-Platform Native:</strong> Single command updates across Shopify, Etsy, Amazon, eBay simultaneously</li>
                            <li className="proposal-li"><strong>Smart Bulk Actions:</strong> "Update all products with 'vintage' in the title to include sustainability tags"</li>
                            <li className="proposal-li"><strong>Dynamic Pricing:</strong> "Keep my price 5% below top 3 competitors, check hourly"</li>
                        </ul>
                    </div>
                </div>
                
                {/* Market Opportunity */}
                <div className="proposal-card">
                    <div className="proposal-card-header">
                        <h2 className="proposal-h2">📈 Market Opportunity: $23.5B Total Addressable Market</h2>
                    </div>
                    <div className="proposal-card-content">
                        <p className="proposal-p">The multi-platform e-commerce automation market is huge and growing rapidly, driven by platform proliferation and the need for operational efficiency.</p>
                         <h3 className="proposal-h3">Revenue Opportunity:</h3>
                        <table className="proposal-table">
                            <thead>
                                <tr>
                                    <th className="proposal-th">Market Segment</th>
                                    <th className="proposal-th">Businesses</th>
                                    <th className="proposal-th">Monthly ARPU</th>
                                    <th className="proposal-th">TAM (Annual)</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="proposal-td">SME Multi-Platform</td>
                                    <td className="proposal-td">2.4M</td>
                                    <td className="proposal-td">$400</td>
                                    <td className="proposal-td">$11.5B</td>
                                </tr>
                                <tr>
                                    <td className="proposal-td">Enterprise Multi-Channel</td>
                                    <td className="proposal-td">400K</td>
                                    <td className="proposal-td">$2,500</td>
                                    <td className="proposal-td">$12.0B</td>
                                </tr>
                                <tr style={{fontWeight: 'bold'}}>
                                    <td colSpan="3">Total Addressable Market</td>
                                    <td>$23.5B annually</td>
                                </tr>
                            </tbody>
                        </table>
                        <div className="proposal-alert proposal-alert-green">
                            <h3 className="proposal-h3">🎯 Conservative Market Capture</h3>
                            <p className="proposal-p">Even capturing just <strong>0.1% of this market represents $23.5M in annual revenue</strong>—a realistic goal that provides enormous upside potential.</p>
                        </div>
                    </div>
                </div>

                {/* Team & Wisconsin Focus */}
                <div className="proposal-card">
                    <div className="proposal-card-header">
                        <h2 className="proposal-h2">👥 Leadership: Wisconsin-Rooted, Global-Ready</h2>
                    </div>
                    <div className="proposal-card-content">
                        <div className="proposal-alert proposal-alert-blue">
                            <h3 className="proposal-h3">🎯 Founder-Problem Fit</h3>
                            <p className="proposal-p">As a struggling e-commerce seller from Janesville, I lived this problem daily. Tandril was born from real-world frustration, not theoretical market research. I built the prototype myself because I needed it to survive.</p>
                        </div>

                        <h3 className="proposal-h3">Sarah Evenson, Founder & CEO</h3>
                        <ul className="proposal-ul">
                            <li className="proposal-li"><strong>Domain Expertise:</strong> Active multi-platform seller who understands every operational pain point</li>
                            <li className="proposal-li"><strong>Technical Builder:</strong> Built the working Tandril prototype, proving feasibility</li>
                            <li className="proposal-li"><strong>Wisconsin Roots:</strong> Janesville native, Sharon resident, committed to building in Wisconsin</li>
                        </ul>
                    </div>
                </div>

                {/* Use of Funds */}
                <div className="proposal-card proposal-page-break">
                    <div className="proposal-card-header">
                        <h2 className="proposal-h2">💸 Use of Investment: Accelerating Wisconsin Innovation</h2>
                    </div>
                    <div className="proposal-card-content">
                        <div className="proposal-alert proposal-alert-blue">
                            <h3 className="proposal-h3">🎯 $500K Investment Allocation</h3>
                            <p className="proposal-p">These funds will accelerate development by 18-24 months, allowing us to capture first-mover advantage while building a sustainable Wisconsin-based company.</p>
                        </div>

                        <h3 className="proposal-h3">Strategic Fund Deployment:</h3>
                        <table className="proposal-table">
                            <thead>
                                <tr>
                                    <th className="proposal-th">Category</th>
                                    <th className="proposal-th">Amount</th>
                                    <th className="proposal-th">Wisconsin Impact</th>
                                    <th className="proposal-th">Strategic Purpose</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="proposal-td">Team Expansion</td>
                                    <td className="proposal-td">$175,000 (35%)</td>
                                    <td className="proposal-td">5-8 WI tech jobs</td>
                                    <td className="proposal-td">Senior engineers and product hires</td>
                                </tr>
                                <tr>
                                    <td className="proposal-td">Product Development</td>
                                    <td className="proposal-td">$150,000 (30%)</td>
                                    <td className="proposal-td">Cloud infrastructure</td>
                                    <td className="proposal-td">AI platform scaling and mobile app</td>
                                </tr>
                                <tr>
                                    <td className="proposal-td">Customer Acquisition</td>
                                    <td className="proposal-td">$125,000 (25%)</td>
                                    <td className="proposal-td">Marketing spend</td>
                                    <td className="proposal-td">Targeted digital marketing campaigns</td>
                                </tr>
                                <tr>
                                    <td className="proposal-td">Operations & Legal</td>
                                    <td className="proposal-td">$50,000 (10%)</td>
                                    <td className="proposal-td">WI business setup</td>
                                    <td className="proposal-td">Infrastructure and IP protection</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Call to Action */}
                <div className="proposal-card">
                    <div className="proposal-card-header proposal-text-center">
                        <h2 className="proposal-h2">🚀 Partnering to Build Wisconsin's AI Future</h2>
                    </div>
                    <div className="proposal-card-content">
                         <div className="proposal-alert proposal-alert-green">
                            <h3 className="proposal-h3">🤝 A Strategic Partnership for Wisconsin</h3>
                            <p className="proposal-p">This is an opportunity to support a homegrown, high-potential technology company that directly aligns with the WEDC's strategic goals for the state. Tandril is poised to become a Wisconsin success story, and a model for future rural tech innovation.</p>
                        </div>

                        <h3 className="proposal-h3">Next Steps:</h3>
                        <ol className="proposal-ul" style={{listStyleType: 'decimal', paddingLeft: '1.5rem'}}>
                            <li className="proposal-li"><strong>Initial Discussion:</strong> Phone call to align on vision and opportunity</li>
                            <li className="proposal-li"><strong>Product Demo:</strong> Live demonstration of Tandril's autonomous capabilities</li>
                            <li className="proposal-li"><strong>Due Diligence:</strong> Deep dive into technology and financial projections</li>
                            <li className="proposal-li"><strong>Partnership Launch:</strong> Begin building Wisconsin's next great tech company</li>
                        </ol>

                        <div style={{ textAlign: 'center', padding: '2rem', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', borderRadius: '12px', color: 'white', marginTop: '2rem' }}>
                            <h3 style={{ color: 'white', marginBottom: '1rem', fontSize: '1.5rem' }}>Ready to Discuss Tandril's Future in Wisconsin?</h3>
                            <p style={{ color: 'white', fontSize: '1.25rem', fontWeight: 'bold' }}>Sarah Evenson, Founder</p>
                            <p style={{ color: 'white', fontSize: '1.125rem', marginTop: '0.5rem' }}>608-931-1923 | omamahills@gmail.com</p>
                        </div>
                    </div>
                </div>

                <div className="proposal-footer">
                    <p className="proposal-p"><strong>Tandril - Building Wisconsin's AI Future</strong></p>
                    <p className="proposal-p">Investment Proposal • Prepared for Wisconsin Economic Development Corporation • 2025</p>
                </div>
            </div>
        </div>
    );
}
