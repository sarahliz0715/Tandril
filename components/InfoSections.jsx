import React from "react";

export default function InfoSections() {
  return (
    <div className="space-y-20 px-6 md:px-24 py-16 bg-gray-50 text-gray-800">

      {/* What is Tandril */}
      <section id="what-is-tandril" className="space-y-6">
        <h2 className="text-4xl font-extrabold text-indigo-600">What is Tandril?</h2>
        <p className="text-lg font-semibold text-gray-900">
          Tandril is an AI-powered SaaS platform that helps e-commerce sellers run smarter, more efficient businesses across multiple marketplaces.
        </p>
        <p className="text-gray-700">
          Selling on platforms like Shopify, Amazon, Etsy, Walmart, and eBay means juggling different dashboards, metrics, rules, and workflows. Important decisions are often made late, inconsistently, or without a full picture of the business.
        </p>
        <p className="text-gray-700">
          Tandril acts as an <span className="font-semibold text-indigo-600">AI operations layer</span> that unifies your data, highlights what needs attention, and helps execute improvements — all from one place.
        </p>
        <p className="text-gray-700">
          Instead of manually tracking performance, inventory, listings, and operational tasks across platforms, sellers use Tandril to gain clarity, reduce risk, and scale with confidence.
        </p>
        <p className="text-gray-700">
          Tandril is offered as a <span className="font-semibold text-indigo-600">monthly subscription</span> and is designed for solo sellers, growing brands, and multi-store operators.
        </p>
      </section>

      {/* Pricing */}
      <section id="pricing" className="space-y-6">
        <h2 className="text-4xl font-extrabold text-indigo-600">Pricing</h2>
        <ul className="space-y-4">
          <li className="bg-white p-6 rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition">
            <h3 className="text-xl font-bold text-gray-900">Starter — $39/month</h3>
            <p className="text-gray-700 mt-1">For solo sellers. Core insights, alerts, and basic operational automation.</p>
          </li>
          <li className="bg-white p-6 rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition">
            <h3 className="text-xl font-bold text-gray-900">Growth — $129/month</h3>
            <p className="text-gray-700 mt-1">For scaling sellers. Cross-platform intelligence, automated optimizations, and inventory risk detection.</p>
          </li>
          <li className="bg-white p-6 rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition">
            <h3 className="text-xl font-bold text-gray-900">Pro — $299/month</h3>
            <p className="text-gray-700 mt-1">For multi-store brands and agencies. Advanced optimization strategies, custom rules, and team access.</p>
          </li>
        </ul>
        <p className="italic text-gray-600 mt-2">All plans are billed monthly. Cancel anytime.</p>
      </section>

      {/* Terms of Service */}
      <section id="terms" className="space-y-4">
        <h2 className="text-4xl font-extrabold text-indigo-600">Terms of Service</h2>
        <p className="text-gray-700">Effective Date: December 20, 2025</p>
        <p className="text-gray-700">Welcome to Tandril! By using our platform, you agree to these Terms of Service.</p>
        <ul className="list-disc list-inside space-y-2 text-gray-700">
          <li><strong>Services:</strong> Tandril provides an AI-powered SaaS platform that helps e-commerce sellers manage their businesses across multiple marketplaces.</li>
          <li><strong>Account & Subscription:</strong> You must create an account to use Tandril. Subscriptions are billed monthly. Cancel anytime. No partial-month refunds.</li>
          <li><strong>User Responsibilities:</strong> Maintain account confidentiality and do not misuse the platform.</li>
          <li><strong>Content & Data:</strong> You retain ownership of your business data. Tandril may use anonymized data for internal analytics.</li>
          <li><strong>Limitation of Liability:</strong> Tandril is provided “as-is.” We are not liable for business losses, errors, or downtime.</li>
          <li><strong>Modifications:</strong> We may update these Terms at any time. Continued use constitutes acceptance of changes.</li>
        </ul>
        <p className="text-gray-700">Contact: <a href="mailto:support@tandril.ai" className="text-indigo-600 underline">support@tandril.ai</a></p>
      </section>

      {/* Privacy Policy */}
      <section id="privacy" className="space-y-4">
        <h2 className="text-4xl font-extrabold text-indigo-600">Privacy Policy</h2>
        <p className="text-gray-700">Effective Date: December 20, 2025</p>
        <ul className="list-disc list-inside space-y-2 text-gray-700">
          <li><strong>Data We Collect:</strong> Account info, business data, usage data.</li>
          <li><strong>How We Use Data:</strong> Provide/improve services, send account updates, comply with legal obligations.</li>
          <li><strong>Data Sharing:</strong> We do not sell data. Shared only with service providers (Stripe, hosting).</li>
          <li><strong>Data Security:</strong> Reasonable security measures are implemented.</li>
          <li><strong>Your Choices:</strong> Update or delete account anytime. Manage email preferences in account settings.</li>
        </ul>
        <p className="text-gray-700">Contact: <a href="mailto:support@tandril.ai" className="text-indigo-600 underline">support@tandril.ai</a></p>
      </section>

      {/* Footer */}
      <footer className="text-center text-sm text-gray-500 pt-12 border-t border-gray-300 space-y-2">
        <p>Contact: <a href="mailto:support@tandril.ai" className="underline hover:text-gray-700">support@tandril.ai</a></p>
        <p>
          <a href="#terms" className="underline hover:text-gray-700">Terms of Service</a> | <a href="#privacy" className="underline hover:text-gray-700">Privacy Policy</a>
        </p>
      </footer>

    </div>
  );
}
