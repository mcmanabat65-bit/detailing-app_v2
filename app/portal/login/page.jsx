'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Crown, Lock, Mail } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';

function LoginForm() {
  const { showToast, adminSession, accountType, hydrated, adminUsersHydrated, signOut } = useApp();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [creds, setCreds] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Signed in, role resolution finished, but the account is neither an admin
  // nor an approved member (e.g. membership still pending). Surface this rather
  // than silently sitting on the login screen with no redirect.
  const signedInNotApproved =
    adminSession && hydrated && adminUsersHydrated && accountType == null;

  // Once the session resolves to a member, send them into the portal. An admin
  // who lands here is bounced to the admin console instead.
  useEffect(() => {
    if (!adminSession) return;
    if (accountType === 'admin') {
      router.replace('/admin/dashboard');
      return;
    }
    if (accountType === 'member') {
      const next = searchParams.get('next') || '/portal';
      router.replace(next);
    }
  }, [adminSession, accountType, searchParams, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!supabase) {
      setError('Database not connected. Set Supabase env vars and reload.');
      setLoading(false);
      return;
    }

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: creds.email.trim(),
      password: creds.password,
    });

    setLoading(false);

    if (authError || !data.session) {
      // Surface the real reason — most often "Email not confirmed" or
      // "Invalid login credentials".
      const msg = authError?.message || '';
      if (/confirm/i.test(msg)) {
        setError('Your email isn’t confirmed yet. Check your inbox for the confirmation link, then sign in.');
      } else {
        setError(msg || 'Invalid credentials. Try again.');
      }
      return;
    }
    // Navigation happens in the useEffect above once accountType resolves.
    showToast('Welcome back.', 'success');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-20 bg-obsidian relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background:
            'radial-gradient(50% 50% at 50% 30%, rgba(201,168,76,0.25), transparent 60%)',
        }}
      />
      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex w-12 h-12 rounded-md bg-gradient-to-br from-gold to-gold-light items-center justify-center shadow-lg shadow-gold/30 mb-4">
            <Crown className="w-5 h-5 text-obsidian" strokeWidth={2.5} />
          </div>
          <div className="font-serif text-3xl text-cream">Member Portal</div>
          <div className="text-muted text-sm mt-1">Samahuzai Carwash and Auto Detailing</div>
        </div>

        {signedInNotApproved ? (
          <div className="glass-card rounded-md p-7 text-center space-y-4">
            <p className="text-cream font-medium">You&apos;re signed in.</p>
            <p className="text-muted text-sm leading-relaxed">
              Your membership isn&apos;t approved yet, so the portal is still
              locked. A manager reviews applications — usually within 24 hours.
              You&apos;ll be able to enter as soon as you&apos;re approved.
            </p>
            <button
              onClick={async () => { await signOut(); }}
              className="px-5 py-2.5 border border-white/10 text-cream/80 rounded-sm hover:border-gold/50 hover:text-gold transition-colors text-sm"
            >
              Sign out
            </button>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="glass-card rounded-md p-7 space-y-5">
          <div>
            <label className="block text-[11px] uppercase tracking-widest text-cream/70 mb-1.5">
              Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gold absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                autoFocus
                required
                value={creds.email}
                onChange={(e) => setCreds((c) => ({ ...c, email: e.target.value }))}
                className="w-full bg-surface/70 border border-white/10 rounded-sm py-2.5 pl-10 pr-3 text-cream"
                placeholder="you@email.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-widest text-cream/70 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gold absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="password"
                required
                value={creds.password}
                onChange={(e) => setCreds((c) => ({ ...c, password: e.target.value }))}
                className="w-full bg-surface/70 border border-white/10 rounded-sm py-2.5 pl-10 pr-3 text-cream"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="text-right -mt-2">
            <Link href="/portal/forgot-password" className="text-xs text-muted hover:text-gold transition-colors">
              Forgot password?
            </Link>
          </div>

          {error && (
            <div className="text-danger text-sm bg-danger/10 border border-danger/30 rounded-sm px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-5 py-3 bg-gold text-obsidian font-semibold rounded-sm hover:bg-gold-light transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>

          <p className="text-center text-sm text-muted">
            New here?{' '}
            <Link href="/portal/signup" className="text-gold hover:underline">
              Set up your member login
            </Link>
          </p>
        </form>
        )}
      </div>
    </div>
  );
}

export default function MemberLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
