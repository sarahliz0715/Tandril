import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, Mail, Loader2 } from "lucide-react";
import { EmailSignup } from '@/api/entities';

export default function EmailCapture({ source = "landing_page", placeholder = "Enter your email", buttonText = "Join Beta", className = "" }) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      // Basic email validation
      if (!email || !email.includes('@')) {
        setError('Please enter a valid email address');
        setIsSubmitting(false);
        return;
      }

      // Check if email already exists
      const existingSignups = await EmailSignup.filter({ email: email.toLowerCase() });
      if (existingSignups.length > 0) {
        setError('This email is already on our list!');
        setIsSubmitting(false);
        return;
      }

      // Save the email signup
      await EmailSignup.create({
        email: email.toLowerCase(),
        source: source,
        signup_context: {
          user_agent: navigator.userAgent,
          referrer: document.referrer,
          utm_source: new URLSearchParams(window.location.search).get('utm_source'),
          utm_campaign: new URLSearchParams(window.location.search).get('utm_campaign')
        }
      });

      setSubmitted(true);
    } catch (error) {
      console.error('Email signup error:', error);
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className={`flex items-center justify-center gap-3 p-6 bg-green-50 border border-green-200 rounded-xl ${className}`}>
        <CheckCircle className="w-6 h-6 text-green-600" />
        <div className="text-center">
          <p className="text-lg font-semibold text-green-900">You're on the list!</p>
          <p className="text-sm text-green-700">We'll notify you when beta access is available.</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={`space-y-4 ${className}`}>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            type="email"
            placeholder={placeholder}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="pl-10 text-lg py-3"
            disabled={isSubmitting}
          />
        </div>
        <Button 
          type="submit" 
          disabled={isSubmitting || !email}
          className="bg-indigo-600 hover:bg-indigo-700 px-8 py-3 text-lg"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Joining...
            </>
          ) : (
            buttonText
          )}
        </Button>
      </div>
      {error && (
        <p className="text-red-600 text-sm text-center">{error}</p>
      )}
    </form>
  );
}