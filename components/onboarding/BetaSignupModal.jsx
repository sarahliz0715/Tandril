import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Mail, Loader2, FlaskConical } from "lucide-react";
import { EmailSignup } from '@/lib/entities';

export default function BetaSignupModal({ isOpen, onClose, onSuccess }) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
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
        setError('This email is already on our beta list!');
        setIsSubmitting(false);
        return;
      }

      // Save the email signup
      await EmailSignup.create({
        email: email.toLowerCase(),
        source: 'beta_signup',
        signup_context: {
          user_agent: navigator.userAgent,
          referrer: document.referrer,
        }
      });

      onSuccess(email);
    } catch (error) {
      console.error('Beta signup error:', error);
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
              <FlaskConical className="w-5 h-5 text-white" />
            </div>
            Join the Beta Waitlist
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Badge className="bg-amber-100 text-amber-700 border-amber-200 w-full justify-center py-2">
            🚀 Be among the first to experience autonomous AI
          </Badge>
          
          <p className="text-slate-600 text-sm">
            Get early access to Tandril and help shape the future of e-commerce automation.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="pl-10"
                disabled={isSubmitting}
              />
            </div>
            
            {error && (
              <p className="text-red-600 text-sm">{error}</p>
            )}

            <div className="flex gap-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                className="flex-1"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || !email}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Joining...
                  </>
                ) : (
                  'Join Beta'
                )}
              </Button>
            </div>
          </form>

          <div className="text-xs text-slate-500 text-center">
            We'll only contact you about beta access and major updates.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}