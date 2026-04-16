import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Mail, Lock, Database, AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react';

export default function Security() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-6">
      <div className="max-w-4xl mx-auto">
        <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl font-bold text-slate-900">
              <Shield className="w-6 h-6" />
              Security at Tandril
            </CardTitle>
            <p className="text-sm text-slate-500">Last updated: April 2026</p>
          </CardHeader>
          <CardContent className="prose max-w-none space-y-6">

            {/* Intro */}
            <section>
              <p className="text-slate-700 leading-relaxed">
                Tandril is built for sellers who trust us with access to their stores. We take that seriously.
                This page describes how we protect your data, how platform connections work, and how to reach
                us if you find a security issue.
              </p>
            </section>

            {/* Data Storage */}
            <section className="border-t pt-6">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-4">
                <Database className="w-5 h-5" />
                Data Storage and Encryption
              </h2>
              <p className="text-slate-700 leading-relaxed">
                All data is stored in a managed PostgreSQL database hosted on AWS infrastructure in the
                United States. Data at rest is encrypted using AES-256. All data in transit is encrypted
                via TLS 1.2 or higher — there are no unencrypted connections between your browser, our
                servers, or any third-party platform APIs.
              </p>
              <p className="text-slate-700 leading-relaxed mt-3">
                OAuth access tokens from connected platforms (Shopify, Etsy, eBay, and others) are stored
                encrypted at rest and are never logged, exposed in client-side code, or transmitted to any
                party other than the originating platform's API.
              </p>
            </section>

            {/* OAuth */}
            <section className="border-t pt-6">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-4">
                <Lock className="w-5 h-5" />
                Platform Connections and OAuth
              </h2>
              <p className="text-slate-700 leading-relaxed">
                Tandril connects to third-party selling platforms using each platform's official OAuth 2.0
                authorization flow. We never ask for or store your platform username or password.
              </p>
              <p className="text-slate-700 leading-relaxed mt-3">
                For platforms that support it (including Etsy), we use PKCE (Proof Key for Code Exchange)
                to further secure the OAuth handshake. OAuth state tokens used during authorization have a
                maximum lifetime of <strong>10 minutes</strong> and are deleted immediately upon use.
              </p>
              <p className="text-slate-700 leading-relaxed mt-3">
                Access tokens are scoped to the minimum permissions required for the features you use.
                You can review exactly which permissions are requested before authorizing any connection.
              </p>
            </section>

            {/* Data Isolation */}
            <section className="border-t pt-6">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5" />
                Data Isolation
              </h2>
              <p className="text-slate-700 leading-relaxed">
                Every piece of data in Tandril — products, orders, conversations, purchase orders — is
                isolated to your account using Row Level Security (RLS) enforced at the database layer.
                It is not possible for one user's account to access another user's data, even in the
                event of an application-level bug. Access control is enforced by the database, not just
                the application.
              </p>
            </section>

            {/* Deletion */}
            <section className="border-t pt-6">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-4">
                <CheckCircle className="w-5 h-5" />
                Data Deletion
              </h2>
              <ul className="list-disc pl-6 space-y-3 text-slate-700">
                <li>
                  <strong>Disconnect a platform:</strong> All stored credentials and tokens for that
                  platform are permanently deleted from our database immediately. There is no retention
                  period for OAuth tokens after disconnection.
                </li>
                <li>
                  <strong>Delete your account:</strong> All of your data — platform connections, product
                  data, order history, AI conversation history, and stored business context — is
                  permanently deleted within 30 days.
                </li>
              </ul>
            </section>

            {/* AI */}
            <section className="border-t pt-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">
                AI Processing
              </h2>
              <p className="text-slate-700 leading-relaxed">
                Tandril's AI assistant (Orion) is powered by Anthropic's Claude API. When you interact
                with Orion, your messages and relevant store context are transmitted to Anthropic's API
                for processing, governed by{' '}
                <a
                  href="https://www.anthropic.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  Anthropic's privacy policy <ExternalLink className="w-3 h-3" />
                </a>.
                Tandril does not use your store data to train AI models.
              </p>
              <p className="text-slate-700 leading-relaxed mt-3">
                Every action Orion proposes — including any changes to your listings, prices, or inventory
                — requires your explicit confirmation before it is executed. Nothing is applied to your
                store automatically.
              </p>
            </section>

            {/* What we don't do */}
            <section className="border-t pt-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">
                What We Do Not Do
              </h2>
              <ul className="list-disc pl-6 space-y-2 text-slate-700">
                <li>We do not sell, rent, or share your data or your customers' data with third parties for advertising or marketing purposes.</li>
                <li>We do not store buyer payment information. Payment processing is handled entirely by your selling platforms.</li>
                <li>We do not access your platform accounts for any purpose other than the features you have enabled.</li>
                <li>We do not retain platform OAuth tokens after you disconnect an integration.</li>
              </ul>
            </section>

            {/* Subprocessors */}
            <section className="border-t pt-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">
                Subprocessors
              </h2>
              <p className="text-slate-700 mb-4">
                Tandril uses the following infrastructure subprocessors:
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-slate-700 border-collapse">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="text-left p-3 border border-slate-200 font-semibold">Subprocessor</th>
                      <th className="text-left p-3 border border-slate-200 font-semibold">Purpose</th>
                      <th className="text-left p-3 border border-slate-200 font-semibold">Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-3 border border-slate-200">Supabase (AWS)</td>
                      <td className="p-3 border border-slate-200">Database, authentication, edge functions</td>
                      <td className="p-3 border border-slate-200">United States</td>
                    </tr>
                    <tr className="bg-slate-50/50">
                      <td className="p-3 border border-slate-200">Anthropic</td>
                      <td className="p-3 border border-slate-200">AI assistant processing</td>
                      <td className="p-3 border border-slate-200">United States</td>
                    </tr>
                    <tr>
                      <td className="p-3 border border-slate-200">Vercel</td>
                      <td className="p-3 border border-slate-200">Frontend hosting and delivery</td>
                      <td className="p-3 border border-slate-200">United States / Global CDN</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Responsible Disclosure */}
            <section className="border-t pt-6">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5" />
                Responsible Disclosure
              </h2>
              <p className="text-slate-700 leading-relaxed">
                If you discover a security vulnerability in Tandril, please report it to us privately
                before disclosing it publicly. We will acknowledge your report within 48 hours and aim
                to resolve confirmed vulnerabilities within 30 days.
              </p>
              <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <p className="font-semibold text-slate-900 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Security contact:&nbsp;
                  <a href="mailto:security@tandril.org" className="text-blue-600 hover:underline">
                    security@tandril.org
                  </a>
                </p>
                <p className="text-sm text-slate-600 mt-2">
                  Please include a description of the vulnerability, steps to reproduce it, and the
                  potential impact. We appreciate responsible disclosure and will credit researchers
                  who help us keep Tandril secure.
                </p>
              </div>
            </section>

            {/* Questions */}
            <section className="border-t pt-6">
              <p className="text-slate-700">
                For general privacy questions, see our{' '}
                <a href="/PrivacyPolicy" className="text-blue-600 hover:underline">Privacy Policy</a>.
                For security concerns, contact{' '}
                <a href="mailto:security@tandril.org" className="text-blue-600 hover:underline">
                  security@tandril.org
                </a>.
              </p>
            </section>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
