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
                    <h1 style={{ fontSize: '2rem' }}>Tandril Investment Proposal</h1>
                    <button onClick={() => window.print()} className="proposal-print-btn">Print/Save PDF</button>
                </div>

                {/* Executive Summary */}
                <div className="proposal-card">
                    <div className="proposal-card-header proposal-text-center">
                        <div className="proposal-logo-container">
                            <div className="proposal-logo-box"><div className="proposal-logo-img"></div></div>
                            <div>
                                <h1 className="proposal-h1">Tandril</h1>
                                <p className="proposal-subtitle">Your Autonomous AI E-commerce Agent</p>
                            </div>
                        </div>
                        <div className="proposal-meta-info">
                            <span>📍 Sharon, Wisconsin</span>
                            <span>🏢 Founded 2025</span>
                            <span>👩‍💼 Sarah Evenson, Founder</span>
                        </div>
                    </div>
                    <div className="proposal-card-content">
                        <div className="proposal-alert proposal-alert-red">
                            <h3 className="proposal-h3">⚠️ TIME-SENSITIVE FIRST-MOVER OPPORTUNITY</h3>
                            <p className="proposal-p"><strong>Tandril is literally the first of its kind.</strong> No other platform offers true AI execution that runs 24/7 in the background—they all stop at "advice" and require you to do the work manually.</p>
                            <p className="proposal-p" style={{marginTop: "0.5rem"}}><strong>Amazon is already building AI automation features for their sellers, and Shopify has the resources to copy us overnight.</strong> They can only serve their own ecosystems. Tandril's advantage is being the neutral, multi-platform hub. We have a 12-18 month head start if we move NOW.</p>
                        </div>
                        
                        <div className="proposal-alert proposal-alert-blue">
                            <h3 className="proposal-h3">💼 Investment Opportunity</h3>
                            <p className="proposal-p">Tandril is seeking a strategic investment of <strong>$250,000 to $500,000</strong> for <strong>15-20% equity</strong> to accelerate the development of the world's first autonomous AI agent for e-commerce entrepreneurs.</p>
                        </div>
                        
                        <div className="proposal-alert proposal-alert-green">
                            <h3 className="proposal-h3">💚 Wisconsin Values, Global Impact</h3>
                            <p className="proposal-p">As a Janesville native, living in Sharon, WI, I'm deeply committed to contributing to our state's economic future. Wisconsin has always been about hard work, innovation, and building things that last.</p>
                            <p className="proposal-p"><strong>Tandril represents Wisconsin values:</strong> practical problem-solving, genuine value creation, and empowering small businesses to compete with giant corporations. This investment would keep a promising tech company rooted in Wisconsin rather than fleeing to Silicon Valley.</p>
                        </div>

                        <h2 className="proposal-h2">Executive Summary</h2>
                        <p className="proposal-p">E-commerce entrepreneurs are drowning in manual tasks across multiple platforms, chained to their computers for 60+ hours per week. This operational burden prevents them from focusing on growth and strategy.</p>
                        
                        <p className="proposal-p"><strong>Tandril solves this by acting as an autonomous AI agent that works for you 24/7 in the background.</strong> Unlike existing tools that only provide advice, Tandril actually performs tasks. You give a command—"Update all my winter products to 15% off"—and you can walk away. Tandril executes the task across all your stores, even while you sleep.</p>

                        <div className="proposal-grid-3">
                            <div className="proposal-stat-box">
                                <div className="proposal-stat-number">$6.2T</div>
                                <div className="proposal-stat-label">Global E-commerce Market</div>
                            </div>
                            <div className="proposal-stat-box">
                                <div className="proposal-stat-number">24M</div>
                                <div className="proposal-stat-label">E-commerce Businesses in US</div>
                            </div>
                            <div className="proposal-stat-box">
                                <div className="proposal-stat-number">40%</div>
                                <div className="proposal-stat-label">Annual Market Growth</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* The Problem */}
                <div className="proposal-card proposal-page-break">
                    <div className="proposal-card-header">
                        <h2 className="proposal-h2">🚨 The Problem: Trapped by the Screen</h2>
                    </div>
                    <div className="proposal-card-content">
                        <p className="proposal-p">Today's e-commerce entrepreneurs aren't just business owners; they're full-time data entry clerks, trapped by the operational burden of multi-platform sales.</p>

                        <div className="proposal-alert proposal-alert-red">
                            <h3 className="proposal-h3">The "Always On" Problem</h3>
                            <p className="proposal-p">Successful multi-platform sellers report spending 60+ hours per week on repetitive manual tasks. They can't step away because the work never stops. This isn't just a time sink; it's a barrier to scaling and a direct path to burnout.</p>
                        </div>

                        <h3 className="proposal-h3">Specific Pain Points:</h3>
                        <ul className="proposal-ul">
                            <li className="proposal-li"><strong>Multi-Platform Inventory Sync:</strong> Manually updating stock levels across 5+ platforms, leading to oversells and customer complaints</li>
                            <li className="proposal-li"><strong>Dynamic Pricing Chaos:</strong> Constantly monitoring competitor prices and adjusting thousands of listings individually</li>
                            <li className="proposal-li"><strong>Customer Service Overwhelm:</strong> Responding to hundreds of messages across different platforms with different formatting requirements</li>
                            <li className="proposal-li"><strong>Bulk Operations Nightmare:</strong> Updating seasonal promotions, categories, or descriptions across thousands of products</li>
                            <li className="proposal-li"><b>Platform Policy Changes:</b> Scrambling to update listings when Etsy, Amazon, or Shopify changes their requirements</li>
                        </ul>

                        <div className="proposal-alert proposal-alert-yellow">
                            <h3 className="proposal-h3">💸 The Hidden Cost</h3>
                            <p className="proposal-p">A typical multi-platform seller with $500K annual revenue spends <strong>$75,000+ per year in opportunity cost</strong> on manual tasks. This is work that an autonomous system should be doing in the background, freeing up capital for growth.</p>
                        </div>

                        <h3 className="proposal-h3">Current "Solutions" Keep You Tethered:</h3>
                        <ul className="proposal-ul">
                            <li className="proposal-li"><strong>Platform Tools:</strong> Require you to be logged in, working within a single ecosystem.</li>
                            <li className="proposal-li"><strong>Zapier & IFTTT:</strong> Brittle, require technical skill, and can't handle complex, multi-step business logic without supervision.</li>
                            <li className="proposal-li"><strong>Virtual Assistants:</strong> Expensive, require training, and can't work 24/7 without constant management.</li>
                            <li className="proposal-li"><strong>Analytics Tools:</strong> Tell you what to do but are useless until you manually perform the work yourself.</li>
                        </ul>

                        <p className="proposal-p"><strong>The market is desperate for a solution that doesn't just advise, but executes autonomously in the background.</strong></p>
                    </div>
                </div>

                {/* Our Solution */}
                <div className="proposal-card">
                    <div className="proposal-card-header">
                        <h2 className="proposal-h2">🚀 Our Solution: Your 24/7 AI Employee That Works in the Background</h2>
                    </div>
                    <div className="proposal-card-content">
                        <div className="proposal-alert proposal-alert-blue">
                            <h3 className="proposal-h3">🎯 Tandril's Core Innovation: Autonomous Execution</h3>
                            <p className="proposal-p">Tandril is the <strong>first platform that works for you in the background to execute complex e-commerce tasks.</strong> You give the command, and Tandril handles the entire workflow from planning to completion, without you needing to stay logged in.</p>
                        </div>

                        <h3 className="proposal-h3">How It Works:</h3>
                        <div className="proposal-grid">
                            <div>
                                <h4>1. Natural Language Command</h4>
                                <p className="proposal-p">"Every Friday at 5 PM, put all my summer t-shirts on sale for 25% off for the weekend."</p>
                            </div>
                            <div>
                                <h4>2. AI Interpretation & Planning</h4>
                                <p className="proposal-p">AI identifies products, plans platform-specific updates, and creates a scheduled task.</p>
                            </div>
                        </div>
                        <div className="proposal-grid">
                            <div>
                                <h4>3. One-Time User Confirmation</h4>
                                <p className="proposal-p">You approve the workflow once. Tandril will handle it from now on.</p>
                            </div>
                            <div>
                                <h4>4. Autonomous Background Execution</h4>
                                <p className="proposal-p">Tandril's system runs the task automatically at the scheduled time across all stores. No user action required.</p>
                            </div>
                        </div>

                        <h3 className="proposal-h3">Key Capabilities:</h3>
                        <ul className="proposal-ul">
                            <li className="proposal-li"><strong>24/7 Background Operations:</strong> Give a command and Tandril works tirelessly, day or night.</li>
                            <li className="proposal-li"><strong>Intelligent Bulk Actions:</strong> "Update all products with 'vintage' in the title to include these new tags."</li>
                            <li className="proposal-li"><strong>Dynamic Pricing Agent:</strong> "Monitor my top 5 competitors for this product and keep my price 5% lower, checking every hour."</li>
                            <li className="proposal-li"><strong>Automated Inventory Management:</strong> "When stock for any item drops below 10 units, automatically place a reorder with the supplier."</li>
                            <li className="proposal-li"><strong>Set-and-Forget Workflows:</strong> "Every first of the month, analyze last month's sales and generate a performance report."</li>
                        </ul>

                        <div className="proposal-alert proposal-alert-green">
                            <h3 className="proposal-h3">🛡️ Built-in Safety Features</h3>
                            <p className="proposal-p">Every command includes intelligent risk assessment, preview confirmations, and rollback capabilities. High-risk actions require additional verification to prevent costly mistakes.</p>
                        </div>

                        <h3 className="proposal-h3">Platform Integrations:</h3>
                        <table className="proposal-table">
                            <thead>
                                <tr>
                                    <th className="proposal-th">Platform</th>
                                    <th className="proposal-th">Integration Status</th>
                                    <th className="proposal-th">Key Capabilities</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="proposal-td">Shopify</td>
                                    <td className="proposal-td">✅ Live (Beta)</td>
                                    <td className="proposal-td">Products, Orders, Inventory, Customers</td>
                                </tr>
                                <tr>
                                    <td className="proposal-td">Etsy</td>
                                    <td className="proposal-td">🔧 In Development</td>
                                    <td className="proposal-td">Listings, Shop Management, Messages</td>
                                </tr>
                                <tr>
                                    <td className="proposal-td">Amazon Seller</td>
                                    <td className="proposal-td">📋 Planned Q2</td>
                                    <td className="proposal-td">FBA Inventory, Pricing, Advertising</td>
                                </tr>
                                <tr>
                                    <td className="proposal-td">eBay</td>
                                    <td className="proposal-td">📋 Planned Q3</td>
                                    <td className="proposal-td">Listings, Auctions, Store Management</td>
                                </tr>
                                <tr>
                                    <td className="proposal-td">WooCommerce</td>
                                    <td className="proposal-td">📋 Planned Q3</td>
                                    <td className="proposal-td">Products, Orders, Customer Data</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Market Opportunity */}
                <div className="proposal-card proposal-page-break">
                    <div className="proposal-card-header">
                        <h2 className="proposal-h2">📈 Market Opportunity: Riding the E-commerce Tsunami</h2>
                    </div>
                    <div className="proposal-card-content">
                        <div className="proposal-alert proposal-alert-blue">
                            <h3 className="proposal-h3">🌊 Perfect Storm of Market Forces</h3>
                            <p className="proposal-p">Multiple macro trends are converging to create unprecedented demand for automated e-commerce solutions:</p>
                        </div>

                        <h3 className="proposal-h3">Market Size & Growth:</h3>
                        <div className="proposal-grid-3">
                            <div className="proposal-stat-box">
                                <div className="proposal-stat-number">$6.3T</div>
                                <div className="proposal-stat-label">Global E-commerce (2024)</div>
                            </div>
                            <div className="proposal-stat-box">
                                <div className="proposal-stat-number">$8.1T</div>
                                <div className="proposal-stat-label">Projected by 2026</div>
                            </div>
                            <div className="proposal-stat-box">
                                <div className="proposal-stat-number">7%</div>
                                <div className="proposal-stat-label">CAGR Growth Rate</div>
                            </div>
                        </div>

                        <h3 className="proposal-h3">Target Market Segments:</h3>
                        
                        <p className="proposal-p">While the exact number of multi-platform sellers is difficult to determine, the multi-seller platform market was valued at <strong>$56.7 billion in 2022</strong> and is projected to reach <strong>$67.5 billion by 2029</strong> (2.52% CAGR), demonstrating the substantial and growing ecosystem of businesses operating across multiple sales channels.</p>
                        
                        <h4>Primary: Multi-Platform Sellers ($100K-$2M revenue)</h4>
                        <ul className="proposal-ul">
                            <li className="proposal-li"><strong>Market Characteristics:</strong> Small to mid-size businesses operating across 3-7 platforms simultaneously</li>
                            <li className="proposal-li"><strong>Pain Point:</strong> Spending 40+ hours/week on manual platform management across multiple channels</li>
                            <li className="proposal-li"><strong>Willingness to Pay:</strong> $200-800/month for automation that saves 20+ hours/week</li>
                            <li className="proposal-li"><strong>Examples:</strong> Print-on-demand sellers, handmade goods creators, product resellers, dropshippers</li>
                        </ul>

                        <h4>Secondary: Large Multi-Channel Retailers ($2M+ revenue)</h4>
                        <ul className="proposal-ul">
                            <li className="proposal-li"><strong>Market Characteristics:</strong> Established businesses with dedicated teams managing 10+ sales channels</li>
                            <li className="proposal-li"><strong>Pain Point:</strong> Managing inventory and operations across numerous channels with teams of VAs and costly enterprise tools</li>
                            <li className="proposal-li"><strong>Willingness to Pay:</strong> $1,000-5,000/month for enterprise automation features</li>
                            <li className="proposal-li"><strong>Examples:</strong> Fashion brands, electronics distributors, wholesale businesses, private label manufacturers</li>
                        </ul>

                        <h3 className="proposal-h3">Market Trends Driving Demand:</h3>
                        
                        <div className="proposal-alert proposal-alert-green">
                            <h3 className="proposal-h3">🔥 Platform Proliferation & Multi-Channel Growth</h3>
                            <p className="proposal-p">The growth of the multi-seller platform market reflects an underlying trend: successful sellers now operate across an average of <strong>4.7 different platforms</strong> (up from 2.3 in 2020). Each new platform multiplies operational complexity exponentially, creating urgent demand for unified automation solutions.</p>
                        </div>
                        
                        <div className="proposal-alert proposal-alert-red">
                            <h3 className="proposal-h3">🚨 The Etsy Catalyst: A Warning Sign for Sellers</h3>
                            <p className="proposal-p">In early 2025, Etsy reported a significant 23% decrease in active sellers down to 5.4 million. Seller communities directly attribute this to platform-level changes like fee hikes and API limitations that disproportionately punish multi-platform sellers who rely on third-party tools. This event highlights a critical, market-wide vulnerability: sellers are at the mercy of individual platform changes. <strong>This creates a massive need for a platform-neutral tool like Tandril that provides stability and simplifies multi-platform management.</strong></p>
                        </div>

                        <ul className="proposal-ul">
                            <li className="proposal-li"><strong>AI Acceptance:</strong> 78% of e-commerce businesses now use some form of automation (up from 23% in 2022)</li>
                            <li className="proposal-li"><strong>Labor Shortage:</strong> Difficulty finding and retaining skilled VAs for complex e-commerce tasks</li>
                            <li className="proposal-li"><strong>Competition Intensification:</strong> Need for faster response times and dynamic pricing to stay competitive</li>
                            <li className="proposal-li"><strong>Regulatory Complexity:</strong> Increasing platform requirements and compliance needs across channels</li>
                        </ul>

                        <div className="proposal-alert proposal-alert-yellow">
                            <h3 className="proposal-h3">⚡ The Urgency Factor</h3>
                            <p className="proposal-p">Amazon announced their "AI seller tools" initiative in late 2024. Shopify is investing heavily in automation. <strong>Big Tech is coming for this market—but they'll only serve their own platforms.</strong> Tandril's multi-platform approach gives us a defensible position.</p>
                        </div>

                        <h3 className="proposal-h3">Revenue Opportunity:</h3>
                        <p className="proposal-p">Our Total Addressable Market (TAM) is calculated using a conservative, bottom-up approach based on the primary market segments we can serve:</p>
                        <table className="proposal-table">
                            <thead>
                                <tr>
                                    <th className="proposal-th">Market Segment</th>
                                    <th className="proposal-th">Estimated Businesses</th>
                                    <th className="proposal-th">Average Monthly Price</th>
                                    <th className="proposal-th">Addressable Revenue</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="proposal-td">SME Multi-Platform</td>
                                    <td className="proposal-td">2.4M+ businesses</td>
                                    <td className="proposal-td">$400/month</td>
                                    <td className="proposal-td">$11.5B annually</td>
                                </tr>
                                <tr>
                                    <td className="proposal-td">Enterprise Multi-Channel</td>
                                    <td className="proposal-td">400K+ businesses</td>
                                    <td className="proposal-td">$2,500/month</td>
                                    <td className="proposal-td">$12.0B annually</td>
                                </tr>
                                <tr>
                                    <td colSpan="3"><strong>Total Addressable Market</strong></td>
                                    <td><strong>$23.5B annually</strong></td>
                                </tr>
                            </tbody>
                        </table>

                        <p className="proposal-p"><strong>Even capturing 0.1% of this established market represents $23.5M in annual revenue potential.</strong></p>
                        
                        <div style={{ marginTop: '2rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px', fontSize: '0.875rem', color: '#64748b' }}>
                            <strong>Market Data Sources:</strong> Global retail e-commerce sales data from eMarketer (2024). Multi-seller platform market data from industry research reports (2022-2029). Platform seller statistics from Red Stag Fulfillment, Yaguara, and company public filings (2024-2025).
                        </div>
                    </div>
                </div>

                {/* Business Model */}
                <div className="proposal-card">
                    <div className="proposal-card-header">
                        <h2 className="proposal-h2">💰 Business Model: Predictable, Scalable Revenue</h2>
                    </div>
                    <div className="proposal-card-content">
                        <div className="proposal-alert proposal-alert-blue">
                            <h3 className="proposal-h3">🎯 SaaS Subscription Model with Usage-Based Scaling</h3>
                            <p className="proposal-p">Tandril operates on a proven SaaS model with tiered pricing that scales with customer success. As customers grow their businesses using Tandril, our revenue grows with them.</p>
                        </div>

                        <h3 className="proposal-h3">Pricing Tiers:</h3>
                        <table className="proposal-table">
                            <thead>
                                <tr>
                                    <th className="proposal-th">Tier</th>
                                    <th className="proposal-th">Target Customer</th>
                                    <th className="proposal-th">Monthly Price</th>
                                    <th className="proposal-th">Key Features</th>
                                    <th className="proposal-th">Command Limit</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="proposal-td"><strong>Starter</strong></td>
                                    <td className="proposal-td">Solo entrepreneurs</td>
                                    <td className="proposal-td">$99/month</td>
                                    <td className="proposal-td">2 platforms, basic AI commands</td>
                                    <td className="proposal-td">100 commands</td>
                                </tr>
                                <tr>
                                    <td className="proposal-td"><strong>Professional</strong></td>
                                    <td className="proposal-td">Growing businesses</td>
                                    <td className="proposal-td">$299/month</td>
                                    <td className="proposal-td">5 platforms, advanced automation</td>
                                    <td className="proposal-td">500 commands</td>
                                </tr>
                                <tr>
                                    <td className="proposal-td"><strong>Enterprise</strong></td>
                                    <td className="proposal-td">Large multi-channel</td>
                                    <td className="proposal-td">$999/month</td>
                                    <td className="proposal-td">Unlimited platforms, custom workflows</td>
                                    <td className="proposal-td">Unlimited</td>
                                </tr>
                                <tr>
                                    <td className="proposal-td"><strong>Agency</strong></td>
                                    <td className="proposal-td">Service providers</td>
                                    <td className="proposal-td">$1,999/month</td>
                                    <td className="proposal-td">Multi-client management, white-label</td>
                                    <td className="proposal-td">Unlimited</td>
                                </tr>
                            </tbody>
                        </table>

                        <div className="proposal-alert proposal-alert-green">
                            <h3 className="proposal-h3">💡 The Compound Growth & Efficiency Advantage</h3>
                            <p className="proposal-p">Our SaaS tool achieves an ARPU of $347/month—a figure well within premium tiers where customer retention and expansion are significantly stronger. Our $347 ARPU targets established multi-platform businesses, not hobby sellers—positioning Tandril alongside enterprise tools like HubSpot and Klaviyo.</p>
                            <p className="proposal-p">Moreover, our projected CAC of just $89 places us well below the ~$702 industry average for B2B SaaS, enabling high acquisition efficiency and rapid payback potential.</p>
                        </div>

                        <h3 className="proposal-h3">Unit Economics:</h3>
                        <div className="proposal-grid">
                            <div className="proposal-stat-box">
                                <div className="proposal-stat-number">$347</div>
                                <div className="proposal-stat-label">Target Blended ARPU (Monthly)</div>
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

                {/* Competitive Advantage */}
                <div className="proposal-card proposal-page-break">
                    <div className="proposal-card-header">
                        <h2 className="proposal-h2">🛡️ Competitive Advantage: Why Tandril Will Win</h2>
                    </div>
                    <div className="proposal-card-content">
                        <div className="proposal-alert proposal-alert-blue">
                            <h3 className="proposal-h3">🎯 First-Mover in Autonomous AI Execution</h3>
                            <p className="proposal-p">Tandril isn't just another dashboard. We're creating a new category: the AI agent that works for you. While competitors are calculators showing you math, Tandril is the robotic arm that does the work for you, 24/7, in the background.</p>
                        </div>

                        <h3 className="proposal-h3">Core Differentiators:</h3>

                        <h4>1. True Background Execution (Not Just Advice)</h4>
                        <ul className="proposal-ul">
                            <li className="proposal-li"><strong>Current Market:</strong> Tools require you to be logged in, clicking buttons to execute tasks.</li>
                            <li className="proposal-li"><strong>Tandril:</strong> Completes the entire workflow autonomously after a single command. Set it and forget it.</li>
                            <li className="proposal-li"><strong>Competitive Moat:</strong> Our backend architecture for stateful, long-running AI jobs is complex and non-trivial to replicate.</li>
                        </ul>

                        <h4>2. Multi-Platform Native Architecture</h4>
                        <ul className="proposal-ul">
                            <li className="proposal-li"><strong>Built from ground up</strong> for cross-platform operations</li>
                            <li className="proposal-li"><strong>Unified data model</strong> that normalizes differences between platforms</li>
                            <li className="proposal-li"><strong>Single command</strong> can update across Shopify, Etsy, Amazon, eBay simultaneously</li>
                        </ul>

                        <h4>3. Natural Language Interface</h4>
                        <ul className="proposal-ul">
                            <li className="proposal-li"><strong>No technical training required</strong> - entrepreneurs speak in business terms</li>
                            <li className="proposal-li"><strong>Context-aware AI</strong> understands business intent, not just keywords</li>
                            <li className="proposal-li"><strong>Voice command capability</strong> for hands-free operation (planned Q3)</li>
                        </ul>

                        <div className="proposal-alert proposal-alert-green">
                            <h3 className="proposal-h3">🧠 Proprietary AI Training Data</h3>
                            <p className="proposal-p">Every command processed builds our dataset of e-commerce business logic. This creates an increasingly sophisticated AI that understands nuanced business decisions—a dataset competitors cannot replicate.</p>
                        </div>

                        <h3 className="proposal-h3">Competitive Landscape Analysis:</h3>

                        <table className="proposal-table">
                            <thead>
                                <tr>
                                    <th className="proposal-th">Competitor</th>
                                    <th className="proposal-th">Category</th>
                                    <th className="proposal-th">Limitation</th>
                                    <th className="proposal-th">Tandril Advantage</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="proposal-td">Shopify Plus</td>
                                    <td className="proposal-td">Platform Tools</td>
                                    <td className="proposal-td">Single platform only</td>
                                    <td className="proposal-td">Multi-platform execution</td>
                                </tr>
                                <tr>
                                    <td className="proposal-td">Zapier</td>
                                    <td className="proposal-td">Automation</td>
                                    <td className="proposal-td">Simple triggers, no AI</td>
                                    <td className="proposal-td">AI-powered complex decisions</td>
                                </tr>
                                <tr>
                                    <td className="proposal-td">Jungle Scout</td>
                                    <td className="proposal-td">Analytics</td>
                                    <td className="proposal-td">Amazon only, no execution</td>
                                    <td className="proposal-td">Multi-platform with execution</td>
                                </tr>
                                <tr>
                                    <td className="proposal-td">eRank (Etsy)</td>
                                    <td className="proposal-td">SEO Tools</td>
                                    <td className="proposal-td">Advice only, manual work</td>
                                    <td className="proposal-td">Automated optimization</td>
                                </tr>
                                <tr>
                                    <td className="proposal-td">Virtual Assistants</td>
                                    <td className="proposal-td">Human Labor</td>
                                    <td className="proposal-td">Expensive, inconsistent</td>
                                    <td className="proposal-td">24/7 consistent execution</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Financial Projections */}
                <div className="proposal-card proposal-page-break">
                    <div className="proposal-card-header">
                        <h2 className="proposal-h2">📊 Financial Projections: Path to Profitability</h2>
                    </div>
                    <div className="proposal-card-content">
                        <div className="proposal-alert proposal-alert-blue">
                            <h3 className="proposal-h3">🚀 Conservative Growth Projections</h3>
                            <p className="proposal-p">All projections are based on conservative assumptions and validated against comparable SaaS businesses in the e-commerce tools space. We've intentionally modeled slower adoption and higher costs to avoid over-optimistic projections.</p>
                        </div>

                        <h3 className="proposal-h3">5-Year Revenue Projection:</h3>
                        <table className="proposal-table">
                            <thead>
                                <tr>
                                    <th className="proposal-th">Year</th>
                                    <th className="proposal-th">Customers</th>
                                    <th className="proposal-th">Avg Revenue/Customer</th>
                                    <th className="proposal-th">Monthly Recurring Revenue</th>
                                    <th className="proposal-th">Annual Revenue</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="proposal-td">2025</td>
                                    <td className="proposal-td">150</td>
                                    <td className="proposal-td">$247</td>
                                    <td className="proposal-td">$37K</td>
                                    <td className="proposal-td">$445K</td>
                                </tr>
                                <tr>
                                    <td className="proposal-td">2026</td>
                                    <td className="proposal-td">850</td>
                                    <td className="proposal-td">$312</td>
                                    <td className="proposal-td">$265K</td>
                                    <td className="proposal-td">$3.18M</td>
                                </tr>
                                <tr>
                                    <td className="proposal-td">2027</td>
                                    <td className="proposal-td">2,400</td>
                                    <td className="proposal-td">$387</td>
                                    <td className="proposal-td">$929K</td>
                                    <td className="proposal-td">$11.1M</td>
                                </tr>
                                <tr>
                                    <td className="proposal-td">2028</td>
                                    <td className="proposal-td">5,200</td>
                                    <td className="proposal-td">$445</td>
                                    <td className="proposal-td">$2.31M</td>
                                    <td className="proposal-td">$27.8M</td>
                                </tr>
                                <tr>
                                    <td className="proposal-td">2029</td>
                                    <td className="proposal-td">9,100</td>
                                    <td className="proposal-td">$498</td>
                                    <td className="proposal-td">$4.53M</td>
                                    <td className="proposal-td">$54.4M</td>
                                </tr>
                            </tbody>
                        </table>

                        <h3 className="proposal-h3">Key Assumptions:</h3>
                        <ul className="proposal-ul">
                            <li className="proposal-li"><strong>Customer Growth:</strong> 15% monthly growth rate (conservative for SaaS in growth phase)</li>
                            <li className="proposal-li"><strong>Churn Rate:</strong> 6% annually (below industry average due to high switching costs)</li>
                            <li className="proposal-li"><strong>Average Revenue Per User:</strong> Grows as customers scale their businesses</li>
                            <li className="proposal-li"><strong>Market Penetration:</strong> 0.38% of addressable market by Year 5</li>
                        </ul>

                        <div className="proposal-alert proposal-alert-green">
                            <h3 className="proposal-h3">💰 Investment ROI Projection</h3>
                            <p className="proposal-p">Based on conservative comparable valuations (8x revenue multiple for profitable SaaS), Tandril would be valued at <strong>$435M by 2029</strong>. A $500K investment at 20% equity would be worth <strong>$87M</strong> - a <strong>174x return</strong> over 5 years.</p>
                        </div>
                    </div>
                </div>

                {/* Team */}
                <div className="proposal-card proposal-page-break">
                    <div className="proposal-card-header">
                        <h2 className="proposal-h2">👥 Leadership Team: Domain Expertise Meets Technical Innovation</h2>
                    </div>
                    <div className="proposal-card-content">
                        <div className="proposal-alert proposal-alert-blue">
                            <h3 className="proposal-h3">🎯 Founder-Market Fit</h3>
                            <p className="proposal-p">Born and raised in Janesville, living in Sharon and as a struggling e-commerce seller, I have deep personal experience with the issues Tandril addresses. I have not "scaled" a business, hence the need for a better way to manage things. Tandril is that better way, born from real-world, ground-level frustration.</p>
                        </div>

                        <h3 className="proposal-h3">Founder & CEO</h3>
                        <ul className="proposal-ul">
                            <li className="proposal-li"><strong>Background:</strong> An experienced e-commerce seller who understands the day-to-day operational challenges firsthand.</li>
                            <li className="proposal-li"><strong>Domain Expertise:</strong> Intimate knowledge of the pain points of managing products and orders across multiple platforms like Etsy and Shopify.</li>
                            <li className="proposal-li"><strong>Pragmatic Builder & Product Visionary:</strong> I built the Tandril prototype myself, teaching myself the necessary skills to solve a problem I was facing every day. This user-first development approach ensures we build what customers actually need, not just what's technically possible. My focus is on the solution, not just the code.</li>
                            <li className="proposal-li"><strong>Vision:</strong> Passionate about empowering small and struggling sellers with the kind of enterprise-level automation that is typically out of reach.</li>
                        </ul>

                        <div className="proposal-alert proposal-alert-green">
                            <h3 className="proposal-h3">💪 Wisconsin Work Ethic, Global Ambition</h3>
                            <p className="proposal-p">Tandril embodies the Wisconsin values of hard work, practical problem-solving, and genuine value creation. We're building a company that puts customers first and creates real, measurable value for small businesses.</p>
                        </div>

                        <h3 className="proposal-h3">Business Advisory</h3>
                        <div className="proposal-alert proposal-alert-yellow">
                            <h3 className="proposal-h3">🤝 Seeking Your Guidance</h3>
                            <p className="proposal-p">A crucial part of this investment is not just capital, but strategic guidance. We are specifically seeking the expertise of Diane Hendricks and the Hendricks Holding Company team to help us navigate the complexities of scaling a business. Your proven track record in building and guiding successful enterprises would be an invaluable asset to Tandril, helping us turn this powerful technology into a market-leading company.</p>
                        </div>
                    </div>
                </div>

                {/* Use of Funds */}
                <div className="proposal-card">
                    <div className="proposal-card-header">
                        <h2 className="proposal-h2">💸 Use of Investment Funds: Strategic Deployment for Maximum Impact</h2>
                    </div>
                    <div className="proposal-card-content">
                        <div className="proposal-alert proposal-alert-blue">
                            <h3 className="proposal-h3">🎯 Investment Range: $250K - $500K for 15-20% Equity</h3>
                            <p className="proposal-p">These funds will accelerate Tandril's development by 18-24 months, allowing us to capture first-mover advantage before big tech competitors enter the market.</p>
                        </div>

                        <h3 className="proposal-h3">Fund Allocation Breakdown ($500,000 Scenario):</h3>
                        <table className="proposal-table">
                            <thead>
                                <tr>
                                    <th className="proposal-th">Category</th>
                                    <th className="proposal-th">Allocation</th>
                                    <th className="proposal-th">Amount</th>
                                    <th className="proposal-th">Enhanced Strategic Purpose</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="proposal-td">Product Development</td>
                                    <td className="proposal-td">40%</td>
                                    <td className="proposal-td">$200,000</td>
                                    <td className="proposal-td">Accelerated AI development + mobile app</td>
                                </tr>
                                <tr>
                                    <td className="proposal-td">Team Expansion</td>
                                    <td className="proposal-td">35%</td>
                                    <td className="proposal-td">$175,000</td>
                                    <td className="proposal-td">Senior engineering and product hires</td>
                                </tr>
                                <tr>
                                    <td className="proposal-td">Customer Acquisition</td>
                                    <td className="proposal-td">20%</td>
                                    <td className="proposal-td">$100,000</td>
                                    <td className="proposal-td">Aggressive marketing and partnerships</td>
                                </tr>
                                <tr>
                                    <td className="proposal-td">Operations & Legal</td>
                                    <td className="proposal-td">5%</td>
                                    <td className="proposal-td">$25,000</td>
                                    <td className="proposal-td">Infrastructure and IP protection</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Call to Action */}
                <div className="proposal-card">
                    <div className="proposal-card-header proposal-text-center">
                        <h2 className="proposal-h2">🚀 Join the Tandril Revolution</h2>
                    </div>
                    <div className="proposal-card-content">
                        <div className="proposal-alert proposal-alert-blue">
                            <h3 className="proposal-h3">⏰ The Time to Act is NOW</h3>
                            <p className="proposal-p">E-commerce automation is at the same inflection point that email marketing was in 2010 or social media advertising was in 2015. The entrepreneurs who adopt AI automation first will dominate their markets. The investors who back the right platform will see extraordinary returns.</p>
                        </div>

                        <p className="proposal-p"><strong>Tandril isn't just another SaaS investment—it's a chance to own a piece of the future of e-commerce.</strong></p>

                        <div className="proposal-alert proposal-alert-red">
                            <h3 className="proposal-h3">🔥 Urgency: The Competition is Coming</h3>
                            <p className="proposal-p">Amazon has already announced AI seller tools for 2025. Shopify is investing hundreds of millions in automation. <strong>Every month we delay gives them more time to catch up.</strong></p>
                            <p className="proposal-p">But here's why we'll still win: <strong>They can only serve their own platforms. Tandril serves everyone.</strong></p>
                        </div>

                        <h3 className="proposal-h3">Next Steps:</h3>
                        <ol className="proposal-ul" style={{listStyleType: 'decimal', paddingLeft: '1.5rem'}}>
                            <li className="proposal-li"><strong>Initial Conversation:</strong> A phone call to discuss your interest and Tandril's market opportunity.</li>
                            <li className="proposal-li"><strong>Founder Meeting:</strong> A direct meeting to discuss the vision and strategic plan.</li>
                            <li className="proposal-li"><strong>Product Roadmap Review:</strong> Walk through our technical architecture, development timeline, and go-to-market strategy.</li>
                        </ol>

                        <div style={{ textAlign: 'center', padding: '2rem', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', borderRadius: '12px', color: 'white', marginTop: '2rem' }}>
                            <h3 style={{ color: 'white', marginBottom: '1rem', fontSize: '1.5rem' }}>Ready to Transform E-commerce Forever?</h3>
                            <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '1.125rem', marginBottom: '1.5rem' }}>Join us in building the AI agent that will power the next generation of e-commerce entrepreneurs.</p>
                            <p style={{ color: 'white', fontSize: '1.25rem', fontWeight: 'bold' }}>Contact: Sarah Evenson</p>
                            <p style={{ color: 'white', fontSize: '1.125rem', marginTop: '0.5rem' }}>608-931-1923 | omamahills@gmail.com</p>
                        </div>
                    </div>
                </div>

                <div className="proposal-footer">
                    <p className="proposal-p"><strong>Tandril - AI Co-Pilot for E-commerce Growth</strong></p>
                    <p className="proposal-p">Confidential Investment Proposal • Prepared for Hendricks Holding Company • 2025</p>
                    <p className="proposal-p" style={{ marginTop: '1rem', fontSize: '0.75rem' }}>This presentation contains forward-looking statements and projections. Actual results may vary. All financial projections are estimates based on available data and reasonable assumptions. Past performance does not guarantee future results. Investment involves risk of loss.</p>
                </div>
            </div>
        </div>
    );
}