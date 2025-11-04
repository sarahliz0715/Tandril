import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, AlertTriangle } from 'lucide-react';

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
            <p className="text-sm text-slate-500">Last updated: {new Date().toLocaleDateString()}</p>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <div className="p-4 mb-6 rounded-lg bg-red-50 border border-red-200 text-red-800 flex items-start gap-3">
              <AlertTriangle className="w-8 h-8 mt-1" />
              <div>
                <h3 className="font-bold text-red-900 mt-0">Important: Placeholder Content</h3>
                <p className="mt-1">This is a template and not legal advice. You must replace this content with your own Privacy Policy, drafted by a qualified legal professional, before launching Tandril.</p>
              </div>
            </div>

            <h2>1. Information We Collect</h2>
            <p>We collect information you provide directly to us. For example, we collect information when you create an account, subscribe, participate in any interactive features of our services, fill out a form, request customer support, or otherwise communicate with us.</p>
            
            <h2>2. How We Use Information</h2>
            <p>We may use the information we collect to:</p>
            <ul>
              <li>Provide, maintain, and improve our services;</li>
              <li>Process transactions and send you related information, including confirmations and invoices;</li>
              <li>Send you technical notices, updates, security alerts, and support and administrative messages;</li>
              <li>Respond to your comments, questions, and requests and provide customer service;</li>
            </ul>

            <h2>3. How We Share Information</h2>
            <p>We may share information about you as follows or as otherwise described in this Privacy Policy:</p>
            <ul>
                <li>With vendors, consultants, and other service providers who need access to such information to carry out work on our behalf;</li>
                <li>In response to a request for information if we believe disclosure is in accordance with, or required by, any applicable law, regulation, or legal process;</li>
            </ul>

            <h2>4. Data Security</h2>
            <p>We take reasonable measures to help protect information about you from loss, theft, misuse and unauthorized access, disclosure, alteration, and destruction.</p>
            
            <h2>5. Your Choices</h2>
            <p>You may update, correct or delete information about you at any time by logging into your online account or emailing us. If you wish to delete or deactivate your account, please email us but note that we may retain certain information as required by law or for legitimate business purposes.</p>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}