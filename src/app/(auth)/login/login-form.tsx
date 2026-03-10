'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { BookOpen, Mail, Lock, Github, Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const error = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setFormError('');

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setFormError('Invalid email or password');
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setFormError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthLogin = (provider: string) => {
    signIn(provider, { callbackUrl });
  };

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Logo + Branding */}
      <div className="flex flex-col items-center gap-3">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
          style={{
            background: 'linear-gradient(135deg, rgba(160,180,145,0.2) 0%, rgba(160,180,145,0.05) 100%)',
            border: '1px solid rgba(160,180,145,0.15)',
          }}
        >
          <BookOpen className="w-7 h-7" style={{ color: 'rgba(160,180,145,0.7)' }} />
        </div>
        <div className="text-center">
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: '#c0c8b8' }}
          >
            Longbox
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: 'rgba(255,255,255,0.32)' }}
          >
            Sign in to your library
          </p>
        </div>
      </div>

      {/* Glass Card */}
      <div
        className="w-full rounded-2xl p-6 backdrop-blur-sm"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}
      >
        {/* Error Messages */}
        {(error || formError) && (
          <div
            className="flex items-center gap-2 p-3 rounded-xl mb-5 text-sm"
            style={{
              background: 'rgba(220,80,80,0.08)',
              border: '1px solid rgba(220,80,80,0.15)',
              color: '#e08080',
            }}
          >
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>
              {error === 'CredentialsSignin'
                ? 'Invalid email or password'
                : formError || 'An error occurred'}
            </span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleCredentialsLogin} className="space-y-4">
          <div className="space-y-2">
            <Label
              htmlFor="email"
              className="text-xs font-medium uppercase tracking-wider"
              style={{ color: 'rgba(255,255,255,0.32)' }}
            >
              Email
            </Label>
            <div className="relative">
              <Mail
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: 'rgba(160,180,145,0.4)' }}
              />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-11 rounded-xl border-none text-sm"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  color: '#c0c8b8',
                }}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="password"
              className="text-xs font-medium uppercase tracking-wider"
              style={{ color: 'rgba(255,255,255,0.32)' }}
            >
              Password
            </Label>
            <div className="relative">
              <Lock
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: 'rgba(160,180,145,0.4)' }}
              />
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 h-11 rounded-xl border-none text-sm"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  color: '#c0c8b8',
                }}
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-11 rounded-xl font-medium text-sm mt-2 transition-all duration-200"
            style={{
              background: 'linear-gradient(135deg, rgba(160,180,145,0.25) 0%, rgba(160,180,145,0.12) 100%)',
              color: '#c0c8b8',
              border: '1px solid rgba(160,180,145,0.15)',
            }}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign in'
            )}
          </Button>
        </form>

        {/* Divider */}
        <div className="relative my-5">
          <div
            className="absolute inset-0 flex items-center"
          >
            <div className="w-full" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />
          </div>
          <div className="relative flex justify-center text-xs uppercase tracking-wider">
            <span
              className="px-3"
              style={{
                background: 'rgba(11,17,12,1)',
                color: 'rgba(255,255,255,0.2)',
              }}
            >
              or
            </span>
          </div>
        </div>

        {/* OAuth */}
        <Button
          variant="outline"
          onClick={() => handleOAuthLogin('github')}
          className="w-full h-11 rounded-xl font-medium text-sm border-none transition-all duration-200"
          style={{
            background: 'rgba(255,255,255,0.04)',
            color: 'rgba(255,255,255,0.5)',
          }}
        >
          <Github className="w-4 h-4 mr-2" />
          Continue with GitHub
        </Button>
      </div>

      {/* Sign Up Link */}
      <p className="text-sm" style={{ color: 'rgba(255,255,255,0.25)' }}>
        No account?{' '}
        <Link
          href="/signup"
          className="font-medium transition-colors hover:opacity-80"
          style={{ color: 'rgba(160,180,145,0.6)' }}
        >
          Create one
        </Link>
      </p>
    </div>
  );
}
