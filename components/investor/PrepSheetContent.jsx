
import React from 'react';

const questions = [
    {
      question: "What's your Total Addressable Market (TAM) and how did you calculate it?",
      answer: "Our TAM is $23.5 billion annually in the US. We calculated this by identifying 2.4 million multi-platform sellers earning $100K-$2M who would pay $200-800/month, plus 400,000 larger retailers who'd pay $1,000-5,000/month. Even capturing 0.1% represents $23.5M in annual revenue.",
      explanation: "TAM (Total Addressable Market) = The total revenue opportunity if you captured 100% of the market. This bottom-up calculation (customers x price) shows you've done real homework."
    },
    {
      question: "How do you differentiate from existing automation tools like Zapier?",
      answer: "The key difference is execution vs. advice. Zapier requires manual setup for simple 'if-this-then-that' logic. Tandril uses natural language AI to understand complex business intent and executes multi-step workflows autonomously across all platforms after a single command.",
      explanation: "Differentiation = What makes you uniquely better. You're highlighting that Tandril understands business goals and works independently, which is a significant step up from simple trigger-based automation."
    },
    {
      question: "What's your Customer Acquisition Cost (CAC) and Lifetime Value (LTV)?",
      answer: "Our projected CAC is $89 through targeted digital marketing. Our LTV, based on a $347 monthly average revenue, gives us a 3.9x LTV:CAC ratio and a 7-month payback period, which are healthy metrics for a SaaS business.",
      explanation: "CAC = Cost to get a customer. LTV = Total revenue from a customer. A ratio over 3:1 is the industry standard for a great investment, showing you'll make much more from a customer than you spend to get them."
    },
    {
      question: "How do you plan to defend against Amazon or Shopify building this themselves?",
      answer: "That's validation that this market is valuable. Their limitation is that they can only serve their own platforms. Most successful sellers operate across 4-7 platforms, and they need one platform-neutral agent that works everywhere. Tandril is that central hub.",
      explanation: "Moat/Competitive Advantage = What makes it hard for competitors to copy you. Your 'platform-neutral' approach is a strong defense against single-platform giants."
    },
    {
      question: "What's your go-to-market strategy?",
      answer: "We're targeting established e-commerce communities on Facebook, Reddit, and YouTube where sellers already gather and trust peer recommendations. We will also partner with e-commerce education companies who have existing relationships with our ideal customers.",
      explanation: "Go-to-Market (GTM) = Your plan for reaching customers. This shows you have a smart, capital-efficient plan that doesn't rely on expensive, broad advertising."
    },
    {
      question: "How technical is your solution? Do you have the team to build this?",
      answer: "I've built the working prototype myself, which proves the core concept is feasible. The AI uses proven language models, and platform APIs are well-documented. A key part of this funding round is to hire senior engineers to scale the platform robustly. My deep domain expertise is our advantage—I understand the user's pain because I lived it.",
      explanation: "This addresses the 'can you actually build this?' concern. It shows you're both technical enough to start and smart enough to know you need to hire to scale. Highlighting your domain expertise is key."
    },
    {
      question: "What are your revenue projections and key assumptions?",
      answer: "We project reaching $3.18 million in annual recurring revenue by year two, growing to $27.8 million by year four. This is based on a conservative 15% monthly customer growth and an average revenue per user of $312, with a low 6% annual churn rate due to the platform's high value.",
      explanation: "Annual Recurring Revenue (ARR) is the key metric for SaaS. Your assumptions (growth, churn) show you've thought through the business model and aren't just making up numbers."
    },
    {
      question: "How will you use the investment funds?",
      answer: "The $500,000 raised will be allocated with 40% to product development for hiring two senior engineers, 35% to team expansion and key hires, 20% to customer acquisition to execute our go-to-market strategy, and 5% for operational overhead. This gives us an 18 to 24-month runway.",
      explanation: "Use of Funds & Runway = Shows you are a responsible steward of capital. You have a clear plan for every dollar and know how long the money will last before you need to raise more or become profitable."
    },
    {
      question: "What is the long-term vision for Tandril?",
      answer: "The long-term vision is for Tandril to become the essential AI operating system for all online commerce. It will evolve from executing commands to proactively identifying opportunities, managing supply chains, and even running automated marketing campaigns, becoming an indispensable AI partner for business growth.",
      explanation: "This shows you have a big, ambitious vision beyond the initial product. Investors want to see the potential for massive scale and future growth."
    },
    {
      question: "Why are you the right person to build this company?",
      answer: "Because I'm not just a developer; I am the target customer. I felt this pain point so intensely that I taught myself the skills to build the solution. My deep, personal understanding of the user's daily struggles, combined with a practical, problem-solving mindset, is what will ensure Tandril solves the right problems and becomes a company that customers love.",
      explanation: "This is your ultimate closing argument. It connects your personal story, your skills, and your passion. It brings everything together and reinforces that you have the grit and insight to succeed."
    }
];

export default function PrepSheetContent() {
    const styles = `
        .prep-sheet-container {
            max-width: 8.5in;
            margin: 0 auto;
            padding: 1in;
            background-color: white;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            color: #334155;
        }
        .prep-sheet-header {
            text-align: center;
            margin-bottom: 0.5in;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 0.25in;
        }
        .prep-sheet-title {
            font-size: 24pt;
            font-weight: bold;
            color: #1e293b;
        }
        .prep-sheet-subtitle {
            font-size: 12pt;
            color: #64748b;
        }
        .prep-card {
            margin-bottom: 0.5in;
            page-break-inside: avoid;
        }
        .prep-card-question {
            font-size: 14pt;
            font-weight: bold;
            color: #1e293b;
            margin-bottom: 0.15in;
        }
        .prep-card-answer {
            font-size: 11pt;
            line-height: 1.5;
            margin-bottom: 0.15in;
            padding-left: 1rem;
            border-left: 2px solid #6366f1;
        }
        .prep-card-explanation {
            font-size: 10pt;
            color: #475569;
            background-color: #f1f5f9;
            padding: 0.75rem;
            border-radius: 8px;
            line-height: 1.6;
        }
        .prep-print-btn { 
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            color: white;
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            text-decoration: none;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        @media print {
            .no-print { display: none !important; }
            body, .prep-sheet-container { margin: 0; padding: 0.5in; box-shadow: none; border: none; background: white; font-size: 10pt; }
            .prep-sheet-container { max-width: 100%; }
        }
    `;

    return (
        <div style={{ backgroundColor: '#f8fafc' }}>
            <style>{styles}</style>
            <div className="no-print" style={{position: 'fixed', top: '1rem', right: '1rem', zIndex: 100}}>
                <button onClick={() => window.print()} className="prep-print-btn">
                    Print / Save PDF
                </button>
                <p style={{fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem', textAlign: 'center', backgroundColor: 'white', padding: '0.25rem', borderRadius: '4px'}}>On mobile, use "Share" to save.</p>
            </div>
            <div className="prep-sheet-container">
                <div className="prep-sheet-header">
                    <h1 className="prep-sheet-title">Investor Meeting Prep Sheet</h1>
                    <p className="prep-sheet-subtitle">Top 10 Questions for Tandril Founder, Sarah Evenson</p>
                </div>

                {questions.map((item, index) => (
                    <div key={index} className="prep-card">
                        <h2 className="prep-card-question">{index + 1}. {item.question}</h2>
                        <p className="prep-card-answer">{item.answer}</p>
                        <div className="prep-card-explanation">
                            <strong style={{color: '#334155'}}>For Me to Understand:</strong> {item.explanation}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
