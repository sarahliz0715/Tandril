
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
        .proposal-alert-yellow { background: #fffbeb; border-left: 44px solid #f59e0b; color: #f59e0b; }
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
                    <h1 style={{ fontSize: '2rem' }}>Tandril Investment Proposal</h1>
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
                            <h3 className="proposal-h3">🏠 Wisconsin Economic Development Opportunity</h3>
                            <p className="proposal-p">Tandril represents the kind of innovative tech company Wisconsin needs to build its future economy. Rather than chase Silicon Valley, we're proving that world-class AI companies can be built and scaled right here in small Wisconsin communities—keeping talent, jobs, and tax revenue in-state.</p>
                            <p className="proposal-p"><strong>This investment keeps a promising tech company rooted in Wisconsin while empowering small businesses nationwide.</strong></p>
                        </div>

                        <div className="proposal-alert proposal-alert-blue">
                            <h3 className="proposal-h3">💼 Investment Opportunity</h3>
                            <p className="proposal-p">Tandril is seeking <strong>$250,000 to $500,000</strong> for <strong>15-20% equity</strong> to accelerate the development of the world's first autonomous AI agent for e-commerce entrepreneurs.</p>
                        </div>
                        
                        <div className="proposal-alert proposal-alert-red">
                            <h3 className="proposal-h3">⚠️ TIME-SENSITIVE FIRST-MOVER ADVANTAGE</h3>
                            <p className="proposal-p">We're literally the first platform to offer true AI automation that runs 24/7 in the background. Amazon and Shopify are building their own tools, but they can only serve their own ecosystems. Tandril's multi-platform approach gives us 12-18 months to capture market share before big tech catches up.</p>
                        </div>
                    </div>
                </div>

                {/* Executive Summary */}
                <div className="proposal-card">
                     <div className="proposal-card-header">
                        <h2 className="proposal-h2">Executive Summary</h2>
                    </div>
                    <div className="proposal-card-content">
                        <p className="proposal-p">E-commerce entrepreneurs are drowning in manual tasks across multiple platforms, working 60+ hours per week on repetitive operations instead of growing their businesses. This creates a massive automation opportunity.</p>
                        
                        <p className="proposal-p"><strong>Tandril is the first AI agent that works autonomously in the background.</strong> Sellers give natural language commands—"Update all my winter products to 15% off"—and walk away. Tandril executes the task across all their stores while they sleep.</p>

                        <div className="proposal-grid-3">
                            <div className="proposal-stat-box">
                                <div className="proposal-stat-number">$6.2T</div>
                                <div className="proposal-stat-label">Global E-commerce Market</div>
                            </div>
                            <div className="proposal-stat-box">
                                <div className="proposal-stat-number">2.4M+</div>
                                <div className="proposal-stat-label">Target US Businesses</div>
                            </div>
                            <div className="proposal-stat-box">
                                <div className="proposal-stat-number">$347</div>
                                <div className="proposal-stat-label">Target Monthly ARPU</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Wisconsin Connection */}
                <div className="proposal-card">
                    <div className="proposal-card-header">
                        <h2 className="proposal-h2">🏡 The Wisconsin Advantage: Building Tech in America's Heartland</h2>
                    </div>
                    <div className="proposal-card-content">
                        <div className="proposal-alert proposal-alert-green">
                            <h3 className="proposal-h3">👥 Founder-Community Fit</h3>
                            <p className="proposal-p">I'm a Janesville native who chose to stay in Wisconsin, now building Tandril from Sharon. Like you, I believe we can prove that big ideas and world-class innovation don't just come from Silicon Valley - they can come from Wisconsin's small towns and Midwest communities too.</p>
                        </div>

                        <h3 className="proposal-h3">Why Wisconsin Works for Tech:</h3>
                        <ul className="proposal-ul">
                            <li className="proposal-li"><strong>Lower Operating Costs:</strong> 40-60% lower than Silicon Valley, extending runway and improving unit economics</li>
                            <li className="proposal-li"><strong>Talent Retention:</strong> Wisconsin graduates who stay in-state vs. fleeing to coastal cities</li>
                            <li className="proposal-li"><strong>Customer Proximity:</strong> Our target market is small business owners across the Midwest, not just tech elites</li>
                            <li className="proposal-li"><strong>Work-Life Balance:</strong> Sustainable company culture that attracts quality employees long-term</li>
                        </ul>
                    </div>
                </div>

                {/* Economic Impact Section (Split from Wisconsin Advantage) */}
                <div className="proposal-card">
                    <div className="proposal-card-header">
                        <h2 className="proposal-h2">📈 Economic Impact & Ecosystem Growth</h2>
                    </div>
                    <div className="proposal-card-content">
                        <h3 className="proposal-h3">Economic Impact Projections:</h3>
                        <div className="proposal-grid">
                            <div className="proposal-stat-box">
                                <div className="proposal-stat-number">25+</div>
                                <div className="proposal-stat-label">Wisconsin Jobs by Year 3</div>
                            </div>
                            <div className="proposal-stat-box">
                                <div className="proposal-stat-number">$2.8M</div>
                                <div className="proposal-stat-label">Annual WI Payroll by Year 3</div>
                            </div>
                        </div>
                        <div className="proposal-grid">
                            <div className="proposal-stat-box">
                                <div className="proposal-stat-number">$400K+</div>
                                <div className="proposal-stat-label">Annual State Tax Revenue</div>
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

                        <div className="proposal-alert proposal-alert-red">
                            <h3 className="proposal-h3">The Small Business Reality</h3>
                            <p className="proposal-p">Successful multi-platform sellers spend 60+ hours per week on manual tasks across platforms. They can't scale, can't take vacations, and definitely can't focus on strategy. This isn't sustainable.</p>
                        </div>

                        <h3 className="proposal-h3">Daily Pain Points:</h3>
                        <ul className="proposal-ul">
                            <li className="proposal-li"><strong>Multi-Platform Chaos:</strong> Manually updating inventory across Shopify, Etsy, Amazon, eBay, and Facebook Marketplace</li>
                            <li className="proposal-li"><strong>Pricing Wars:</strong> Constantly monitoring competitors and adjusting thousands of listings</li>
                            <li className="proposal-li"><strong>Customer Service Overload:</strong> Responding to messages across different platforms with different requirements</li>
                            <li className="proposal-li"><strong>Bulk Operations:</strong> Updating seasonal sales, descriptions, or categories one-by-one</li>
                            <li className="proposal-li"><strong>Platform Policy Changes:</strong> Scrambling to update listings when platforms change their rules</li>
                        </ul>
                    </div>
                </div>
                
                {/* The Opportunity (Split from The Problem) */}
                <div className="proposal-card">
                    <div className="proposal-card-header">
                        <h2 className="proposal-h2">💸 The Opportunity: Unlocking Value & Failed Solutions</h2>
                    </div>
                    <div className="proposal-card-content">
                        <div className="proposal-alert proposal-alert-yellow">
                            <h3 className="proposal-h3">💸 The Opportunity Cost</h3>
                            <p className="proposal-p">A typical seller with $500K annual revenue spends <strong>$75,000+ in opportunity cost</strong> on manual tasks that should be automated. That's capital that could be invested in growth, inventory, or marketing.</p>
                        </div>

                        <h3 className="proposal-h3">Why Current Solutions Don't Work:</h3>
                        <ul className="proposal-ul">
                            <li className="proposal-li"><strong>Platform Tools:</strong> Only work within one ecosystem—useless for multi-platform sellers</li>
                            <li className="proposal-li"><strong>Zapier/IFTTT:</strong> Require technical skills and break constantly</li>
                            <li className="proposal-li"><strong>Virtual Assistants:</strong> Expensive, require training, and can't work without supervision</li>
                            <li className="proposal-li"><strong>Analytics Tools:</strong> Tell you what to do but won't actually do it</li>
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
                            <p className="proposal-p">Every other tool requires you to be logged in, clicking buttons. Tandril is the first platform that works independently in the background. You give the command once, and Tandril handles everything—even while you sleep.</p>
                        </div>

                        <h3 className="proposal-h3">How It Works:</h3>
                        <div className="proposal-grid">
                            <div>
                                <h4>1. Natural Language Command</h4>
                                <p className="proposal-p">"Every Friday at 5 PM, put all my summer items on 25% off sale for the weekend across all platforms."</p>
                            </div>
                            <div>
                                <h4>2. AI Planning & Interpretation</h4>
                                <p className="proposal-p">AI identifies products, plans platform-specific updates, creates scheduled workflow.</p>
                            </div>
                        </div>
                        <div className="proposal-grid">
                            <div>
                                <h4>3. One-Time Confirmation</h4>
                                <p className="proposal-p">You approve the plan once. Tandril remembers and executes automatically.</p>
                            </div>
                            <div>
                                <h4>4. Autonomous Execution</h4>
                                <p className="proposal-p">Tandril runs tasks in the background across all connected platforms. No user intervention required.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Key Capabilities (Split from Our Solution) */}
                <div className="proposal-card">
                    <div className="proposal-card-header">
                        <h2 className="proposal-h2">⚡ Key Capabilities & Enterprise Safety</h2>
                    </div>
                    <div className="proposal-card-content">
                        <h3 className="proposal-h3">Key Capabilities:</h3>
                        <ul className="proposal-ul">
                            <li className="proposal-li"><strong>24/7 Background Operations:</strong> Works while you're sleeping, on vacation, or focused on other tasks</li>
                            <li className="proposal-li"><strong>Multi-Platform Native:</strong> Single command updates across Shopify, Etsy, Amazon, eBay simultaneously</li>
                            <li className="proposal-li"><strong>Smart Bulk Actions:</strong> "Update all products with 'vintage' in the title to include sustainability tags"</li>
                            <li className="proposal-li"><strong>Dynamic Pricing:</strong> "Keep my price 5% below top 3 competitors, check hourly"</li>
                            <li className="proposal-li"><strong>Automated Reordering:</strong> "When any item drops below 10 units, reorder from supplier"</li>
                        </ul>

                        <div className="proposal-alert proposal-alert-green">
                            <h3 className="proposal-h3">🛡️ Enterprise-Grade Safety</h3>
                            <p className="proposal-p">Built-in risk assessment, preview confirmations, and rollback capabilities. High-risk actions require additional verification to prevent costly mistakes.</p>
                        </div>
                    </div>
                </div>

                {/* Market Opportunity */}
                <div className="proposal-card">
                    <div className="proposal-card-header">
                        <h2 className="proposal-h2">📈 Market Opportunity: $23.5B Total Addressable Market</h2>
                    </div>
                    <div className="proposal-card-content">
                        <div className="proposal-alert proposal-alert-blue">
                            <h3 className="proposal-h3">🎯 Massive, Underserved Market</h3>
                            <p className="proposal-p">The multi-platform e-commerce automation market is huge and growing rapidly, driven by platform proliferation and the need for operational efficiency.</p>
                        </div>

                        <h3 className="proposal-h3">Market Size & Growth:</h3>
                        <div className="proposal-grid-3">
                            <div className="proposal-stat-box">
                                <div className="proposal-stat-number">$6.3T</div>
                                <div className="proposal-stat-label">Global E-commerce (2024)</div>
                            </div>
                            <div className="proposal-stat-box">
                                <div className="proposal-stat-number">4.7</div>
                                <div className="proposal-stat-label">Avg Platforms per Seller</div>
                            </div>
                            <div className="proposal-stat-box">
                                <div className="proposal-stat-number">78%</div>
                                <div className="proposal-stat-label">Using Some Automation</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Target Segments (Split from Market Opportunity) */}
                <div className="proposal-card">
                    <div className="proposal-card-header">
                        <h2 className="proposal-h2">🎯 Target Customer Segments & Revenue Opportunity</h2>
                    </div>
                    <div className="proposal-card-content">
                        <h3 className="proposal-h3">Target Customer Segments:</h3>
                        
                        <h4>Primary: Established Multi-Platform Sellers ($100K-$2M revenue)</h4>
                        <ul className="proposal-ul">
                            <li className="proposal-li"><strong>2.4 million businesses</strong> operating across 3-7 platforms</li>
                            <li className="proposal-li"><strong>Pain:</strong> 40+ hours/week on manual platform management</li>
                            <li className="proposal-li"><strong>Willingness to Pay:</strong> $200-800/month for 20+ hour time savings</li>
                            <li className="proposal-li"><strong>Examples:</strong> Print-on-demand sellers, handmade creators, resellers</li>
                        </ul>

                        <h4>Secondary: Large Multi-Channel Retailers ($2M+ revenue)</h4>
                        <ul className="proposal-ul">
                            <li className="proposal-li"><strong>400K+ businesses</strong> with dedicated teams managing 10+ channels</li>
                            <li className="proposal-li"><strong>Pain:</strong> Managing complex operations with expensive VA teams</li>
                            <li className="proposal-li"><strong>Willingness to Pay:</strong> $1,000-5,000/month for enterprise automation</li>
                        </ul>

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

                {/* Business Model */}
                <div className="proposal-card proposal-page-break">
                    <div className="proposal-card-header">
                        <h2 className="proposal-h2">💰 Business Model: Predictable SaaS Revenue</h2>
                    </div>
                    <div className="proposal-card-content">
                        <div className="proposal-alert proposal-alert-blue">
                            <h3 className="proposal-h3">🎯 Tiered SaaS Model with Enterprise Focus</h3>
                            <p className="proposal-p">Our model scales with customer success. As businesses grow using Tandril, our revenue grows with them—creating natural expansion revenue and high customer lifetime value.</p>
                        </div>

                        <h3 className="proposal-h3">Pricing Strategy:</h3>
                        <table className="proposal-table">
                            <thead>
                                <tr>
                                    <th className="proposal-th">Tier</th>
                                    <th className="proposal-th">Target Customer</th>
                                    <th className="proposal-th">Monthly Price</th>
                                    <th className="proposal-th">Key Features</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="proposal-td"><strong>Professional</strong></td>
                                    <td className="proposal-td">Growing businesses</td>
                                    <td className="proposal-td">$299/month</td>
                                    <td className="proposal-td">5 platforms, advanced automation</td>
                                </tr>
                                <tr>
                                    <td className="proposal-td"><strong>Enterprise</strong></td>
                                    <td className="proposal-td">Large multi-channel</td>
                                    <td className="proposal-td">$999/month</td>
                                    <td className="proposal-td">Unlimited platforms, custom workflows</td>
                                </tr>
                                <tr>
                                    <td className="proposal-td"><strong>Agency</strong></td>
                                    <td className="proposal-td">Service providers</td>
                                    <td className="proposal-td">$1,999/month</td>
                                    <td className="proposal-td">Multi-client management, white-label</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Unit Economics (Split from Business Model) */}
                <div className="proposal-card">
                    <div className="proposal-card-header">
                        <h2 className="proposal-h2">📊 Strong Unit Economics & Key Metrics</h2>
                    </div>
                    <div className="proposal-card-content">
                        <div className="proposal-alert proposal-alert-green">
                            <h3 className="proposal-h3">📊 Strong Unit Economics</h3>
                            <p className="proposal-p">Our $347 target blended ARPU targets established multi-platform businesses, positioning Tandril alongside enterprise tools like HubSpot and Klaviyo rather than competing with low-cost hobby tools.</p>
                        </div>

                        <h3 className="proposal-h3">Key Metrics:</h3>
                        <div className="proposal-grid">
                            <div className="proposal-stat-box">
                                <div className="proposal-stat-number">$347</div>
                                <div className="proposal-stat-label">Target Blended ARPU</div>
                            </div>
                            <div className="proposal-stat-box">
                                <div className="proposal-stat-number">$89</div>
                                <div className="proposal-stat-label">Customer Acquisition Cost</div>
                            </div>
                        </div>
                        <div className="proposal-grid">
                            <div className="proposal-stat-box">
                                <div className="proposal-stat-number">10x+</div>
                                <div className="proposal-stat-label">LTV:CAC Ratio</div>
                            </div>
                            <div className="proposal-stat-box">
                                <div className="proposal-stat-number">&lt; 2 months</div>
                                <div className="proposal-stat-label">Payback Period</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Financial Projections */}
                <div className="proposal-card">
                    <div className="proposal-card-header">
                        <h2 className="proposal-h2">📊 Financial Projections: Path to $50M+ Revenue</h2>
                    </div>
                    <div className="proposal-card-content">
                        <div className="proposal-alert proposal-alert-blue">
                            <h3 className="proposal-h3">🚀 Conservative Growth Model</h3>
                            <p className="proposal-p">All projections use conservative assumptions validated against comparable SaaS businesses. We've modeled slower growth and higher costs to avoid over-optimism.</p>
                        </div>

                        <h3 className="proposal-h3">5-Year Revenue Projection:</h3>
                        <table className="proposal-table">
                            <thead>
                                <tr>
                                    <th className="proposal-th">Year</th>
                                    <th className="proposal-th">Customers</th>
                                    <th className="proposal-th">Monthly Revenue</th>
                                    <th className="proposal-th">Annual Revenue</th>
                                    <th className="proposal-th">Wisconsin Jobs</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="proposal-td">2025</td>
                                    <td className="proposal-td">150</td>
                                    <td className="proposal-td">$37K</td>
                                    <td className="proposal-td">$445K</td>
                                    <td className="proposal-td">3</td>
                                </tr>
                                <tr>
                                    <td className="proposal-td">2026</td>
                                    <td className="proposal-td">850</td>
                                    <td className="proposal-td">$265K</td>
                                    <td className="proposal-td">$3.18M</td>
                                    <td className="proposal-td">8</td>
                                </tr>
                                <tr>
                                    <td className="proposal-td">2027</td>
                                    <td className="proposal-td">2,400</td>
                                    <td className="proposal-td">$929K</td>
                                    <td className="proposal-td">$11.1M</td>
                                    <td className="proposal-td">18</td>
                                </tr>
                                <tr>
                                    <td className="proposal-td">2028</td>
                                    <td className="proposal-td">5,200</td>
                                    <td className="proposal-td">$2.31M</td>
                                    <td className="proposal-td">$27.8M</td>
                                    <td className="proposal-td">32</td>
                                </tr>
                                <tr>
                                    <td className="proposal-td">2029</td>
                                    <td className="proposal-td">9,100</td>
                                    <td className="proposal-td">$4.53M</td>
                                    <td className="proposal-td">$54.4M</td>
                                    <td className="proposal-td">55</td>
                                </tr>
                            </tbody>
                        </table>

                        <div className="proposal-alert proposal-alert-green">
                            <h3 className="proposal-h3">💰 Investor Return Projection</h3>
                            <p className="proposal-p">Based on 8x revenue multiple for profitable SaaS, Tandril projects a <strong>$435M valuation by 2029</strong>. A $500K investment at 20% equity would be worth <strong>$87M</strong> - a <strong>174x return</strong>.</p>
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
                            <li className="proposal-li"><strong>Customer-First Mindset:</strong> User-driven development ensuring we solve real problems</li>
                        </ul>

                        <div className="proposal-alert proposal-alert-green">
                            <h3 className="proposal-h3">🤝 Partnership with Idea Fund</h3>
                            <p className="proposal-p">Working with the Idea Fund isn't just about capital—it's about building Wisconsin's tech ecosystem together. Your investment expertise combined with our technical innovation can create something special here.</p>
                        </div>

                        <h3 className="proposal-h3">Wisconsin Commitment:</h3>
                        <ul className="proposal-ul">
                            <li className="proposal-li"><strong>HQ Location:</strong> Committed to keeping headquarters in Wisconsin</li>
                            <li className="proposal-li"><strong>Local Hiring:</strong> Prioritizing Wisconsin talent and UW System graduates</li>
                            <li className="proposal-li"><strong>Community Investment:</strong> Contributing to local tech meetups and mentorship</li>
                            <li className="proposal-li"><strong>Tax Base:</strong> Growing Wisconsin's corporate tax revenue vs. California</li>
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

                        <div className="proposal-alert proposal-alert-green">
                            <h3 className="proposal-h3">📈 18-Month Milestones</h3>
                            <ul className="proposal-ul">
                                <li className="proposal-li"><strong>Product:</strong> Full multi-platform integration (Shopify, Etsy, Amazon)</li>
                                <li className="proposal-li"><strong>Revenue:</strong> $50K+ Monthly Recurring Revenue</li>
                                <li className="proposal-li"><strong>Team:</strong> 8-12 Wisconsin employees</li>
                                <li className="proposal-li"><strong>Customers:</strong> 500+ paying subscribers</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Call to Action */}
                <div className="proposal-card">
                    <div className="proposal-card-header proposal-text-center">
                        <h2 className="proposal-h2">🚀 Building Wisconsin's AI Future Together</h2>
                    </div>
                    <div className="proposal-card-content">
                        <div className="proposal-alert proposal-alert-blue">
                            <h3 className="proposal-h3">🏡 More Than Just an Investment</h3>
                            <p className="proposal-p">This isn't just about backing another SaaS company—it's about proving that world-class AI innovation can happen in Wisconsin small towns. We're building something that keeps talent here, creates good jobs, and shows other entrepreneurs what's possible.</p>
                        </div>

                        <div className="proposal-alert proposal-alert-red">
                            <h3 className="proposal-h3">⏰ Timing is Critical</h3>
                            <p className="proposal-p">Amazon and Shopify are investing hundreds of millions in automation, but they can only serve their own platforms. Tandril's multi-platform advantage gives us 12-18 months to capture market share. Every month we delay gives big tech more time to catch up.</p>
                        </div>

                        <h3 className="proposal-h3">Why Partner with Idea Fund:</h3>
                        <ul className="proposal-ul">
                            <li className="proposal-li"><strong>Aligned Mission:</strong> Building Wisconsin's economic future through innovation</li>
                            <li className="proposal-li"><strong>Strategic Expertise:</strong> Jonathan's investment banking background and regional knowledge</li>
                            <li className="proposal-li"><strong>Network Access:</strong> Connections to Wisconsin business community and talent</li>
                            <li className="proposal-li"><strong>Patient Capital:</strong> Focus on long-term growth, not quick exits</li>
                        </ul>

                        <h3 className="proposal-h3">Next Steps:</h3>
                        <ol className="proposal-ul" style={{listStyleType: 'decimal', paddingLeft: '1.5rem'}}>
                            <li className="proposal-li"><strong>Initial Discussion:</strong> Phone call to align on vision and opportunity</li>
                            <li className="proposal-li"><strong>Product Demo:</strong> Live demonstration of Tandril's autonomous capabilities</li>
                            <li className="proposal-li"><strong>Due Diligence:</strong> Deep dive into technical architecture and market validation</li>
                            <li className="proposal-li"><strong>Partnership Launch:</strong> Begin building Wisconsin's next great tech company</li>
                        </ol>

                        <div style={{ textAlign: 'center', padding: '2rem', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', borderRadius: '12px', color: 'white', marginTop: '2rem' }}>
                            <h3 style={{ color: 'white', marginBottom: '1rem', fontSize: '1.5rem' }}>Ready to Build Wisconsin's AI Future?</h3>
                            <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '1.125rem', marginBottom: '1.5rem' }}>Join us in proving that world-class innovation happens in Wisconsin communities.</p>
                            <p style={{ color: 'white', fontSize: '1.25rem', fontWeight: 'bold' }}>Sarah Evenson, Founder</p>
                            <p style={{ color: 'white', fontSize: '1.125rem', marginTop: '0.5rem' }}>608-931-1923 | omamahills@gmail.com</p>
                        </div>
                    </div>
                </div>

                <div className="proposal-footer">
                    <p className="proposal-p"><strong>Tandril - Building Wisconsin's AI Future</strong></p>
                    <p className="proposal-p">Investment Proposal • Prepared for Idea Fund of La Crosse • 2025</p>
                </div>
            </div>
        </div>
    );
}
