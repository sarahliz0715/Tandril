import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, AlertTriangle } from 'lucide-react';

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
            <p className="text-sm text-slate-500">Last updated: {new Date().toLocaleDateString()}</p>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <div className="p-4 mb-6 rounded-lg bg-red-50 border border-red-200 text-red-800 flex items-start gap-3">
              <AlertTriangle className="w-8 h-8 mt-1" />
              <div>
                <h3 className="font-bold text-red-900 mt-0">Important: Placeholder Content</h3>
                <p className="mt-1">This is a template and not legal advice. You must replace this content with your own Terms of Service, drafted by a qualified legal professional, before launching your application.</p>
              </div>
            </div>

            <h2>1. Introduction</h2>
            <p>Welcome to Tandril! These Terms of Service ("Terms") govern your use of our application and services. By using our service, you agree to these Terms.</p>
            
            <h2>2. Your Account</h2>
            <p>You are responsible for safeguarding your account and for any activities or actions under your account. We encourage you to use "strong" passwords with your account.</p>

            <h2>3. Content</h2>
            <p>Our Service allows you to post, link, store, share and otherwise make available certain information, text, graphics, videos, or other material ("Content"). You are responsible for the Content that you post on or through the Service, including its legality, reliability, and appropriateness.</p>

            <h2>4. Prohibited Uses</h2>
            <p>You may not use the service for any illegal or unauthorized purpose. You agree to comply with all laws, rules, and regulations applicable to your use of the Service.</p>
            
            <h2>5. Termination</h2>
            <p>We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.</p>

            <h2>6. Limitation Of Liability</h2>
            <p>In no event shall Tandril, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses...</p>

            <h2>7. Governing Law</h2>
            <p>These Terms shall be governed and construed in accordance with the laws of your jurisdiction, without regard to its conflict of law provisions.</p>
            
            <h2>8. Changes</h2>
            <p>We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will try to provide at least 30 days' notice prior to any new terms taking effect.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}