import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, Lock, User, Chrome, Github, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabaseAuthService } from '@/api/supabaseAuth';
import { createPageUrl } from '@/utils';
import TandrilLogo from '@/components/logos/TandrilLogo';

export default function Signup() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState('');
  const [error, setError] = useState('');

  const handleEmailSignup = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!fullName || !email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      const { user } = await supabaseAuthService.signUp(email, password, {
        full_name: fullName
      });

      toast.success('Account created!', {
        description: 'Please check your email to verify your account'
      });

      // Redirect to onboarding
      navigate(createPageUrl('Onboarding'));
    } catch (err) {
      console.error('Signup error:', err);
      setError(err.message || 'Failed to create account. Please try again.');
      toast.error('Signup failed', {
        description: err.message || 'Please try again'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialSignup = async (provider) => {
    setError('');
    setIsLoading(true);

    try {
      await supabaseAuthService.signInWithProvider(provider);
      // Redirect will happen automatically via OAuth
    } catch (err) {
      console.error('Social signup error:', err);
      setError(err.message || `Failed to sign up with ${provider}`);
      toast.error('Signup failed', {
        description: err.message
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to={createPageUrl('Home')} className="inline-block">
            <TandrilLogo className="h-12 w-auto mx-auto" />
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Start Your Free Trial</h1>
          <p className="mt-2 text-slate-600">14 days free, no credit card required</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create Your Account</CardTitle>
            <CardDescription>
              Get started with Tandril in seconds
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* Trial Benefits */}
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-semibold text-green-900 mb-2">What's included in your trial:</p>
              <ul className="space-y-1 text-sm text-green-800">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  AI-powered Workflows & Commands
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Ad Campaign Management
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  AI Advisor & Market Intelligence
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Full platform access for 14 days
                </li>
              </ul>
            </div>

            <form onSubmit={handleEmailSignup} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-10"
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    disabled={isLoading}
                    required
                    minLength={6}
                  />
                </div>
                <p className="text-xs text-slate-500">At least 6 characters</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10"
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Start Free Trial'
                )}
              </Button>

              <p className="text-xs text-center text-slate-500">
                By signing up, you agree to our{' '}
                <Link to={createPageUrl('TermsOfService')} className="text-indigo-600 hover:underline">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link to={createPageUrl('PrivacyPolicy')} className="text-indigo-600 hover:underline">
                  Privacy Policy
                </Link>
              </p>
            </form>

            {/* OAuth providers disabled until configured in Supabase */}
            {/* Uncomment when Google/GitHub OAuth is enabled in Supabase Authentication > Providers */}
            {/*
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-500">Or sign up with</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleSocialSignup('google')}
                disabled={isLoading}
              >
                <Chrome className="mr-2 h-4 w-4" />
                Google
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleSocialSignup('github')}
                disabled={isLoading}
              >
                <Github className="mr-2 h-4 w-4" />
                GitHub
              </Button>
            </div>
            */}
          </CardContent>

          <CardFooter className="flex justify-center">
            <p className="text-sm text-slate-600">
              Already have an account?{' '}
              <Link
                to={createPageUrl('Login')}
                className="font-medium text-indigo-600 hover:text-indigo-700"
              >
                Sign in
              </Link>
            </p>
          </CardFooter>
        </Card>

        {/* Back to home */}
        <div className="mt-6 text-center">
          <Link
            to={createPageUrl('Home')}
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
