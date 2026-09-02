import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-6">
      <div className="max-w-4xl mx-auto">
        <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl font-bold text-slate-900">
              <FileText className="w-6 h-6" />
              Terms of Service
            </CardTitle>
            <p className="text-sm text-slate-500">Last updated: September 2, 2026</p>
            <p className="text-sm text-slate-600 mt-1">Effective Date: September 2, 2026</p>
          </CardHeader>
          <CardContent className="prose max-w-none space-y-6">

            {/* Introduction */}
            <section>
              <p className="text-slate-700 leading-relaxed">
                These Terms of Service ("Terms") are a legal agreement between you ("you," "your," or "User") and Tandril ("Tandril," "we," "us," or "our"), governing your access to and use of the Tandril platform and all related services (collectively, the "Service"). By creating an account or using the Service in any way, you agree to be bound by these Terms. If you do not agree, do not use the Service.
              </p>
            </section>

            {/* 1. Description of Service */}
            <section className="border-t pt-6">
              <h2 className="text-xl font-bold text-slate-900 mb-3">1. Description of Service</h2>
              <p className="text-slate-700 leading-relaxed">
                Tandril is an AI-powered e-commerce operations platform that connects to third-party selling platforms including Shopify, eBay, WooCommerce, BigCommerce, and others. The Service provides tools for inventory management, order processing, workflow automation, analytics, and AI-assisted business operations through natural language commands and automated workflows.
              </p>
              <p className="text-slate-700 leading-relaxed mt-3">
                Tandril acts as an intermediary between you and connected platforms. We do not own, operate, or control any third-party marketplace or platform. Availability of specific platform integrations may change over time.
              </p>
            </section>

            {/* 2. Account Registration */}
            <section className="border-t pt-6">
              <h2 className="text-xl font-bold text-slate-900 mb-3">2. Account Registration</h2>
              <p className="text-slate-700 leading-relaxed mb-2">To use the Service, you must create an account. You agree to:</p>
              <ul className="list-disc pl-6 space-y-2 text-slate-700">
                <li>Provide accurate, current, and complete information during registration.</li>
                <li>Maintain and promptly update your account information.</li>
                <li>Keep your password confidential and not share your account credentials.</li>
                <li>Be responsible for all activity that occurs under your account.</li>
                <li>Notify us immediately at <strong>security@tandril.org</strong> if you suspect unauthorized access to your account.</li>
              </ul>
              <p className="text-slate-700 mt-3">
                You must be at least 18 years old and legally able to enter into contracts to use the Service. By registering, you represent that you meet these requirements.
              </p>
            </section>

            {/* 3. Beta Access and Free Trials */}
            <section className="border-t pt-6">
              <h2 className="text-xl font-bold text-slate-900 mb-3">3. Beta Access and Free Trials</h2>
              <p className="text-slate-700 leading-relaxed">
                Tandril may offer beta access, free trials, or early-access programs at its sole discretion. During beta periods:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-700 mt-2">
                <li>The Service is provided "as-is" for evaluation and feedback purposes.</li>
                <li>Features, functionality, and availability may change without notice.</li>
                <li>We reserve the right to limit, suspend, or terminate beta access at any time, including if usage costs become unsustainable, without liability to you.</li>
                <li>Any free access provided during beta does not create an obligation for continued free access after the beta period ends.</li>
              </ul>
            </section>

            {/* 4. Subscriptions and Billing */}
            <section className="border-t pt-6">
              <h2 className="text-xl font-bold text-slate-900 mb-3">4. Subscriptions and Billing</h2>
              <p className="text-slate-700 leading-relaxed mb-2">
                Paid subscriptions are billed in advance on a recurring basis (monthly or annually). By subscribing, you authorize Tandril to charge your payment method via our payment processor (Stripe) on a recurring basis.
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-700">
                <li><strong>Cancellation:</strong> You may cancel at any time. Cancellation takes effect at the end of the current billing period. No refunds are issued for partial billing periods.</li>
                <li><strong>Price Changes:</strong> We will provide at least 30 days' notice of any price changes. Continued use after the effective date constitutes acceptance.</li>
                <li><strong>Failed Payments:</strong> If payment fails, we may suspend your account until payment is resolved.</li>
                <li><strong>Taxes:</strong> You are responsible for any applicable taxes related to your use of the Service.</li>
              </ul>
            </section>

            {/* 5. Third-Party Platform Connections */}
            <section className="border-t pt-6">
              <h2 className="text-xl font-bold text-slate-900 mb-3">5. Third-Party Platform Connections</h2>
              <p className="text-slate-700 leading-relaxed mb-2">
                Tandril connects to third-party platforms (e.g., Shopify, eBay, WooCommerce, BigCommerce) via OAuth or API integrations. By connecting a platform, you:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-700">
                <li>Authorize Tandril to access and act on your store data on your behalf, within the permissions you grant.</li>
                <li>Confirm that you have the right and authority to connect that account to Tandril.</li>
                <li>Acknowledge that your use of each connected platform is also governed by that platform's own terms of service.</li>
                <li>Understand that Tandril is not responsible for actions taken by third-party platforms, including changes to their APIs, rate limits, or access policies that may affect the Service.</li>
              </ul>
              <p className="text-slate-700 mt-3">
                You can disconnect a platform at any time through your account settings. Disconnection does not automatically delete data already synced.
              </p>
            </section>

            {/* 6. Acceptable Use */}
            <section className="border-t pt-6">
              <h2 className="text-xl font-bold text-slate-900 mb-3">6. Acceptable Use</h2>
              <p className="text-slate-700 mb-2">You agree to use the Service only for lawful purposes. You may not:</p>
              <ul className="list-disc pl-6 space-y-2 text-slate-700">
                <li>Use the Service to violate any applicable local, state, national, or international law or regulation.</li>
                <li>Violate the terms of service of any connected third-party platform.</li>
                <li>Attempt to gain unauthorized access to any part of the Service or its related systems.</li>
                <li>Use automated scripts, bots, or scrapers to access the Service beyond what the platform itself provides.</li>
                <li>Resell, sublicense, or otherwise commercially exploit the Service without written permission from Tandril.</li>
                <li>Upload or transmit malicious code, viruses, or any material that disrupts or damages the Service.</li>
                <li>Use the Service to engage in fraudulent activity or misrepresent your store, products, or business.</li>
              </ul>
              <p className="text-slate-700 mt-3">
                We reserve the right to suspend or terminate accounts found in violation of this section without prior notice.
              </p>
            </section>

            {/* 7. AI Features and Automated Actions */}
            <section className="border-t pt-6">
              <h2 className="text-xl font-bold text-slate-900 mb-3">7. AI Features and Automated Actions</h2>
              <p className="text-slate-700 leading-relaxed mb-2">
                Tandril uses AI (powered by Anthropic's Claude API) to interpret commands and execute actions within your connected stores. You acknowledge that:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-700">
                <li>AI-generated outputs, recommendations, and automated actions are provided for informational and operational assistance only and may not always be accurate.</li>
                <li>You are responsible for reviewing automated actions before they are applied where review is available, and for the results of any actions you authorize.</li>
                <li>Tandril is not liable for business outcomes resulting from AI-assisted decisions or automations you initiate.</li>
                <li>AI features may use anonymized usage data to improve the Service, subject to our Privacy Policy.</li>
              </ul>
            </section>

            {/* 8. Intellectual Property */}
            <section className="border-t pt-6">
              <h2 className="text-xl font-bold text-slate-900 mb-3">8. Intellectual Property</h2>
              <p className="text-slate-700 leading-relaxed mb-2">
                <strong>Tandril's IP:</strong> All content, features, software, trademarks, logos, and technology comprising the Service are owned by Tandril or its licensors and protected by intellectual property laws. You may not copy, modify, distribute, or create derivative works from any part of the Service without written consent.
              </p>
              <p className="text-slate-700 leading-relaxed">
                <strong>Your Data:</strong> You retain ownership of all data you bring to or generate within the Service, including your store data, product listings, and customer information. By using the Service, you grant Tandril a limited license to access and process your data solely to provide the Service to you.
              </p>
            </section>

            {/* 9. Privacy */}
            <section className="border-t pt-6">
              <h2 className="text-xl font-bold text-slate-900 mb-3">9. Privacy</h2>
              <p className="text-slate-700 leading-relaxed">
                Your use of the Service is also governed by our <strong>Privacy Policy</strong>, available at <strong>tandril.org/privacy</strong>, which is incorporated into these Terms by reference. By using the Service, you consent to the data practices described in our Privacy Policy.
              </p>
            </section>

            {/* 10. Disclaimers */}
            <section className="border-t pt-6">
              <h2 className="text-xl font-bold text-slate-900 mb-3">10. Disclaimers</h2>
              <p className="text-slate-700 leading-relaxed mb-2">
                THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.
              </p>
              <p className="text-slate-700 leading-relaxed">
                Tandril does not warrant that the Service will be uninterrupted, error-free, or free of harmful components. We do not guarantee that any particular platform integration will remain available, as third-party APIs are outside our control.
              </p>
            </section>

            {/* 11. Limitation of Liability */}
            <section className="border-t pt-6">
              <h2 className="text-xl font-bold text-slate-900 mb-3">11. Limitation of Liability</h2>
              <p className="text-slate-700 leading-relaxed mb-2">
                TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL TANDRIL, ITS FOUNDERS, EMPLOYEES, PARTNERS, AGENTS, OR AFFILIATES BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-700">
                <li>Loss of profits, revenue, or business opportunities</li>
                <li>Loss of data or store content</li>
                <li>Costs of substitute goods or services</li>
                <li>Damages resulting from errors in AI outputs or automated actions</li>
                <li>Damages arising from third-party platform outages, API changes, or policy violations</li>
              </ul>
              <p className="text-slate-700 mt-3">
                Our total cumulative liability to you for any claims arising out of or related to the Service will not exceed the greater of (a) the total fees you paid to Tandril in the 12 months preceding the claim, or (b) $100 USD.
              </p>
            </section>

            {/* 12. Indemnification */}
            <section className="border-t pt-6">
              <h2 className="text-xl font-bold text-slate-900 mb-3">12. Indemnification</h2>
              <p className="text-slate-700 leading-relaxed">
                You agree to defend, indemnify, and hold harmless Tandril and its founders, employees, and affiliates from any claims, damages, losses, liabilities, and expenses (including attorneys' fees) arising out of or related to: (a) your use of the Service; (b) your violation of these Terms; (c) your violation of any third-party platform's terms of service; or (d) your store operations, products, or customer relationships.
              </p>
            </section>

            {/* 13. Termination */}
            <section className="border-t pt-6">
              <h2 className="text-xl font-bold text-slate-900 mb-3">13. Termination</h2>
              <p className="text-slate-700 leading-relaxed mb-2">
                <strong>By You:</strong> You may terminate your account at any time by contacting us at security@tandril.org or through your account settings.
              </p>
              <p className="text-slate-700 leading-relaxed mb-2">
                <strong>By Tandril:</strong> We may suspend or terminate your access immediately, without prior notice or liability, if you breach these Terms, engage in prohibited conduct, or for any other reason at our sole discretion. We may also discontinue the Service or any feature at any time.
              </p>
              <p className="text-slate-700 leading-relaxed">
                Upon termination, your right to use the Service ceases immediately. Sections 8, 11, 12, 14, and 15 survive termination.
              </p>
            </section>

            {/* 14. Governing Law */}
            <section className="border-t pt-6">
              <h2 className="text-xl font-bold text-slate-900 mb-3">14. Governing Law and Disputes</h2>
              <p className="text-slate-700 leading-relaxed mb-2">
                These Terms are governed by the laws of the State of Wisconsin, United States, without regard to conflict of law principles. Any disputes arising from these Terms or your use of the Service shall be resolved exclusively in the state or federal courts located in Wisconsin, and you consent to personal jurisdiction in those courts.
              </p>
              <p className="text-slate-700 leading-relaxed">
                Before filing any legal claim, you agree to contact us at <strong>security@tandril.org</strong> and attempt to resolve the dispute informally for at least 30 days.
              </p>
            </section>

            {/* 15. Changes to Terms */}
            <section className="border-t pt-6">
              <h2 className="text-xl font-bold text-slate-900 mb-3">15. Changes to These Terms</h2>
              <p className="text-slate-700 leading-relaxed">
                We may update these Terms at any time. When we do, we will update the "Last updated" date at the top and, for material changes, notify you by email or in-app notice at least 30 days before the changes take effect. Your continued use of the Service after the effective date constitutes acceptance of the revised Terms.
              </p>
            </section>

            {/* 16. Contact */}
            <section className="border-t pt-6">
              <h2 className="text-xl font-bold text-slate-900 mb-3">16. Contact Us</h2>
              <p className="text-slate-700 leading-relaxed">
                If you have any questions about these Terms, please contact us at:
              </p>
              <div className="mt-3 p-4 bg-slate-50 border border-slate-200 rounded-lg text-slate-700">
                <p><strong>Tandril</strong></p>
                <p>Email: <strong>security@tandril.org</strong></p>
                <p>Website: <strong>tandril.org</strong></p>
              </div>
            </section>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
