import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Mail, Lock, Database, Users, FileText, ExternalLink } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-6">
      <div className="max-w-4xl mx-auto">
        <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl font-bold text-slate-900">
              <Shield className="w-6 h-6" />
              Privacy Policy
            </CardTitle>
            <p className="text-sm text-slate-500">Last updated: January 7, 2026</p>
            <p className="text-sm text-slate-600 mt-2">
              Effective Date: January 7, 2026
            </p>
          </CardHeader>
          <CardContent className="prose max-w-none space-y-6">

            {/* Introduction */}
            <section>
              <p className="text-slate-700 leading-relaxed">
                Tandril, Inc. ("Tandril," "we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our AI-powered e-commerce automation platform (the "Service"). By using Tandril, you agree to the collection and use of information in accordance with this policy.
              </p>
            </section>

            {/* 1. Information We Collect */}
            <section className="border-t pt-6">
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2 mb-4">
                <Database className="w-5 h-5" />
                1. Information We Collect
              </h2>

              <h3 className="text-xl font-semibold text-slate-800 mt-4">1.1 Information You Provide</h3>
              <ul className="list-disc pl-6 space-y-2 text-slate-700">
                <li><strong>Account Information:</strong> Name, email address, password, and company information when you create an account.</li>
                <li><strong>Payment Information:</strong> Billing details processed securely through Stripe (we do not store credit card numbers).</li>
                <li><strong>Platform Connections:</strong> OAuth tokens and credentials for connected platforms (Shopify, etc.), stored encrypted using AES-256-GCM encryption.</li>
                <li><strong>Communications:</strong> Messages you send us via email, support requests, or in-app chat.</li>
              </ul>

              <h3 className="text-xl font-semibold text-slate-800 mt-4">1.2 Information Collected Automatically</h3>
              <ul className="list-disc pl-6 space-y-2 text-slate-700">
                <li><strong>Usage Data:</strong> Commands executed, features used, pages visited, and interaction patterns.</li>
                <li><strong>Device Information:</strong> IP address, browser type, operating system, and device identifiers.</li>
                <li><strong>Log Data:</strong> Server logs, error reports, and system performance metrics.</li>
              </ul>

              <h3 className="text-xl font-semibold text-slate-800 mt-4">1.3 Information from Connected Platforms</h3>
              <ul className="list-disc pl-6 space-y-2 text-slate-700">
                <li><strong>Shopify Data:</strong> Products, orders, customers, inventory, and store settings (as authorized by you).</li>
                <li><strong>Store Analytics:</strong> Sales data, performance metrics, and business intelligence.</li>
                <li><strong>Customer Data:</strong> Customer names, emails, order history, and purchase behavior (to provide our services).</li>
              </ul>
            </section>

            {/* 2. How We Use Your Information */}
            <section className="border-t pt-6">
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2 mb-4">
                <Users className="w-5 h-5" />
                2. How We Use Your Information
              </h2>
              <ul className="list-disc pl-6 space-y-2 text-slate-700">
                <li><strong>Provide Services:</strong> Execute AI commands, automate workflows, sync inventory, process orders, and provide business insights.</li>
                <li><strong>Improve Platform:</strong> Analyze usage patterns, develop new features, and enhance AI capabilities.</li>
                <li><strong>Customer Support:</strong> Respond to inquiries, troubleshoot issues, and provide technical assistance.</li>
                <li><strong>Security:</strong> Detect fraud, prevent abuse, and protect platform integrity.</li>
                <li><strong>Communications:</strong> Send service updates, security alerts, billing notifications, and marketing (with consent).</li>
                <li><strong>Legal Compliance:</strong> Comply with applicable laws, regulations, and legal processes.</li>
              </ul>
            </section>

            {/* 3. How We Share Your Information */}
            <section className="border-t pt-6">
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2 mb-4">
                <ExternalLink className="w-5 h-5" />
                3. How We Share Your Information
              </h2>
              <p className="text-slate-700 mb-3">We do not sell your personal information. We may share your information in the following circumstances:</p>

              <h3 className="text-xl font-semibold text-slate-800 mt-4">3.1 Service Providers</h3>
              <ul className="list-disc pl-6 space-y-2 text-slate-700">
                <li><strong>Supabase:</strong> Database hosting and authentication (encrypted data storage)</li>
                <li><strong>Stripe:</strong> Payment processing and subscription management</li>
                <li><strong>Anthropic:</strong> AI model API for command interpretation and execution</li>
                <li><strong>Shopify:</strong> Platform API for store data sync and automation</li>
              </ul>

              <h3 className="text-xl font-semibold text-slate-800 mt-4">3.2 Legal Requirements</h3>
              <p className="text-slate-700">We may disclose your information if required by law, court order, or government regulation, or to protect our rights and safety.</p>

              <h3 className="text-xl font-semibold text-slate-800 mt-4">3.3 Business Transfers</h3>
              <p className="text-slate-700">In the event of a merger, acquisition, or sale of assets, your information may be transferred to the acquiring entity.</p>
            </section>

            {/* 4. Data Security */}
            <section className="border-t pt-6">
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2 mb-4">
                <Lock className="w-5 h-5" />
                4. Data Security
              </h2>
              <p className="text-slate-700 mb-3">We implement industry-standard security measures to protect your data:</p>
              <ul className="list-disc pl-6 space-y-2 text-slate-700">
                <li><strong>Encryption:</strong> All access tokens encrypted with AES-256-GCM; data in transit protected with TLS/SSL.</li>
                <li><strong>Access Controls:</strong> Row-level security (RLS) policies ensure users can only access their own data.</li>
                <li><strong>Authentication:</strong> Secure OAuth 2.0 flows with CSRF protection for platform connections.</li>
                <li><strong>Monitoring:</strong> Continuous security monitoring, logging, and incident response procedures.</li>
                <li><strong>Infrastructure:</strong> SOC 2 compliant hosting with Supabase and Vercel.</li>
              </ul>
              <p className="text-slate-600 text-sm mt-3 italic">
                While we strive to protect your data, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security.
              </p>
            </section>

            {/* 5. Data Retention */}
            <section className="border-t pt-6">
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2 mb-4">
                <Database className="w-5 h-5" />
                5. Data Retention
              </h2>
              <ul className="list-disc pl-6 space-y-2 text-slate-700">
                <li><strong>Active Accounts:</strong> We retain your data for as long as your account is active or as needed to provide services.</li>
                <li><strong>Deleted Accounts:</strong> Upon account deletion, we anonymize or delete personal data within 30 days, except where retention is required by law.</li>
                <li><strong>Backups:</strong> Backup copies may persist for up to 90 days for disaster recovery purposes.</li>
                <li><strong>Analytics:</strong> Aggregated, anonymized analytics data may be retained indefinitely for product improvement.</li>
              </ul>
            </section>

            {/* 6. Your Rights (GDPR & Privacy Laws) */}
            <section className="border-t pt-6">
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5" />
                6. Your Rights
              </h2>
              <p className="text-slate-700 mb-3">Depending on your location, you may have the following rights:</p>
              <ul className="list-disc pl-6 space-y-2 text-slate-700">
                <li><strong>Access:</strong> Request a copy of your personal data.</li>
                <li><strong>Correction:</strong> Update or correct inaccurate information.</li>
                <li><strong>Deletion:</strong> Request deletion of your personal data ("right to be forgotten").</li>
                <li><strong>Data Portability:</strong> Export your data in a machine-readable format.</li>
                <li><strong>Restrict Processing:</strong> Limit how we use your data.</li>
                <li><strong>Object:</strong> Opt out of certain data processing activities (e.g., marketing).</li>
                <li><strong>Withdraw Consent:</strong> Revoke previously granted permissions at any time.</li>
              </ul>
              <p className="text-slate-700 mt-3">
                To exercise these rights, email us at <a href="mailto:privacy@tandril.com" className="text-indigo-600 hover:underline font-semibold">privacy@tandril.com</a>. We will respond within 30 days.
              </p>
            </section>

            {/* 7. GDPR Compliance (Shopify App Requirements) */}
            <section className="border-t pt-6">
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5" />
                7. GDPR Compliance
              </h2>
              <p className="text-slate-700 mb-3">
                As a Shopify App, we comply with GDPR requirements for handling customer data:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-700">
                <li><strong>Data Subject Requests:</strong> We respond to customer data access requests within 30 days via our <code className="bg-slate-100 px-1 py-0.5 rounded text-sm">customers/data_request</code> webhook.</li>
                <li><strong>Data Deletion:</strong> We anonymize or delete customer data within 30 days of receiving a deletion request via our <code className="bg-slate-100 px-1 py-0.5 rounded text-sm">customers/redact</code> webhook.</li>
                <li><strong>Shop Deletion:</strong> When a Shopify store uninstalls our app, all associated data is deleted via our <code className="bg-slate-100 px-1 py-0.5 rounded text-sm">shop/redact</code> webhook.</li>
              </ul>
            </section>

            {/* 8. Cookies and Tracking */}
            <section className="border-t pt-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">8. Cookies and Tracking</h2>
              <p className="text-slate-700 mb-3">We use cookies and similar technologies to:</p>
              <ul className="list-disc pl-6 space-y-2 text-slate-700">
                <li>Maintain your login session</li>
                <li>Remember your preferences</li>
                <li>Analyze platform usage and performance</li>
                <li>Prevent fraud and abuse</li>
              </ul>
              <p className="text-slate-700 mt-3">
                You can control cookies through your browser settings. Disabling cookies may limit functionality.
              </p>
            </section>

            {/* 9. Third-Party Services */}
            <section className="border-t pt-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">9. Third-Party Services</h2>
              <p className="text-slate-700 mb-3">We integrate with third-party services that have their own privacy policies:</p>
              <ul className="list-disc pl-6 space-y-2 text-slate-700">
                <li><strong>Shopify:</strong> <a href="https://www.shopify.com/legal/privacy" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Privacy Policy</a></li>
                <li><strong>Stripe:</strong> <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Privacy Policy</a></li>
                <li><strong>Supabase:</strong> <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Privacy Policy</a></li>
                <li><strong>Anthropic:</strong> <a href="https://www.anthropic.com/privacy" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Privacy Policy</a></li>
              </ul>
            </section>

            {/* 10. Children's Privacy */}
            <section className="border-t pt-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">10. Children's Privacy</h2>
              <p className="text-slate-700">
                Tandril is not intended for users under 18 years of age. We do not knowingly collect personal information from children. If we become aware that a child has provided us with personal data, we will delete it immediately.
              </p>
            </section>

            {/* 11. International Data Transfers */}
            <section className="border-t pt-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">11. International Data Transfers</h2>
              <p className="text-slate-700">
                Your data may be transferred to and processed in the United States or other countries where our service providers operate. We ensure appropriate safeguards are in place, including Standard Contractual Clauses (SCCs) for GDPR compliance.
              </p>
            </section>

            {/* 12. Changes to This Policy */}
            <section className="border-t pt-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">12. Changes to This Policy</h2>
              <p className="text-slate-700">
                We may update this Privacy Policy from time to time. We will notify you of material changes by email or through the platform. Continued use of Tandril after changes indicates acceptance of the updated policy.
              </p>
            </section>

            {/* 13. Contact Us */}
            <section className="border-t pt-6">
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2 mb-4">
                <Mail className="w-5 h-5" />
                13. Contact Us
              </h2>
              <p className="text-slate-700 mb-3">
                If you have questions about this Privacy Policy or wish to exercise your privacy rights, contact us:
              </p>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
                <p className="text-slate-800"><strong>Tandril, Inc.</strong></p>
                <p className="text-slate-700">Email: <a href="mailto:privacy@tandril.com" className="text-indigo-600 hover:underline font-semibold">privacy@tandril.com</a></p>
                <p className="text-slate-700">Support: <a href="mailto:support@tandril.com" className="text-indigo-600 hover:underline font-semibold">support@tandril.com</a></p>
                <p className="text-slate-700">Website: <a href="https://tandril-mvp.vercel.app" className="text-indigo-600 hover:underline font-semibold">https://tandril-mvp.vercel.app</a></p>
              </div>
            </section>

            {/* Footer Notice */}
            <section className="border-t pt-6 mt-8">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <strong>Note:</strong> This Privacy Policy is designed to comply with GDPR, CCPA, and Shopify App Store requirements. For jurisdiction-specific rights or questions, please contact us.
                </p>
              </div>
            </section>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}