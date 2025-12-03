import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, Lock, Chrome, Github } from 'lucide-react';
import { toast } from 'sonner';
import { supabaseAuthService } from '@/api/supabaseAuth';
import { createPageUrl } from '@/utils';
import TandrilLogo from '@/components/logos/TandrilLogo';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Get redirect URL from query params
  const params = new URLSearchParams(location.search);
  const redirectUrl = params.get('redirect') || '/Dashboard';

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setIsLoading(true);

    try {
      await supabaseAuthService.signIn(email, password);
      toast.success('Welcome back!');
      navigate(redirectUrl);
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Failed to sign in. Please check your credentials.');
      toast.error('Login failed', {
        description: err.message || 'Please check your credentials'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider) => {
    setError('');
    setIsLoading(true);

    try {
      await supabaseAuthService.signInWithProvider(provider);
      // Redirect will happen automatically via OAuth
    } catch (err) {
      console.error('Social login error:', err);
      setError(err.message || `Failed to sign in with ${provider}`);
      toast.error('Login failed', {
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
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Welcome Back</h1>
          <p className="mt-2 text-slate-600">Sign in to your Tandril account</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              Enter your email and password to access your account
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleEmailLogin} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

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
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    to={createPageUrl('ForgotPassword')}
                    className="text-sm text-indigo-600 hover:text-indigo-700"
                  >
                    Forgot password?
                  </Link>
                </div>
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
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            {/* OAuth providers disabled until configured in Supabase */}
            {/* Uncomment when Google/GitHub OAuth is enabled in Supabase Authentication > Providers */}
            {/*
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-500">Or continue with</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleSocialLogin('google')}
                disabled={isLoading}
              >
                <Chrome className="mr-2 h-4 w-4" />
                Google
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleSocialLogin('github')}
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
              Don't have an account?{' '}
              <Link
                to={createPageUrl('Signup')}
                className="font-medium text-indigo-600 hover:text-indigo-700"
              >
                Sign up for free
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
