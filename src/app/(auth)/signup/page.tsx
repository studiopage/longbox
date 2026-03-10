'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BookOpen, Mail, Lock, User, Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signUp } from '@/actions/auth';

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);

    try {
      const result = await signUp({ name, email, password });

      if (result.error) {
        setError(result.error);
      } else {
        router.push('/login?message=Account created successfully');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
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
            Create account
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: 'rgba(255,255,255,0.32)' }}
          >
            Start managing your collection
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
        {/* Error Message */}
        {error && (
          <div
            className="flex items-center gap-2 p-3 rounded-xl mb-5 text-sm"
            style={{
              background: 'rgba(220,80,80,0.08)',
              border: '1px solid rgba(220,80,80,0.15)',
              color: '#e08080',
            }}
          >
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Signup Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label
              htmlFor="name"
              className="text-xs font-medium uppercase tracking-wider"
              style={{ color: 'rgba(255,255,255,0.32)' }}
            >
              Name
            </Label>
            <div className="relative">
              <User
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: 'rgba(160,180,145,0.4)' }}
              />
              <Input
                id="name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
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
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 h-11 rounded-xl border-none text-sm"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  color: '#c0c8b8',
                }}
                required
                minLength={8}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="confirmPassword"
              className="text-xs font-medium uppercase tracking-wider"
              style={{ color: 'rgba(255,255,255,0.32)' }}
            >
              Confirm Password
            </Label>
            <div className="relative">
              <Lock
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: 'rgba(160,180,145,0.4)' }}
              />
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
                Creating account...
              </>
            ) : (
              'Create account'
            )}
          </Button>
        </form>
      </div>

      {/* Login Link */}
      <p className="text-sm" style={{ color: 'rgba(255,255,255,0.25)' }}>
        Already have an account?{' '}
        <Link
          href="/login"
          className="font-medium transition-colors hover:opacity-80"
          style={{ color: 'rgba(160,180,145,0.6)' }}
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
